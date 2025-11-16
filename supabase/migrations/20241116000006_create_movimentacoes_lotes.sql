-- ============================================
-- TABELA DE MOVIMENTAÇÕES DE LOTES DE ANIMAIS
-- ============================================

-- Dropar tabela se existir
DROP TABLE IF EXISTS public.movimentacoes_lotes CASCADE;

-- MOVIMENTAÇÕES DE LOTES (movimentação em massa)
CREATE TABLE public.movimentacoes_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  -- Referência ao lote de animais
  lote_animais_id UUID REFERENCES public.lotes_animais ON DELETE CASCADE NOT NULL,
  
  -- Origem
  tipo_origem tipo_destino_movimentacao NOT NULL DEFAULT 'LOTE',
  lote_origem_id UUID REFERENCES public.lotes ON DELETE RESTRICT,
  
  -- Destino
  tipo_destino tipo_destino_movimentacao NOT NULL,
  lote_destino_id UUID REFERENCES public.lotes ON DELETE RESTRICT,
  curral_destino_id UUID REFERENCES public.currais ON DELETE RESTRICT,
  
  -- Dados da movimentação
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_animais INTEGER NOT NULL CHECK (quantidade_animais > 0),
  motivo TEXT NOT NULL,
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lotes_cliente ON public.movimentacoes_lotes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lotes_empresa ON public.movimentacoes_lotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lotes_lote_animais ON public.movimentacoes_lotes(lote_animais_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lotes_data ON public.movimentacoes_lotes(data_movimentacao DESC);

-- Comentários
COMMENT ON TABLE public.movimentacoes_lotes IS 'Movimentações de lotes de animais (movimentação em massa)';
COMMENT ON COLUMN public.movimentacoes_lotes.lote_animais_id IS 'Referência ao lote de animais que foi movimentado';
COMMENT ON COLUMN public.movimentacoes_lotes.quantidade_animais IS 'Quantidade de animais movimentados';

-- RLS (Row Level Security)
ALTER TABLE public.movimentacoes_lotes ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver movimentações da empresa
CREATE POLICY "Usuários podem ver movimentações de lotes da empresa"
  ON public.movimentacoes_lotes FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir movimentações
CREATE POLICY "Usuários podem criar movimentações de lotes"
  ON public.movimentacoes_lotes FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar movimentações da empresa
CREATE POLICY "Usuários podem atualizar movimentações de lotes"
  ON public.movimentacoes_lotes FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem deletar movimentações da empresa
CREATE POLICY "Usuários podem deletar movimentações de lotes"
  ON public.movimentacoes_lotes FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );
