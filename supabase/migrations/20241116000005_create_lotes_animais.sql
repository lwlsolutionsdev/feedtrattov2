-- ============================================
-- TABELA DE LOTES DE ANIMAIS (ENTRADA EM LOTE)
-- ============================================

-- Dropar tabela se existir
DROP TABLE IF EXISTS public.lotes_animais CASCADE;

-- LOTES DE ANIMAIS (entrada sem brinco individual)
CREATE TABLE public.lotes_animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  -- Dados dos animais
  descricao TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  raca_id UUID REFERENCES public.racas ON DELETE RESTRICT NOT NULL,
  categoria_id UUID REFERENCES public.categorias ON DELETE RESTRICT NOT NULL,
  lote_confinamento_id UUID REFERENCES public.lotes ON DELETE RESTRICT NOT NULL, -- Lote onde ficarão
  
  -- Dados de entrada
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_medio DECIMAL(10,2) NOT NULL CHECK (peso_medio > 0),
  peso_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * peso_medio) STORED,
  
  -- Tipo e valores
  tipo tipo_animal NOT NULL,
  valor_compra_kg DECIMAL(10,2) NOT NULL CHECK (valor_compra_kg > 0),
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * peso_medio * valor_compra_kg) STORED,
  
  -- Status
  status status_animal NOT NULL DEFAULT 'ATIVO',
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lotes_animais_cliente ON public.lotes_animais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_lotes_animais_empresa ON public.lotes_animais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lotes_animais_lote_conf ON public.lotes_animais(lote_confinamento_id);
CREATE INDEX IF NOT EXISTS idx_lotes_animais_data ON public.lotes_animais(data_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_lotes_animais_status ON public.lotes_animais(status);

-- Comentários
COMMENT ON TABLE public.lotes_animais IS 'Entrada de animais em lote (sem identificação individual por brinco)';
COMMENT ON COLUMN public.lotes_animais.quantidade IS 'Quantidade de animais no lote';
COMMENT ON COLUMN public.lotes_animais.peso_medio IS 'Peso médio dos animais em kg';
COMMENT ON COLUMN public.lotes_animais.peso_total IS 'Peso total do lote (calculado automaticamente)';
COMMENT ON COLUMN public.lotes_animais.valor_total IS 'Valor total da compra (calculado automaticamente)';

-- RLS (Row Level Security)
ALTER TABLE public.lotes_animais ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver lotes de animais da empresa
CREATE POLICY "Usuários podem ver lotes de animais da empresa"
  ON public.lotes_animais FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir lotes de animais
CREATE POLICY "Usuários podem criar lotes de animais"
  ON public.lotes_animais FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar lotes de animais da empresa
CREATE POLICY "Usuários podem atualizar lotes de animais"
  ON public.lotes_animais FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem deletar lotes de animais da empresa
CREATE POLICY "Usuários podem deletar lotes de animais"
  ON public.lotes_animais FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_lotes_animais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_lotes_animais_updated_at
  BEFORE UPDATE ON public.lotes_animais
  FOR EACH ROW
  EXECUTE FUNCTION update_lotes_animais_updated_at();
