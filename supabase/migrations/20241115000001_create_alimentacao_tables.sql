-- ==================== MÓDULO DE ALIMENTAÇÃO ====================
-- Criação das tabelas para o módulo de alimentação

-- ==================== LIMPEZA (caso já existam) ====================
-- Remover tabelas na ordem correta de dependências
DROP TABLE IF EXISTS saidas_estoque CASCADE;
DROP TABLE IF EXISTS batidas CASCADE;
DROP TABLE IF EXISTS vagoes CASCADE;
DROP TABLE IF EXISTS ingredientes_dieta CASCADE;
DROP TABLE IF EXISTS dietas CASCADE;
DROP TABLE IF EXISTS ingredientes_pre_mistura CASCADE;
DROP TABLE IF EXISTS pre_misturas CASCADE;
DROP TABLE IF EXISTS entradas_estoque CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;
DROP TABLE IF EXISTS unidades_medida CASCADE;

DROP SEQUENCE IF EXISTS batidas_seq CASCADE;
DROP FUNCTION IF EXISTS gerar_codigo_batida() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ==================== UNIDADES DE MEDIDA ====================
CREATE TABLE IF NOT EXISTS unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  sigla VARCHAR(10) NOT NULL,
  fator_conversao DECIMAL(18, 8) NOT NULL DEFAULT 1.0, -- Fator de conversão para KG
  ativo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unidades_medida_nome_unique UNIQUE (cliente_id, nome),
  CONSTRAINT unidades_medida_sigla_unique UNIQUE (cliente_id, sigla)
);

-- Índices para unidades_medida
CREATE INDEX idx_unidades_medida_cliente ON unidades_medida(cliente_id);
CREATE INDEX idx_unidades_medida_ativo ON unidades_medida(ativo);

-- RLS para unidades_medida
ALTER TABLE unidades_medida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas unidades de medida"
  ON unidades_medida FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar suas unidades de medida"
  ON unidades_medida FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar suas unidades de medida"
  ON unidades_medida FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar suas unidades de medida"
  ON unidades_medida FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== INSUMOS ====================
CREATE TABLE IF NOT EXISTS insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  unidade_base_id UUID NOT NULL REFERENCES unidades_medida(id) ON DELETE RESTRICT,
  estoque_minimo DECIMAL(18, 8) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT insumos_nome_unique UNIQUE (cliente_id, nome)
);

-- Índices para insumos
CREATE INDEX idx_insumos_cliente ON insumos(cliente_id);
CREATE INDEX idx_insumos_ativo ON insumos(ativo);
CREATE INDEX idx_insumos_nome ON insumos(nome);

-- RLS para insumos
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus insumos"
  ON insumos FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar seus insumos"
  ON insumos FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar seus insumos"
  ON insumos FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar seus insumos"
  ON insumos FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== ENTRADAS DE ESTOQUE ====================
CREATE TABLE IF NOT EXISTS entradas_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  data_entrada DATE NOT NULL,
  unidade_entrada_id UUID NOT NULL REFERENCES unidades_medida(id) ON DELETE RESTRICT,
  quantidade DECIMAL(18, 8) NOT NULL,
  quantidade_kg DECIMAL(18, 8) NOT NULL, -- Calculado: quantidade * fator_conversao
  valor_unitario DECIMAL(18, 8) NOT NULL,
  valor_total DECIMAL(18, 8) NOT NULL, -- Calculado: quantidade * valor_unitario
  observacoes TEXT,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para entradas_estoque
CREATE INDEX idx_entradas_estoque_cliente ON entradas_estoque(cliente_id);
CREATE INDEX idx_entradas_estoque_insumo ON entradas_estoque(insumo_id);
CREATE INDEX idx_entradas_estoque_data ON entradas_estoque(data_entrada DESC);

-- RLS para entradas_estoque
ALTER TABLE entradas_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas entradas de estoque"
  ON entradas_estoque FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar suas entradas de estoque"
  ON entradas_estoque FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar suas entradas de estoque"
  ON entradas_estoque FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar suas entradas de estoque"
  ON entradas_estoque FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== PRÉ-MISTURAS ====================
CREATE TABLE IF NOT EXISTS pre_misturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT pre_misturas_nome_unique UNIQUE (cliente_id, nome)
);

-- Índices para pre_misturas
CREATE INDEX idx_pre_misturas_cliente ON pre_misturas(cliente_id);
CREATE INDEX idx_pre_misturas_ativo ON pre_misturas(ativo);

-- RLS para pre_misturas
ALTER TABLE pre_misturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas pré-misturas"
  ON pre_misturas FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar suas pré-misturas"
  ON pre_misturas FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar suas pré-misturas"
  ON pre_misturas FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar suas pré-misturas"
  ON pre_misturas FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== INGREDIENTES DE PRÉ-MISTURAS ====================
