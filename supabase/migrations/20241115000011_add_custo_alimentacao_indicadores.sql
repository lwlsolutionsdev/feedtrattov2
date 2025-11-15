-- ==========================================
-- ATUALIZAR FUNÇÃO DE CÁLCULO DE INDICADORES
-- PARA INCLUIR CUSTOS DE ALIMENTAÇÃO
-- ==========================================

CREATE OR REPLACE FUNCTION calcular_indicadores_projetados_lote(p_lote_id UUID)
RETURNS void AS $$
DECLARE
  v_lote RECORD;
  v_curral RECORD;
  
  -- Indicadores temporais
  v_dias_decorridos INT;
  v_dias_restantes INT;
  v_animais_por_m2 DECIMAL(10,4);
  
  -- Indicadores zootécnicos
  v_peso_saida DECIMAL(10,2);
  v_peso_carcaca DECIMAL(10,2);
  v_arrobas_carcaca DECIMAL(10,2);
  v_arrobas_produzidas_boi DECIMAL(10,2);
  v_arrobas_vivo_entrada DECIMAL(10,2);
  v_arrobas_vivo_saida DECIMAL(10,2);
  v_ganho_total DECIMAL(10,2);
  v_gmd_carcaca DECIMAL(10,2);
  
  -- Indicadores de alimentação
  v_consumo_ms_total_boi DECIMAL(12,2);
  v_consumo_ms_medio_dia DECIMAL(10,2);
  v_custo_alimentacao_total DECIMAL(12,2);
  v_ca_conversao DECIMAL(10,2);
  v_ea_eficiencia DECIMAL(10,4);
  v_eb_eficiencia_bio DECIMAL(10,2);
  v_ims_pv_medio DECIMAL(5,2);
  
  -- Indicadores econômicos
  v_custo_compra_total DECIMAL(12,2);
  v_custo_fixo_total DECIMAL(12,2);
  v_custo_protocolo_total DECIMAL(12,2);
  v_custo_total DECIMAL(12,2);
  v_receita_total DECIMAL(12,2);
  v_lucro_bruto DECIMAL(12,2);
  v_custo_por_arroba DECIMAL(10,2);
  v_lucro_por_cabeca DECIMAL(10,2);
  v_margem_percentual DECIMAL(5,2);
  
