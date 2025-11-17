-- ==========================================
-- CRIAR TABELA DE VAGÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS vagoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  
  -- Capacidade
  capacidade_kg DECIMAL(10,2) NOT NULL CHECK (capacidade_kg > 0),
  
  -- Status
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vagoes_cliente ON vagoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vagoes_empresa ON vagoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vagoes_ativo ON vagoes(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_vagoes_updated_at
  BEFORE UPDATE ON vagoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- RLS (Row Level Security)
-- ==========================================

ALTER TABLE vagoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver vagões de sua empresa"
  ON vagoes FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar vagões"
  ON vagoes FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar vagões de sua empresa"
  ON vagoes FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar vagões de sua empresa"
  ON vagoes FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE vagoes IS 'Vagões forrageiros para distribuição de trato';
COMMENT ON COLUMN vagoes.capacidade_kg IS 'Capacidade máxima do vagão em quilogramas';
COMMENT ON COLUMN vagoes.ativo IS 'Indica se o vagão está ativo e disponível para uso';