CREATE TABLE IF NOT EXISTS ingredientes_pre_mistura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_mistura_id UUID NOT NULL REFERENCES pre_misturas(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  percentual_mistura DECIMAL(5, 2) NOT NULL, -- 0.00 a 100.00
  percentual_ms DECIMAL(5, 2) NOT NULL, -- % de matéria seca
  valor_unitario_kg DECIMAL(18, 8) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT ingredientes_pre_mistura_unique UNIQUE (pre_mistura_id, insumo_id)
);

-- Índices para ingredientes_pre_mistura
CREATE INDEX idx_ingredientes_pre_mistura_pre_mistura ON ingredientes_pre_mistura(pre_mistura_id);
CREATE INDEX idx_ingredientes_pre_mistura_insumo ON ingredientes_pre_mistura(insumo_id);

-- RLS para ingredientes_pre_mistura
ALTER TABLE ingredientes_pre_mistura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver ingredientes de suas pré-misturas"
  ON ingredientes_pre_mistura FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pre_misturas
      WHERE pre_misturas.id = ingredientes_pre_mistura.pre_mistura_id
      AND pre_misturas.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar ingredientes de suas pré-misturas"
  ON ingredientes_pre_mistura FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pre_misturas
      WHERE pre_misturas.id = ingredientes_pre_mistura.pre_mistura_id
      AND pre_misturas.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar ingredientes de suas pré-misturas"
  ON ingredientes_pre_mistura FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pre_misturas
      WHERE pre_misturas.id = ingredientes_pre_mistura.pre_mistura_id
      AND pre_misturas.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar ingredientes de suas pré-misturas"
  ON ingredientes_pre_mistura FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pre_misturas
      WHERE pre_misturas.id = ingredientes_pre_mistura.pre_mistura_id
      AND pre_misturas.cliente_id = auth.uid()
    )
  );

-- ==================== DIETAS ====================
CREATE TABLE IF NOT EXISTS dietas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT dietas_nome_unique UNIQUE (cliente_id, nome)
);

-- Índices para dietas
CREATE INDEX idx_dietas_cliente ON dietas(cliente_id);
CREATE INDEX idx_dietas_ativo ON dietas(ativo);

-- RLS para dietas
ALTER TABLE dietas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas dietas"
  ON dietas FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar suas dietas"
  ON dietas FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar suas dietas"
  ON dietas FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar suas dietas"
  ON dietas FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== INGREDIENTES DE DIETAS ====================
CREATE TABLE IF NOT EXISTS ingredientes_dieta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dieta_id UUID NOT NULL REFERENCES dietas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('insumo', 'pre_mistura')),
  insumo_id UUID REFERENCES insumos(id) ON DELETE CASCADE,
  pre_mistura_id UUID REFERENCES pre_misturas(id) ON DELETE CASCADE,
  percentual_mistura DECIMAL(5, 2) NOT NULL, -- 0.00 a 100.00
  percentual_ms DECIMAL(5, 2) NOT NULL, -- % de matéria seca
  valor_unitario_kg DECIMAL(18, 8) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ingredientes_dieta
CREATE INDEX idx_ingredientes_dieta_dieta ON ingredientes_dieta(dieta_id);
CREATE INDEX idx_ingredientes_dieta_insumo ON ingredientes_dieta(insumo_id);
CREATE INDEX idx_ingredientes_dieta_pre_mistura ON ingredientes_dieta(pre_mistura_id);

-- RLS para ingredientes_dieta
ALTER TABLE ingredientes_dieta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver ingredientes de suas dietas"
  ON ingredientes_dieta FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dietas
      WHERE dietas.id = ingredientes_dieta.dieta_id
      AND dietas.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar ingredientes de suas dietas"
  ON ingredientes_dieta FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dietas
      WHERE dietas.id = ingredientes_dieta.dieta_id
      AND dietas.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar ingredientes de suas dietas"
  ON ingredientes_dieta FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dietas
      WHERE dietas.id = ingredientes_dieta.dieta_id
      AND dietas.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar ingredientes de suas dietas"
  ON ingredientes_dieta FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM dietas
      WHERE dietas.id = ingredientes_dieta.dieta_id
      AND dietas.cliente_id = auth.uid()
    )
  );

-- Adicionar constraint de validação de tipo (condicional)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ingredientes_dieta_tipo_check'
    ) THEN
        ALTER TABLE ingredientes_dieta 
        ADD CONSTRAINT ingredientes_dieta_tipo_check CHECK (
            (tipo = 'insumo' AND insumo_id IS NOT NULL AND pre_mistura_id IS NULL) OR
            (tipo = 'pre_mistura' AND pre_mistura_id IS NOT NULL AND insumo_id IS NULL)
        );
    END IF;
