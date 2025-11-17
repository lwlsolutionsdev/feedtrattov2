-- ==========================================
-- CRIAR TABELAS DE PLANEJAMENTO DE TRATO
-- ==========================================

-- Tabela principal de planejamentos
CREATE TABLE IF NOT EXISTS planejamentos_trato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  dieta_id UUID NOT NULL REFERENCES dietas(id) ON DELETE RESTRICT,
  vagao_id UUID NOT NULL REFERENCES vagoes(id) ON DELETE RESTRICT,
  periodo_alimentacao_id UUID REFERENCES periodos_alimentacao_lote(id) ON DELETE SET NULL,
  
  -- Data e tipo
  data_planejamento DATE NOT NULL,
  tipo_leitura VARCHAR(20) NOT NULL CHECK (tipo_leitura IN ('inteligente', 'simples')),
  
  -- Dados do lote no dia
  dias_cocho INTEGER NOT NULL,
  fase_dieta VARCHAR(50) NOT NULL CHECK (fase_dieta IN ('adaptacao_crescimento', 'terminacao')),
  peso_medio_projetado DECIMAL(10,2),
  
  -- Leitura inteligente (se aplicável)
  leitura_cocho_id UUID REFERENCES leituras_cocho_inteligente(id) ON DELETE SET NULL,
  nota_cocho INTEGER CHECK (nota_cocho BETWEEN -2 AND 3),
  ajuste_percentual DECIMAL(5,2) CHECK (ajuste_percentual BETWEEN -10 AND 15),
  
  -- Quantidades
  quantidade_base_kg DECIMAL(10,2) NOT NULL, -- Calculada pela fórmula
  quantidade_ajustada_kg DECIMAL(10,2) NOT NULL, -- Após ajuste (se houver)
  quantidade_realizada_kg DECIMAL(10,2), -- Preenchida após execução
  
  -- Configuração dos tratos
  numero_tratos INTEGER NOT NULL CHECK (numero_tratos > 0),
  
  -- Status
  status VARCHAR(20) DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_execucao', 'concluido', 'cancelado')),
  
  -- Observações
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Constraint: um planejamento por lote por dia
  CONSTRAINT unique_lote_data UNIQUE (lote_id, data_planejamento)
);

-- Tabela de tratos individuais
CREATE TABLE IF NOT EXISTS tratos_planejados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência ao planejamento
  planejamento_id UUID NOT NULL REFERENCES planejamentos_trato(id) ON DELETE CASCADE,
  
  -- Configuração do trato
  ordem INTEGER NOT NULL CHECK (ordem > 0),
  horario TIME NOT NULL,
  percentual DECIMAL(5,2) NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  quantidade_planejada_kg DECIMAL(10,2) NOT NULL,
  
  -- Execução (preenchido quando realizado)
  quantidade_realizada_kg DECIMAL(10,2),
  horario_realizado TIMESTAMPTZ,
  realizado BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: ordem única por planejamento
  CONSTRAINT unique_planejamento_ordem UNIQUE (planejamento_id, ordem)
);

-- Índices para performance
CREATE INDEX idx_planejamentos_lote ON planejamentos_trato(lote_id);
CREATE INDEX idx_planejamentos_data ON planejamentos_trato(data_planejamento);
CREATE INDEX idx_planejamentos_lote_data ON planejamentos_trato(lote_id, data_planejamento);
CREATE INDEX idx_planejamentos_vagao ON planejamentos_trato(vagao_id);
CREATE INDEX idx_planejamentos_status ON planejamentos_trato(status);
CREATE INDEX idx_planejamentos_cliente ON planejamentos_trato(cliente_id);
CREATE INDEX idx_planejamentos_empresa ON planejamentos_trato(empresa_id);

CREATE INDEX idx_tratos_planejamento ON tratos_planejados(planejamento_id);
CREATE INDEX idx_tratos_ordem ON tratos_planejados(planejamento_id, ordem);
CREATE INDEX idx_tratos_horario ON tratos_planejados(horario);
CREATE INDEX idx_tratos_realizado ON tratos_planejados(realizado);

-- Triggers para updated_at
CREATE TRIGGER update_planejamentos_trato_updated_at
  BEFORE UPDATE ON planejamentos_trato
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tratos_planejados_updated_at
  BEFORE UPDATE ON tratos_planejados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- RLS (Row Level Security)
-- ==========================================

ALTER TABLE planejamentos_trato ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratos_planejados ENABLE ROW LEVEL SECURITY;

-- Políticas para planejamentos_trato
CREATE POLICY "Usuários podem ver seus planejamentos"
  ON planejamentos_trato FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar planejamentos"
  ON planejamentos_trato FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar seus planejamentos"
  ON planejamentos_trato FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar seus planejamentos"
  ON planejamentos_trato FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Políticas para tratos_planejados
CREATE POLICY "Usuários podem ver tratos de seus planejamentos"
  ON tratos_planejados FOR SELECT
  USING (
    planejamento_id IN (
      SELECT id FROM planejamentos_trato 
      WHERE empresa_id IN (
        SELECT empresa_id FROM clientes WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar tratos"
  ON tratos_planejados FOR INSERT
  WITH CHECK (
    planejamento_id IN (
      SELECT id FROM planejamentos_trato 
      WHERE cliente_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar tratos de seus planejamentos"
  ON tratos_planejados FOR UPDATE
  USING (
    planejamento_id IN (
      SELECT id FROM planejamentos_trato 
      WHERE empresa_id IN (
        SELECT empresa_id FROM clientes WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem deletar tratos de seus planejamentos"
  ON tratos_planejados FOR DELETE
  USING (
    planejamento_id IN (
      SELECT id FROM planejamentos_trato 
      WHERE empresa_id IN (
        SELECT empresa_id FROM clientes WHERE id = auth.uid()
      )
    )
  );

-- Comentários
COMMENT ON TABLE planejamentos_trato IS 'Planejamentos diários de trato por lote';
COMMENT ON TABLE tratos_planejados IS 'Tratos individuais de cada planejamento';

COMMENT ON COLUMN planejamentos_trato.tipo_leitura IS 'Tipo de leitura: inteligente (com ajuste automático) ou simples (manual)';
COMMENT ON COLUMN planejamentos_trato.quantidade_base_kg IS 'Quantidade calculada pela fórmula: peso × consumo_ms% ÷ ms_dieta%';
COMMENT ON COLUMN planejamentos_trato.quantidade_ajustada_kg IS 'Quantidade após aplicar ajuste da leitura inteligente';
COMMENT ON COLUMN planejamentos_trato.ajuste_percentual IS 'Percentual de ajuste baseado na nota do cocho (-10% a +15%)';

COMMENT ON COLUMN tratos_planejados.percentual IS 'Percentual deste trato em relação ao total do dia';
COMMENT ON COLUMN tratos_planejados.quantidade_planejada_kg IS 'Quantidade planejada para este trato específico';
