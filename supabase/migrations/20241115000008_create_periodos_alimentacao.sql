-- ==========================================
-- CRIAR TABELA DE PERÍODOS DE ALIMENTAÇÃO
-- ==========================================

-- Tabela de períodos de alimentação do lote
CREATE TABLE IF NOT EXISTS periodos_alimentacao_lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  dia_inicial INTEGER NOT NULL CHECK (dia_inicial > 0),
  dia_final INTEGER NOT NULL CHECK (dia_final >= dia_inicial),
  dieta_id UUID NOT NULL REFERENCES dietas(id) ON DELETE RESTRICT,
  ingestao_ms_kg_pv DECIMAL(5,2) NOT NULL CHECK (ingestao_ms_kg_pv > 0),
  ordem INTEGER NOT NULL DEFAULT 0,
  
  -- Totais calculados (podem ser recalculados)
  total_kg_ms_boi DECIMAL(12,2),
  total_kg_mn_boi DECIMAL(12,2),
  total_kg_mn_lote DECIMAL(12,2),
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT unique_lote_ordem UNIQUE (lote_id, ordem),
  CONSTRAINT check_dias_validos CHECK (dia_final >= dia_inicial)
);

-- Índices
CREATE INDEX idx_periodos_alimentacao_lote_id ON periodos_alimentacao_lote(lote_id);
CREATE INDEX idx_periodos_alimentacao_dieta_id ON periodos_alimentacao_lote(dieta_id);
CREATE INDEX idx_periodos_alimentacao_ordem ON periodos_alimentacao_lote(lote_id, ordem);
CREATE INDEX idx_periodos_alimentacao_cliente_id ON periodos_alimentacao_lote(cliente_id);
CREATE INDEX idx_periodos_alimentacao_empresa_id ON periodos_alimentacao_lote(empresa_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_periodos_alimentacao_updated_at
  BEFORE UPDATE ON periodos_alimentacao_lote
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- RLS (Row Level Security)
-- ==========================================

ALTER TABLE periodos_alimentacao_lote ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver períodos dos seus lotes
CREATE POLICY "Usuários podem ver seus períodos de alimentação"
  ON periodos_alimentacao_lote
  FOR SELECT
  USING (
    cliente_id = auth.uid()
    OR
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem inserir períodos nos seus lotes
CREATE POLICY "Usuários podem inserir períodos de alimentação"
  ON periodos_alimentacao_lote
  FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid()
    AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
    AND
    lote_id IN (
      SELECT id FROM lotes WHERE cliente_id = auth.uid()
    )
  );

-- Policy: Usuários podem atualizar seus períodos
CREATE POLICY "Usuários podem atualizar seus períodos de alimentação"
  ON periodos_alimentacao_lote
  FOR UPDATE
  USING (
    cliente_id = auth.uid()
    OR
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    cliente_id = auth.uid()
    AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Policy: Usuários podem deletar seus períodos
CREATE POLICY "Usuários podem deletar seus períodos de alimentação"
  ON periodos_alimentacao_lote
  FOR DELETE
  USING (
    cliente_id = auth.uid()
    OR
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- ==========================================
-- FUNÇÃO PARA CALCULAR TOTAIS DO PERÍODO
-- ==========================================

CREATE OR REPLACE FUNCTION calcular_totais_periodo(p_periodo_id UUID)
RETURNS void AS $$
DECLARE
  v_periodo RECORD;
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
  -- Buscar dados do período
  SELECT * INTO v_periodo FROM periodos_alimentacao_lote WHERE id = p_periodo_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período não encontrado: %', p_periodo_id;
  END IF;
  
  -- Buscar dados do lote
  SELECT * INTO v_lote FROM lotes WHERE id = v_periodo.lote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote não encontrado: %', v_periodo.lote_id;
  END IF;
  
  -- Buscar dados da dieta
  SELECT id, nome, ms_media, custo_mn, custo_ms INTO v_dieta 
  FROM dietas 
  WHERE id = v_periodo.dieta_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieta não encontrada: %', v_periodo.dieta_id;
  END IF;
  
  -- Validar que a dieta tem MS média configurada
  IF v_dieta.ms_media IS NULL OR v_dieta.ms_media = 0 THEN
    RAISE EXCEPTION 'Dieta % não tem MS média configurada', v_dieta.nome;
  END IF;
  
  -- Calcular para cada dia do período
  FOR v_dia IN v_periodo.dia_inicial..v_periodo.dia_final LOOP
    -- Peso do dia = Peso inicial + (GMD × dias decorridos)
    v_peso_do_dia := v_lote.peso_medio_entrada + (v_lote.gmd_projetado * (v_dia - 1));
    
    -- kg MS/boi/dia = Peso × (Ingestão% ÷ 100)
    v_kg_ms_boi_dia := v_peso_do_dia * (v_periodo.ingestao_ms_kg_pv / 100);
    
    -- kg MN/boi/dia = kg MS/boi/dia ÷ (MS% dieta ÷ 100)
    v_kg_mn_boi_dia := v_kg_ms_boi_dia / (v_dieta.ms_media / 100);
    
    -- Acumular totais
    v_total_kg_ms_boi := v_total_kg_ms_boi + v_kg_ms_boi_dia;
    v_total_kg_mn_boi := v_total_kg_mn_boi + v_kg_mn_boi_dia;
  END LOOP;
  
  -- Total do lote = Total por boi × quantidade de animais
  v_total_kg_mn_lote := v_total_kg_mn_boi * v_lote.quantidade_animais;
  
  -- Atualizar período com os totais
  UPDATE periodos_alimentacao_lote
  SET 
    total_kg_ms_boi = v_total_kg_ms_boi,
    total_kg_mn_boi = v_total_kg_mn_boi,
    total_kg_mn_lote = v_total_kg_mn_lote,
    updated_at = NOW()
  WHERE id = p_periodo_id;
  
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGER PARA CALCULAR TOTAIS AUTOMATICAMENTE
-- ==========================================

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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_periodo_calcular_totais ON periodos_alimentacao_lote;

CREATE TRIGGER trigger_periodo_calcular_totais
  BEFORE INSERT OR UPDATE ON periodos_alimentacao_lote
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_totais_periodo();

-- Comentários
COMMENT ON TABLE periodos_alimentacao_lote IS 'Períodos de alimentação do lote com dietas e ingestão configuradas';
COMMENT ON COLUMN periodos_alimentacao_lote.dia_inicial IS 'Dia inicial do período (1 = primeiro dia do lote)';
COMMENT ON COLUMN periodos_alimentacao_lote.dia_final IS 'Dia final do período (inclusivo)';
COMMENT ON COLUMN periodos_alimentacao_lote.ingestao_ms_kg_pv IS 'Porcentagem de ingestão de MS em relação ao peso vivo (ex: 2.5 = 2.5%)';
COMMENT ON COLUMN periodos_alimentacao_lote.ordem IS 'Ordem sequencial do período';
COMMENT ON COLUMN periodos_alimentacao_lote.total_kg_ms_boi IS 'Total de kg de Matéria Seca consumido por boi no período';
COMMENT ON COLUMN periodos_alimentacao_lote.total_kg_mn_boi IS 'Total de kg de Matéria Natural consumido por boi no período';
COMMENT ON COLUMN periodos_alimentacao_lote.total_kg_mn_lote IS 'Total de kg de Matéria Natural consumido por todo o lote no período';
COMMENT ON FUNCTION calcular_totais_periodo IS 'Calcula os totais de consumo de um período de alimentação';
