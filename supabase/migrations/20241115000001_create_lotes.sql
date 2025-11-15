-- ==========================================
-- LOTES - Gestão de Lotes de Confinamento
-- ==========================================

-- Tabela de lotes
CREATE TABLE lotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Referências
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  curral_id UUID REFERENCES currais(id) ON DELETE SET NULL,
  
  -- Identificação
  nome TEXT NOT NULL,
  
  -- Temporal
  data_entrada DATE NOT NULL,
  dias_planejados INT NOT NULL CHECK (dias_planejados > 0),
  data_inicial DATE NOT NULL,  -- Normalmente = data_entrada
  data_final_projetada DATE,   -- CALCULADO: data_inicial + dias_planejados
  
  -- Quantidade de animais
  quantidade_animais INT NOT NULL CHECK (quantidade_animais > 0),
  peso_medio_entrada DECIMAL(10,2) CHECK (peso_medio_entrada > 0),  -- kg
  
  -- Performance projetada
  gmd_projetado DECIMAL(10,2) CHECK (gmd_projetado >= 0),  -- Ganho Médio Diário (kg/dia)
  peso_medio_saida_projetado DECIMAL(10,2),  -- CALCULADO ou informado
  
  -- Custos projetados
  custo_fixo_cabeca_dia_projetado DECIMAL(10,2) DEFAULT 0,  -- R$/cabeça/dia
  custo_protocolo_sanitario_projetado DECIMAL(10,2) DEFAULT 0,  -- R$ total do lote
  
  -- Saída projetada
  rendimento_carcaca_projetado DECIMAL(5,2) CHECK (rendimento_carcaca_projetado >= 0 AND rendimento_carcaca_projetado <= 100),  -- %
  valor_venda_projetado DECIMAL(10,2),  -- R$/@
  
  -- Consumo (para leitura de cocho)
  kg_por_cabeca_atual DECIMAL(10,2) DEFAULT 0,  -- Consumo atual (atualizado pela leitura inteligente)
  
  -- Status
  status TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'FINALIZADO', 'CANCELADO')),
  
  -- Observações
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_lotes_cliente ON lotes(cliente_id);
CREATE INDEX idx_lotes_empresa ON lotes(empresa_id);
CREATE INDEX idx_lotes_curral ON lotes(curral_id);
CREATE INDEX idx_lotes_status ON lotes(status);
CREATE INDEX idx_lotes_data_entrada ON lotes(data_entrada);
CREATE INDEX idx_lotes_data_final ON lotes(data_final_projetada);

-- Índice único: um curral só pode ter um lote ativo por vez
CREATE UNIQUE INDEX idx_lotes_curral_ativo 
  ON lotes(curral_id) 
  WHERE status = 'ATIVO' AND curral_id IS NOT NULL;

-- RLS (Row Level Security)
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver lotes de sua empresa"
  ON lotes FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir lotes"
  ON lotes FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar lotes de sua empresa"
  ON lotes FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar lotes de sua empresa"
  ON lotes FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_lotes_updated_at
  BEFORE UPDATE ON lotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular data_final_projetada automaticamente
CREATE OR REPLACE FUNCTION calcular_data_final_lote()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular data final projetada
  IF NEW.data_inicial IS NOT NULL AND NEW.dias_planejados IS NOT NULL THEN
    NEW.data_final_projetada := NEW.data_inicial + (NEW.dias_planejados || ' days')::INTERVAL;
  END IF;
  
  -- Calcular peso médio de saída projetado (se tiver GMD)
  IF NEW.peso_medio_entrada IS NOT NULL AND NEW.gmd_projetado IS NOT NULL AND NEW.dias_planejados IS NOT NULL THEN
    NEW.peso_medio_saida_projetado := NEW.peso_medio_entrada + (NEW.gmd_projetado * NEW.dias_planejados);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_data_final_lote
  BEFORE INSERT OR UPDATE ON lotes
  FOR EACH ROW
  EXECUTE FUNCTION calcular_data_final_lote();

-- Comentários
COMMENT ON TABLE lotes IS 'Lotes de animais em confinamento com planejamento e projeções';
COMMENT ON COLUMN lotes.data_final_projetada IS 'Calculado automaticamente: data_inicial + dias_planejados';
COMMENT ON COLUMN lotes.peso_medio_saida_projetado IS 'Calculado automaticamente: peso_entrada + (gmd * dias)';
COMMENT ON COLUMN lotes.kg_por_cabeca_atual IS 'Consumo atual de ração por cabeça, atualizado pela leitura inteligente de cocho';
COMMENT ON COLUMN lotes.custo_fixo_cabeca_dia_projetado IS 'Custo fixo projetado por cabeça por dia (R$)';
COMMENT ON COLUMN lotes.custo_protocolo_sanitario_projetado IS 'Custo total projetado do protocolo sanitário do lote (R$)';
COMMENT ON COLUMN lotes.rendimento_carcaca_projetado IS 'Rendimento de carcaça projetado na saída (%)';
COMMENT ON COLUMN lotes.valor_venda_projetado IS 'Valor de venda projetado por arroba (R$/@)';
