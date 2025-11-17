-- ==========================================
-- RENOMEAR COLUNA capacidade PARA capacidade_kg
-- E ADICIONAR DESCRICAO
-- ==========================================

-- Renomear coluna (se ainda existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vagoes' AND column_name = 'capacidade'
  ) THEN
    ALTER TABLE vagoes RENAME COLUMN capacidade TO capacidade_kg;
  END IF;
END $$;

-- Adicionar coluna descricao
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vagoes' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE vagoes ADD COLUMN descricao TEXT;
  END IF;
END $$;

-- Adicionar empresa_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vagoes' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE vagoes ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_vagoes_empresa ON vagoes(empresa_id);
  END IF;
END $$;

-- Atualizar políticas RLS para usar empresa_id
DROP POLICY IF EXISTS "Usuários podem ver seus vagões" ON vagoes;
DROP POLICY IF EXISTS "Usuários podem criar seus vagões" ON vagoes;
DROP POLICY IF EXISTS "Usuários podem atualizar seus vagões" ON vagoes;
DROP POLICY IF EXISTS "Usuários podem deletar seus vagões" ON vagoes;

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
COMMENT ON COLUMN vagoes.capacidade_kg IS 'Capacidade máxima do vagão em quilogramas';
COMMENT ON COLUMN vagoes.empresa_id IS 'Empresa proprietária do vagão';
