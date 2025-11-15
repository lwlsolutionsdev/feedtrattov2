-- ==========================================
-- LEITURA INTELIGENTE DE COCHO
-- Sistema automático de ajuste baseado em leituras noturna + diurna
-- ==========================================

-- Tabela de leituras inteligentes de cocho
CREATE TABLE leituras_cocho_inteligente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Referências
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Data e fase
  data_referencia DATE NOT NULL,
  fase_dieta TEXT NOT NULL CHECK (fase_dieta IN ('adaptacao_crescimento', 'terminacao')),
  dias_de_cocho INT NOT NULL CHECK (dias_de_cocho >= 0),
  
  -- Leitura NOTURNA (2-3h após último trato)
  leitura_noturna TEXT CHECK (leitura_noturna IN ('vazio', 'normal', 'cheio')),
  leitura_noturna_em TIMESTAMPTZ,
  
  -- Leitura DIURNA/MANHÃ (1h antes do primeiro trato)
  comportamento_manha TEXT CHECK (comportamento_manha IN (
    'maioria_em_pe_muita_fome',
    'alguns_em_pe_fome',
    'alguns_em_pe',
    'deitados_calmos'
  )),
  situacao_cocho_manha TEXT CHECK (situacao_cocho_manha IN (
    'limpo_lambido',
    'limpo_sem_lambida',
    'pouca_sobra',
    'com_sobras',
    'muitas_sobras'
  )),
  leitura_manha_em TIMESTAMPTZ,
  
  -- Resultados CALCULADOS
  nota_cocho DECIMAL(3,1) CHECK (nota_cocho >= -2 AND nota_cocho <= 3),
  percentual_ajuste DECIMAL(5,2) CHECK (percentual_ajuste >= -10 AND percentual_ajuste <= 15),
  
  -- Quantidades
  kg_anterior_por_cabeca DECIMAL(10,2),
  kg_novo_por_cabeca DECIMAL(10,2),
  delta_kg_por_cabeca DECIMAL(10,2),
  num_animais INT,
  total_kg_anterior DECIMAL(10,2),
  total_kg_novo DECIMAL(10,2),
  total_delta_kg DECIMAL(10,2),
  
  -- Observações e alertas
  observacoes TEXT,
  alertas TEXT[], -- Array de alertas (ex: "Nota -2 consecutiva", "Verificar água")
  
  -- Planejamento de trato gerado (será implementado futuramente)
  planejamento_trato_id UUID,  -- Referência para planejamentos_trato (quando implementado)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_leituras_inteligente_lote ON leituras_cocho_inteligente(lote_id);
CREATE INDEX idx_leituras_inteligente_cliente ON leituras_cocho_inteligente(cliente_id);
CREATE INDEX idx_leituras_inteligente_data ON leituras_cocho_inteligente(data_referencia);
CREATE INDEX idx_leituras_inteligente_lote_data ON leituras_cocho_inteligente(lote_id, data_referencia);

-- RLS (Row Level Security)
ALTER TABLE leituras_cocho_inteligente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver leituras inteligentes de sua empresa"
  ON leituras_cocho_inteligente FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir leituras inteligentes"
  ON leituras_cocho_inteligente FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar leituras inteligentes de sua empresa"
  ON leituras_cocho_inteligente FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_leituras_inteligente_updated_at
  BEFORE UPDATE ON leituras_cocho_inteligente
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE leituras_cocho_inteligente IS 'LEITURA INTELIGENTE: Sistema automático de ajuste baseado em leituras noturna + diurna com cálculo de nota e planejamento de trato';
COMMENT ON COLUMN leituras_cocho_inteligente.fase_dieta IS 'Fase da dieta: adaptacao_crescimento permite notas negativas, terminacao não';
COMMENT ON COLUMN leituras_cocho_inteligente.nota_cocho IS 'Nota calculada de -2 a 3 baseada nas leituras';
COMMENT ON COLUMN leituras_cocho_inteligente.percentual_ajuste IS 'Percentual de ajuste: -10% a +15%';
COMMENT ON COLUMN leituras_cocho_inteligente.planejamento_trato_id IS 'Planejamento de trato gerado automaticamente após leitura diurna';

-- ==========================================
-- NOTA: LEITURA SIMPLIFICADA será implementada futuramente
-- Tabela: leituras_cocho_simplificada
-- Usuário define manualmente o ajuste sem usar o sistema de notas
-- ==========================================