BEGIN
  -- Buscar dados do lote
  SELECT * INTO v_lote FROM lotes WHERE id = p_lote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote não encontrado: %', p_lote_id;
  END IF;
  
  -- Buscar dados do curral (se houver)
  IF v_lote.curral_id IS NOT NULL THEN
    SELECT * INTO v_curral FROM currais WHERE id = v_lote.curral_id;
  END IF;
  
  -- ==========================================
  -- CÁLCULOS TEMPORAIS
  -- ==========================================
  v_dias_decorridos := GREATEST(0, (CURRENT_DATE - v_lote.data_inicial::DATE));
  v_dias_restantes := GREATEST(0, v_lote.dias_planejados - v_dias_decorridos);
  
  -- Animais por m² (se tiver curral com área)
  IF v_curral.area_m2 IS NOT NULL AND v_curral.area_m2 > 0 THEN
    v_animais_por_m2 := v_lote.quantidade_animais::DECIMAL / v_curral.area_m2;
  ELSE
    v_animais_por_m2 := 0;
  END IF;
  
  -- ==========================================
  -- CÁLCULOS ZOOTÉCNICOS
  -- ==========================================
  
  v_peso_saida := COALESCE(v_lote.peso_medio_entrada, 0) + 
                  (COALESCE(v_lote.gmd_projetado, 0) * v_lote.dias_planejados);
  
  v_peso_carcaca := v_peso_saida * (COALESCE(v_lote.rendimento_carcaca_projetado, 54) / 100);
  v_arrobas_carcaca := v_peso_carcaca / 15;
  v_ganho_total := COALESCE(v_lote.gmd_projetado, 0) * v_lote.dias_planejados;
  v_arrobas_produzidas_boi := (v_ganho_total * (COALESCE(v_lote.rendimento_carcaca_projetado, 54) / 100)) / 15;
  v_arrobas_vivo_entrada := COALESCE(v_lote.peso_medio_entrada, 0) / 30;
  v_arrobas_vivo_saida := v_peso_saida / 30;
  v_gmd_carcaca := COALESCE(v_lote.gmd_projetado, 0) * (COALESCE(v_lote.rendimento_carcaca_projetado, 54) / 100);
  
  -- ==========================================
  -- CÁLCULOS DE ALIMENTAÇÃO (DOS PERÍODOS)
  -- ==========================================
  
  -- Somar totais de MS consumida por boi de todos os períodos
  SELECT 
    COALESCE(SUM(total_kg_ms_boi), 0),
    COALESCE(SUM(total_kg_mn_lote), 0)
  INTO 
    v_consumo_ms_total_boi,
    v_custo_alimentacao_total
  FROM periodos_alimentacao_lote p
  INNER JOIN dietas d ON d.id = p.dieta_id
  WHERE p.lote_id = p_lote_id;
  
  -- Calcular custo de alimentação baseado no consumo e custo das dietas
  SELECT 
    COALESCE(SUM(p.total_kg_mn_boi * d.custo_mn * v_lote.quantidade_animais), 0)
  INTO 
    v_custo_alimentacao_total
  FROM periodos_alimentacao_lote p
  INNER JOIN dietas d ON d.id = p.dieta_id
  WHERE p.lote_id = p_lote_id;
  
  -- Consumo médio de MS por dia
  IF v_lote.dias_planejados > 0 THEN
    v_consumo_ms_medio_dia := v_consumo_ms_total_boi / v_lote.dias_planejados;
  ELSE
    v_consumo_ms_medio_dia := 0;
  END IF;
  
  -- IMS %PV médio
  IF v_lote.peso_medio_entrada > 0 AND v_lote.dias_planejados > 0 THEN
    v_ims_pv_medio := (v_consumo_ms_medio_dia / 
                      ((v_lote.peso_medio_entrada + v_peso_saida) / 2)) * 100;
  ELSE
    v_ims_pv_medio := 0;
  END IF;
  
  -- Conversão Alimentar (CA) = kg MS consumida / kg ganho de peso
  IF v_ganho_total > 0 THEN
    v_ca_conversao := v_consumo_ms_total_boi / v_ganho_total;
  ELSE
    v_ca_conversao := 0;
  END IF;
  
  -- Eficiência Alimentar (EA) = kg ganho / kg MS consumida
  IF v_consumo_ms_total_boi > 0 THEN
    v_ea_eficiencia := v_ganho_total / v_consumo_ms_total_boi;
  ELSE
    v_ea_eficiencia := 0;
  END IF;
  
  -- Eficiência Biológica (EB) = (kg ganho × 100) / kg MS consumida
  IF v_consumo_ms_total_boi > 0 THEN
    v_eb_eficiencia_bio := (v_ganho_total * 100) / v_consumo_ms_total_boi;
  ELSE
    v_eb_eficiencia_bio := 0;
  END IF;
  
  -- ==========================================
  -- CÁLCULOS ECONÔMICOS
  -- ==========================================
  
  v_custo_compra_total := COALESCE(v_lote.valor_compra_kg_projetado, 0) * 
                          COALESCE(v_lote.peso_medio_entrada, 0) * 
                          v_lote.quantidade_animais;
  
  v_custo_fixo_total := COALESCE(v_lote.custo_fixo_cabeca_dia_projetado, 0) * 
                        v_lote.quantidade_animais * 
                        v_lote.dias_planejados;
  
  v_custo_protocolo_total := COALESCE(v_lote.custo_protocolo_sanitario_projetado, 0) * 
                             v_lote.quantidade_animais;
  
  -- Custo total AGORA INCLUI ALIMENTAÇÃO
  v_custo_total := v_custo_compra_total + v_custo_fixo_total + 
                   v_custo_protocolo_total + v_custo_alimentacao_total;
  
  v_receita_total := v_arrobas_carcaca * 
                     v_lote.quantidade_animais * 
                     COALESCE(v_lote.valor_venda_projetado, 0);
  
  v_lucro_bruto := v_receita_total - v_custo_total;
  
  -- Custo por arroba (custo de produção / arrobas produzidas)
  IF v_arrobas_produzidas_boi > 0 THEN
    v_custo_por_arroba := (v_custo_total - v_custo_compra_total) / 
                          (v_arrobas_produzidas_boi * v_lote.quantidade_animais);
  ELSE
    v_custo_por_arroba := 0;
  END IF;
  
  v_lucro_por_cabeca := v_lucro_bruto / v_lote.quantidade_animais;
  
  IF v_receita_total > 0 THEN
    v_margem_percentual := (v_lucro_bruto / v_receita_total) * 100;
  ELSE
    v_margem_percentual := 0;
  END IF;
  
  -- ==========================================
  -- INSERIR OU ATUALIZAR INDICADORES
  -- ==========================================
  INSERT INTO indicadores_projetados_lote (
    lote_id,
    dias_decorridos,
    dias_restantes,
    animais_por_m2,
    peso_saida_projetado,
    peso_carcaca_projetado,
    arrobas_carcaca_projetado,
    arrobas_produzidas_boi_projetado,
    arrobas_vivo_entrada,
    arrobas_vivo_saida,
    consumo_ms_total_boi_projetado,
    consumo_ms_medio_dia_projetado,
    ca_conversao_alimentar_projetado,
    ea_eficiencia_alimentar_projetado,
    eb_eficiencia_biologica_projetado,
    producao_arroba_mes_projetado,
    dias_por_arroba_projetado,
    ims_pv_medio_projetado,
    gmd_carcaca_projetado,
    custo_compra_total_projetado,
    custo_alimentacao_total_projetado,
    custo_fixo_total_projetado,
    custo_protocolo_total_projetado,
    custo_total_projetado,
    receita_total_projetada,
    lucro_bruto_projetado,
    custo_por_arroba_projetado,
    lucro_por_cabeca_projetado,
    margem_percentual_projetada
  ) VALUES (
    p_lote_id,
    v_dias_decorridos,
    v_dias_restantes,
    v_animais_por_m2,
    v_peso_saida,
    v_peso_carcaca,
    v_arrobas_carcaca,
    v_arrobas_produzidas_boi,
    v_arrobas_vivo_entrada,
    v_arrobas_vivo_saida,
    v_consumo_ms_total_boi,
    v_consumo_ms_medio_dia,
    v_ca_conversao,
    v_ea_eficiencia,
    v_eb_eficiencia_bio,
    CASE WHEN v_lote.dias_planejados > 0 THEN v_arrobas_produzidas_boi / (v_lote.dias_planejados::DECIMAL / 30) ELSE 0 END,
    CASE WHEN v_arrobas_produzidas_boi > 0 THEN v_lote.dias_planejados::DECIMAL / v_arrobas_produzidas_boi ELSE 0 END,
    v_ims_pv_medio,
    v_gmd_carcaca,
    v_custo_compra_total,
    v_custo_alimentacao_total,
    v_custo_fixo_total,
    v_custo_protocolo_total,
    v_custo_total,
    v_receita_total,
    v_lucro_bruto,
    v_custo_por_arroba,
    v_lucro_por_cabeca,
    v_margem_percentual
  )
  ON CONFLICT (lote_id) DO UPDATE SET
    dias_decorridos = EXCLUDED.dias_decorridos,
    dias_restantes = EXCLUDED.dias_restantes,
    animais_por_m2 = EXCLUDED.animais_por_m2,
    peso_saida_projetado = EXCLUDED.peso_saida_projetado,
    peso_carcaca_projetado = EXCLUDED.peso_carcaca_projetado,
    arrobas_carcaca_projetado = EXCLUDED.arrobas_carcaca_projetado,
    arrobas_produzidas_boi_projetado = EXCLUDED.arrobas_produzidas_boi_projetado,
    arrobas_vivo_entrada = EXCLUDED.arrobas_vivo_entrada,
    arrobas_vivo_saida = EXCLUDED.arrobas_vivo_saida,
    consumo_ms_total_boi_projetado = EXCLUDED.consumo_ms_total_boi_projetado,
    consumo_ms_medio_dia_projetado = EXCLUDED.consumo_ms_medio_dia_projetado,
    ca_conversao_alimentar_projetado = EXCLUDED.ca_conversao_alimentar_projetado,
    ea_eficiencia_alimentar_projetado = EXCLUDED.ea_eficiencia_alimentar_projetado,
    eb_eficiencia_biologica_projetado = EXCLUDED.eb_eficiencia_biologica_projetado,
    producao_arroba_mes_projetado = EXCLUDED.producao_arroba_mes_projetado,
    dias_por_arroba_projetado = EXCLUDED.dias_por_arroba_projetado,
    ims_pv_medio_projetado = EXCLUDED.ims_pv_medio_projetado,
    gmd_carcaca_projetado = EXCLUDED.gmd_carcaca_projetado,
    custo_compra_total_projetado = EXCLUDED.custo_compra_total_projetado,
    custo_alimentacao_total_projetado = EXCLUDED.custo_alimentacao_total_projetado,
    custo_fixo_total_projetado = EXCLUDED.custo_fixo_total_projetado,
    custo_protocolo_total_projetado = EXCLUDED.custo_protocolo_total_projetado,
    custo_total_projetado = EXCLUDED.custo_total_projetado,
    receita_total_projetada = EXCLUDED.receita_total_projetada,
    lucro_bruto_projetado = EXCLUDED.lucro_bruto_projetado,
    custo_por_arroba_projetado = EXCLUDED.custo_por_arroba_projetado,
    lucro_por_cabeca_projetado = EXCLUDED.lucro_por_cabeca_projetado,
    margem_percentual_projetada = EXCLUDED.margem_percentual_projetada,
    updated_at = NOW();
    
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGER PARA RECALCULAR QUANDO PERÍODOS MUDAM
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_recalcular_indicadores_apos_periodo()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular indicadores do lote após inserir/atualizar/deletar período
  PERFORM calcular_indicadores_projetados_lote(COALESCE(NEW.lote_id, OLD.lote_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_periodo_recalcular_indicadores ON periodos_alimentacao_lote;

CREATE TRIGGER trigger_periodo_recalcular_indicadores
  AFTER INSERT OR UPDATE OR DELETE ON periodos_alimentacao_lote
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_indicadores_apos_periodo();

COMMENT ON FUNCTION trigger_recalcular_indicadores_apos_periodo IS 'Recalcula indicadores do lote quando períodos de alimentação são alterados';
