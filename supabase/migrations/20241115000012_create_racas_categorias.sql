-- ==========================================
-- TABELA DE RAÇAS
-- ==========================================

CREATE TABLE IF NOT EXISTS racas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_racas_cliente ON racas(cliente_id);
CREATE INDEX idx_racas_empresa ON racas(empresa_id);
CREATE INDEX idx_racas_ativo ON racas(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_racas_updated_at
  BEFORE UPDATE ON racas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE racas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver raças da sua empresa"
  ON racas FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir raças"
  ON racas FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar raças da sua empresa"
  ON racas FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar raças da sua empresa"
  ON racas FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- ==========================================
-- TABELA DE CATEGORIAS
-- ==========================================

CREATE TYPE sexo_animal AS ENUM ('MACHO', 'FEMEA');

CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  sexo sexo_animal NOT NULL,
  ativo BOOLEAN DEFAULT true,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_categorias_cliente ON categorias(cliente_id);
CREATE INDEX idx_categorias_empresa ON categorias(empresa_id);
CREATE INDEX idx_categorias_ativo ON categorias(ativo);
CREATE INDEX idx_categorias_sexo ON categorias(sexo);

-- Trigger para updated_at
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver categorias da sua empresa"
  ON categorias FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir categorias"
  ON categorias FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar categorias da sua empresa"
  ON categorias FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar categorias da sua empresa"
  ON categorias FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE racas IS 'Raças de animais para classificação do rebanho';
COMMENT ON TABLE categorias IS 'Categorias de animais por sexo e idade';
COMMENT ON COLUMN categorias.sexo IS 'Sexo da categoria: MACHO ou FEMEA';
