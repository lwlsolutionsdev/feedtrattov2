-- ==========================================
-- ADICIONAR CAMPOS DE COMPRA E CRIAR TABELA DE INDICADORES PROJETADOS
-- ==========================================

-- 1. Adicionar campo de valor de compra na tabela lotes
ALTER TABLE lotes ADD COLUMN valor_compra_kg_projetado DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN lotes.valor_compra_kg_projetado IS 'Valor de compra projetado por kg (R$/kg). Tipo de compra sempre por KG.';

-- 2. Criar tabela de indicadores projetados do lote
CREATE TABLE indicadores_projetados_lote (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Referência ao lote
  lote_id UUID NOT NULL UNIQUE REFERENCES lotes(id) ON DELETE CASCADE,
  
  -- INDICADORES TEMPORAIS (calculados dinamicamente, mas salvos para histórico)
  dias_decorridos INT DEFAULT 0,
  dias_restantes INT DEFAULT 0,
  animais_por_m2 DECIMAL(10,4),
  
  -- INDICADORES ZOOTÉCNICOS
  peso_saida_projetado DECIMAL(10,2),
  peso_carcaca_projetado DECIMAL(10,2),
  arrobas_carcaca_projetado DECIMAL(10,2),
  arrobas_produzidas_boi_projetado DECIMAL(10,2),
  arrobas_vivo_entrada DECIMAL(10,2),
  arrobas_vivo_saida DECIMAL(10,2),
  
  consumo_ms_total_boi_projetado DECIMAL(10,2),
  consumo_ms_medio_dia_projetado DECIMAL(10,2),
  ca_conversao_alimentar_projetado DECIMAL(10,4),
  ea_eficiencia_alimentar_projetado DECIMAL(10,4),
  eb_eficiencia_biologica_projetado DECIMAL(10,2),
  
  producao_arroba_mes_projetado DECIMAL(10,2),
  dias_por_arroba_projetado DECIMAL(10,2),
  ims_pv_medio_projetado DECIMAL(5,2),
  gmd_carcaca_projetado DECIMAL(10,2),
  
  -- INDICADORES ECONÔMICOS
  custo_compra_total_projetado DECIMAL(12,2),
  custo_alimentacao_total_projetado DECIMAL(12,2),
  custo_fixo_total_projetado DECIMAL(12,2),
  custo_protocolo_total_projetado DECIMAL(12,2),
  custo_total_projetado DECIMAL(12,2),
  
  receita_total_projetada DECIMAL(12,2),
  lucro_bruto_projetado DECIMAL(12,2),
  custo_por_arroba_projetado DECIMAL(10,2),
  lucro_por_cabeca_projetado DECIMAL(10,2),
  margem_percentual_projetada DECIMAL(5,2),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_indicadores_lote ON indicadores_projetados_lote(lote_id);

-- RLS (Row Level Security)
ALTER TABLE indicadores_projetados_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver indicadores de lotes de sua empresa"
  ON indicadores_projetados_lote FOR SELECT
  USING (
    lote_id IN (
      SELECT id FROM lotes WHERE empresa_id IN (
        SELECT empresa_id FROM clientes WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem inserir indicadores"
  ON indicadores_projetados_lote FOR INSERT
  WITH CHECK (
    lote_id IN (
      SELECT id FROM lotes WHERE cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar indicadores de sua empresa"
  ON indicadores_projetados_lote FOR UPDATE
  USING (
    lote_id IN (
      SELECT id FROM lotes WHERE empresa_id IN (
        SELECT empresa_id FROM clientes WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem deletar indicadores de sua empresa"
  ON indicadores_projetados_lote FOR DELETE
  USING (
    lote_id IN (
      SELECT id FROM lotes WHERE empresa_id IN (
        SELECT empresa_id FROM clientes WHERE id = auth.uid()
      )
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_indicadores_projetados_updated_at
  BEFORE UPDATE ON indicadores_projetados_lote
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE indicadores_projetados_lote IS 'Indicadores projetados calculados e salvos para cada lote. Evita recalcular toda vez que acessar detalhes.';
COMMENT ON COLUMN indicadores_projetados_lote.peso_saida_projetado IS 'Peso médio de saída projetado (kg)';
COMMENT ON COLUMN indicadores_projetados_lote.ca_conversao_alimentar_projetado IS 'Conversão Alimentar: kg MS consumido / kg ganho';
COMMENT ON COLUMN indicadores_projetados_lote.ea_eficiencia_alimentar_projetado IS 'Eficiência Alimentar: kg ganho / kg MS consumido';
COMMENT ON COLUMN indicadores_projetados_lote.eb_eficiencia_biologica_projetado IS 'Eficiência Biológica: kg MS / @ produzida';
COMMENT ON COLUMN indicadores_projetados_lote.margem_percentual_projetada IS 'Margem de lucro em percentual (%)';
