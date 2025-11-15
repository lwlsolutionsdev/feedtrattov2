-- ==========================================
-- RECRIAR FUNÇÃO E TRIGGER DE CÁLCULO DE INDICADORES
-- ==========================================

-- Dropar trigger e função existentes
DROP TRIGGER IF EXISTS trigger_lote_calcular_indicadores ON lotes;
DROP FUNCTION IF EXISTS trigger_calcular_indicadores_lote();
DROP FUNCTION IF EXISTS calcular_indicadores_projetados_lote(UUID);

-- Recriar função corrigida
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
  
  -- Peso de saída projetado
  v_peso_saida := COALESCE(v_lote.peso_medio_entrada, 0) + 
                  (COALESCE(v_lote.gmd_projetado, 0) * v_lote.dias_planejados);
  
  -- Peso de carcaça
  v_peso_carcaca := v_peso_saida * (COALESCE(v_lote.rendimento_carcaca_projetado, 54) / 100);
  
  -- Arrobas de carcaça
  v_arrobas_carcaca := v_peso_carcaca / 15;
  
  -- Ganho total de peso
  v_ganho_total := COALESCE(v_lote.gmd_projetado, 0) * v_lote.dias_planejados;
  
  -- Arrobas produzidas por boi (só o ganho)
  v_arrobas_produzidas_boi := (v_ganho_total * (COALESCE(v_lote.rendimento_carcaca_projetado, 54) / 100)) / 15;
  
  -- Arrobas vivo
  v_arrobas_vivo_entrada := COALESCE(v_lote.peso_medio_entrada, 0) / 30;
  v_arrobas_vivo_saida := v_peso_saida / 30;
  
  -- GMD Carcaça
  v_gmd_carcaca := COALESCE(v_lote.gmd_projetado, 0) * (COALESCE(v_lote.rendimento_carcaca_projetado, 54) / 100);
  
  -- ==========================================
  -- CÁLCULOS ECONÔMICOS
  -- ==========================================
  
  -- Custo de compra total (sempre por KG)
  v_custo_compra_total := COALESCE(v_lote.valor_compra_kg_projetado, 0) * 
                          COALESCE(v_lote.peso_medio_entrada, 0) * 
                          v_lote.quantidade_animais;
  
  -- Custo fixo total
  v_custo_fixo_total := COALESCE(v_lote.custo_fixo_cabeca_dia_projetado, 0) * 
                        v_lote.quantidade_animais * 
                        v_lote.dias_planejados;
  
  -- Custo protocolo total
  v_custo_protocolo_total := COALESCE(v_lote.custo_protocolo_sanitario_projetado, 0) * 
                             v_lote.quantidade_animais;
  
  -- Custo total (sem alimentação por enquanto, será adicionado quando tiver períodos)
  v_custo_total := v_custo_compra_total + v_custo_fixo_total + v_custo_protocolo_total;
  
  -- Receita total
  v_receita_total := v_arrobas_carcaca * 
                     v_lote.quantidade_animais * 
                     COALESCE(v_lote.valor_venda_projetado, 0);
  
  -- Lucro bruto
  v_lucro_bruto := v_receita_total - v_custo_total;
  
  -- Custo por arroba (custo de produção / arrobas produzidas)
  IF v_arrobas_produzidas_boi > 0 THEN
    v_custo_por_arroba := (v_custo_total - v_custo_compra_total) / 
                          (v_arrobas_produzidas_boi * v_lote.quantidade_animais);
  ELSE
    v_custo_por_arroba := 0;
  END IF;
  
  -- Lucro por cabeça
  v_lucro_por_cabeca := v_lucro_bruto / v_lote.quantidade_animais;
  
  -- Margem percentual
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
    0, -- consumo_ms_total_boi (será calculado com períodos)
    0, -- consumo_ms_medio_dia (será calculado com períodos)
    0, -- ca (será calculado com períodos)
    0, -- ea (será calculado com períodos)
    0, -- eb (será calculado com períodos)
    CASE WHEN v_lote.dias_planejados > 0 THEN v_arrobas_produzidas_boi / (v_lote.dias_planejados::DECIMAL / 30) ELSE 0 END,
    CASE WHEN v_arrobas_produzidas_boi > 0 THEN v_lote.dias_planejados::DECIMAL / v_arrobas_produzidas_boi ELSE 0 END,
    0, -- ims_pv_medio (será calculado com períodos)
    v_gmd_carcaca,
    v_custo_compra_total,
    0, -- custo_alimentacao (será calculado com períodos)
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
    producao_arroba_mes_projetado = EXCLUDED.producao_arroba_mes_projetado,
    dias_por_arroba_projetado = EXCLUDED.dias_por_arroba_projetado,
    gmd_carcaca_projetado = EXCLUDED.gmd_carcaca_projetado,
    custo_compra_total_projetado = EXCLUDED.custo_compra_total_projetado,
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

-- Recriar trigger
CREATE OR REPLACE FUNCTION trigger_calcular_indicadores_lote()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular indicadores após inserir ou atualizar lote
  PERFORM calcular_indicadores_projetados_lote(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lote_calcular_indicadores
  AFTER INSERT OR UPDATE ON lotes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_indicadores_lote();

-- Comentários
COMMENT ON FUNCTION calcular_indicadores_projetados_lote IS 'Calcula todos os indicadores projetados do lote e salva na tabela indicadores_projetados_lote';
