-- ==========================================
-- TABELA DE ANIMAIS NÃO PROCESSADOS
-- ==========================================

CREATE TABLE IF NOT EXISTS animais_nao_processados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  peso_medio DECIMAL(10,2) NOT NULL CHECK (peso_medio > 0),
  origem VARCHAR(255), -- Fornecedor/Origem
  observacoes TEXT,
  curral_id UUID NOT NULL REFERENCES currais(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_animais_nao_processados_curral ON animais_nao_processados(curral_id);
CREATE INDEX idx_animais_nao_processados_cliente ON animais_nao_processados(cliente_id);
CREATE INDEX idx_animais_nao_processados_empresa ON animais_nao_processados(empresa_id);
CREATE INDEX idx_animais_nao_processados_ativo ON animais_nao_processados(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_animais_nao_processados_updated_at
  BEFORE UPDATE ON animais_nao_processados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE animais_nao_processados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver animais não processados da sua empresa"
  ON animais_nao_processados FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir animais não processados"
  ON animais_nao_processados FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar animais não processados da sua empresa"
  ON animais_nao_processados FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar animais não processados da sua empresa"
  ON animais_nao_processados FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- ==========================================
-- TABELA DE MOVIMENTAÇÕES (ENTRADAS E SAÍDAS)
-- ==========================================

CREATE TYPE tipo_movimentacao AS ENUM ('ENTRADA', 'SAIDA');

CREATE TABLE IF NOT EXISTS movimentacoes_animais_nao_processados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_nao_processado_id UUID NOT NULL REFERENCES animais_nao_processados(id) ON DELETE CASCADE,
  tipo tipo_movimentacao NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  peso_medio DECIMAL(10,2) CHECK (peso_medio > 0),
  origem VARCHAR(255), -- Para entradas: fornecedor. Para saídas: destino
  observacoes TEXT,
  data_movimentacao TIMESTAMPTZ DEFAULT NOW(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_movimentacoes_animal ON movimentacoes_animais_nao_processados(animal_nao_processado_id);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes_animais_nao_processados(tipo);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_animais_nao_processados(data_movimentacao);
CREATE INDEX idx_movimentacoes_cliente ON movimentacoes_animais_nao_processados(cliente_id);
CREATE INDEX idx_movimentacoes_empresa ON movimentacoes_animais_nao_processados(empresa_id);

-- RLS
ALTER TABLE movimentacoes_animais_nao_processados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver movimentações da sua empresa"
  ON movimentacoes_animais_nao_processados FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir movimentações"
  ON movimentacoes_animais_nao_processados FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar movimentações da sua empresa"
  ON movimentacoes_animais_nao_processados FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar movimentações da sua empresa"
  ON movimentacoes_animais_nao_processados FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- ==========================================
-- TRIGGER PARA ATUALIZAR QUANTIDADE APÓS MOVIMENTAÇÃO
-- ==========================================

CREATE OR REPLACE FUNCTION atualizar_quantidade_animais_nao_processados()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'ENTRADA' THEN
      -- Adiciona quantidade na entrada
      UPDATE animais_nao_processados
      SET quantidade = quantidade + NEW.quantidade
      WHERE id = NEW.animal_nao_processado_id;
    ELSIF NEW.tipo = 'SAIDA' THEN
      -- Subtrai quantidade na saída
      UPDATE animais_nao_processados
      SET quantidade = quantidade - NEW.quantidade
      WHERE id = NEW.animal_nao_processado_id;
      
      -- Verifica se a quantidade ficou negativa
      IF (SELECT quantidade FROM animais_nao_processados WHERE id = NEW.animal_nao_processado_id) < 0 THEN
        RAISE EXCEPTION 'Quantidade insuficiente de animais para saída';
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverte a movimentação ao deletar
    IF OLD.tipo = 'ENTRADA' THEN
      UPDATE animais_nao_processados
      SET quantidade = quantidade - OLD.quantidade
      WHERE id = OLD.animal_nao_processado_id;
    ELSIF OLD.tipo = 'SAIDA' THEN
      UPDATE animais_nao_processados
      SET quantidade = quantidade + OLD.quantidade
      WHERE id = OLD.animal_nao_processado_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_quantidade_animais
  AFTER INSERT OR DELETE ON movimentacoes_animais_nao_processados
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_quantidade_animais_nao_processados();

-- Comentários
COMMENT ON TABLE animais_nao_processados IS 'Animais que ainda não foram processados/alocados em lotes de confinamento';
COMMENT ON TABLE movimentacoes_animais_nao_processados IS 'Histórico de entradas e saídas de animais não processados';
COMMENT ON COLUMN animais_nao_processados.quantidade IS 'Quantidade atual de animais (atualizada automaticamente pelas movimentações)';
COMMENT ON COLUMN animais_nao_processados.peso_medio IS 'Peso médio inicial dos animais em kg';
COMMENT ON COLUMN animais_nao_processados.origem IS 'Fornecedor ou origem dos animais';
COMMENT ON COLUMN animais_nao_processados.curral_id IS 'Curral provisório onde os animais estão alocados';
COMMENT ON COLUMN movimentacoes_animais_nao_processados.tipo IS 'Tipo de movimentação: ENTRADA ou SAIDA';
COMMENT ON COLUMN movimentacoes_animais_nao_processados.origem IS 'Para ENTRADA: fornecedor. Para SAIDA: destino';
