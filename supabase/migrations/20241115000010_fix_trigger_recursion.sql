-- ==========================================
-- CORRIGIR RECURSÃO NO TRIGGER DE PERÍODOS
-- ==========================================

-- Dropar trigger e função antigos
DROP TRIGGER IF EXISTS trigger_periodo_calcular_totais ON periodos_alimentacao_lote;
DROP FUNCTION IF EXISTS trigger_calcular_totais_periodo();

-- Recriar função sem recursão (inline calculation)
CREATE OR REPLACE FUNCTION trigger_calcular_totais_periodo()
RETURNS TRIGGER AS $$
DECLARE
  v_lote RECORD;
  v_dieta RECORD;
  v_total_kg_ms_boi DECIMAL(12,2) := 0;
  v_total_kg_mn_boi DECIMAL(12,2) := 0;
  v_total_kg_mn_lote DECIMAL(12,2) := 0;
  v_dia INTEGER;
  v_peso_do_dia DECIMAL(10,2);
  v_kg_ms_boi_dia DECIMAL(10,2);
  v_kg_mn_boi_dia DECIMAL(10,2);
BEGIN
  -- Buscar dados do lote
  SELECT * INTO v_lote FROM lotes WHERE id = NEW.lote_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Buscar dados da dieta
  SELECT id, nome, ms_media, custo_mn, custo_ms INTO v_dieta 
  FROM dietas 
  WHERE id = NEW.dieta_id;
  
  IF NOT FOUND OR v_dieta.ms_media IS NULL OR v_dieta.ms_media = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Calcular para cada dia do período
  FOR v_dia IN NEW.dia_inicial..NEW.dia_final LOOP
    v_peso_do_dia := v_lote.peso_medio_entrada + (v_lote.gmd_projetado * (v_dia - 1));
    v_kg_ms_boi_dia := v_peso_do_dia * (NEW.ingestao_ms_kg_pv / 100);
    v_kg_mn_boi_dia := v_kg_ms_boi_dia / (v_dieta.ms_media / 100);
    
    v_total_kg_ms_boi := v_total_kg_ms_boi + v_kg_ms_boi_dia;
    v_total_kg_mn_boi := v_total_kg_mn_boi + v_kg_mn_boi_dia;
  END LOOP;
  
  v_total_kg_mn_lote := v_total_kg_mn_boi * v_lote.quantidade_animais;
  
  -- Atualizar NEW com os totais calculados (BEFORE trigger)
  NEW.total_kg_ms_boi := v_total_kg_ms_boi;
  NEW.total_kg_mn_boi := v_total_kg_mn_boi;
  NEW.total_kg_mn_lote := v_total_kg_mn_lote;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger BEFORE (não causa recursão)
CREATE TRIGGER trigger_periodo_calcular_totais
  BEFORE INSERT OR UPDATE ON periodos_alimentacao_lote
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_totais_periodo();

COMMENT ON FUNCTION trigger_calcular_totais_periodo IS 'Calcula totais de consumo inline no BEFORE trigger (sem recursão)';