END $$;

-- ==================== VAGÕES ====================
CREATE TABLE IF NOT EXISTS vagoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  capacidade DECIMAL(18, 8) NOT NULL, -- Capacidade em KG
  ativo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT vagoes_nome_unique UNIQUE (cliente_id, nome)
);

-- Índices para vagoes
CREATE INDEX idx_vagoes_cliente ON vagoes(cliente_id);
CREATE INDEX idx_vagoes_ativo ON vagoes(ativo);

-- RLS para vagoes
ALTER TABLE vagoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus vagões"
  ON vagoes FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar seus vagões"
  ON vagoes FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar seus vagões"
  ON vagoes FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar seus vagões"
  ON vagoes FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== BATIDAS ====================
CREATE TABLE IF NOT EXISTS batidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  vagao_id UUID REFERENCES vagoes(id) ON DELETE RESTRICT,
  dieta_id UUID NOT NULL REFERENCES dietas(id) ON DELETE RESTRICT,
  quantidade_kg DECIMAL(18, 8) NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PREPARANDO' CHECK (status IN ('PREPARANDO', 'CONCLUIDA', 'CANCELADA')),
  observacoes TEXT,
  ingredientes_personalizados JSONB, -- Array de {insumo_id, quantidade_kg}
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para batidas
CREATE INDEX idx_batidas_cliente ON batidas(cliente_id);
CREATE INDEX idx_batidas_status ON batidas(status);
CREATE INDEX idx_batidas_data_hora ON batidas(data_hora DESC);
CREATE INDEX idx_batidas_dieta ON batidas(dieta_id);

-- RLS para batidas
ALTER TABLE batidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas batidas"
  ON batidas FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar suas batidas"
  ON batidas FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar suas batidas"
  ON batidas FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar suas batidas"
  ON batidas FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== SAÍDAS DE ESTOQUE ====================
CREATE TABLE IF NOT EXISTS saidas_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  batida_id UUID REFERENCES batidas(id) ON DELETE SET NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  quantidade DECIMAL(18, 8) NOT NULL, -- Em KG
  valor_estimado DECIMAL(18, 8) NOT NULL,
  saldo_apos_saida DECIMAL(18, 8) NOT NULL,
  observacoes TEXT,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para saidas_estoque
CREATE INDEX idx_saidas_estoque_cliente ON saidas_estoque(cliente_id);
CREATE INDEX idx_saidas_estoque_insumo ON saidas_estoque(insumo_id);
CREATE INDEX idx_saidas_estoque_batida ON saidas_estoque(batida_id);
CREATE INDEX idx_saidas_estoque_data ON saidas_estoque(data_hora DESC);

-- RLS para saidas_estoque
ALTER TABLE saidas_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas saídas de estoque"
  ON saidas_estoque FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem criar suas saídas de estoque"
  ON saidas_estoque FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem atualizar suas saídas de estoque"
  ON saidas_estoque FOR UPDATE
  USING (auth.uid() = cliente_id);

CREATE POLICY "Usuários podem deletar suas saídas de estoque"
  ON saidas_estoque FOR DELETE
  USING (auth.uid() = cliente_id);

-- ==================== FUNÇÕES AUXILIARES ====================

-- Função para gerar código de batida
CREATE OR REPLACE FUNCTION gerar_codigo_batida()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'BAT-' || TO_CHAR(NEW.data_hora, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('batidas_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence para batidas
CREATE SEQUENCE IF NOT EXISTS batidas_seq;

-- Trigger para gerar código de batida
CREATE TRIGGER trigger_gerar_codigo_batida
  BEFORE INSERT ON batidas
  FOR EACH ROW
  EXECUTE FUNCTION gerar_codigo_batida();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_unidades_medida_updated_at BEFORE UPDATE ON unidades_medida FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insumos_updated_at BEFORE UPDATE ON insumos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entradas_estoque_updated_at BEFORE UPDATE ON entradas_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pre_misturas_updated_at BEFORE UPDATE ON pre_misturas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredientes_pre_mistura_updated_at BEFORE UPDATE ON ingredientes_pre_mistura FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dietas_updated_at BEFORE UPDATE ON dietas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredientes_dieta_updated_at BEFORE UPDATE ON ingredientes_dieta FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vagoes_updated_at BEFORE UPDATE ON vagoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batidas_updated_at BEFORE UPDATE ON batidas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saidas_estoque_updated_at BEFORE UPDATE ON saidas_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== DADOS INICIAIS ====================

-- Unidades de medida padrão (serão criadas por usuário via API)
-- KG, Saca 30kg, Saca 40kg, Saca 50kg, Tonelada, etc.
