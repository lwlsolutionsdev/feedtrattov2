-- ============================================
-- LEITURA SIMPLES DE COCHO
-- ============================================

-- Dropar tabela se existir
DROP TABLE IF EXISTS public.leituras_cocho_simples CASCADE;

-- LEITURA SIMPLES (apenas registro, sem cálculo automático)
CREATE TABLE public.leituras_cocho_simples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  -- Referência ao lote
  lote_id UUID REFERENCES public.lotes ON DELETE CASCADE NOT NULL,
  
  -- Dados da leitura
  data_leitura DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_leitura TIME NOT NULL DEFAULT CURRENT_TIME,
  escore INTEGER NOT NULL CHECK (escore >= -1 AND escore <= 2),
  comportamento TEXT, -- Campo opcional para observações
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leituras_simples_cliente ON public.leituras_cocho_simples(cliente_id);
CREATE INDEX IF NOT EXISTS idx_leituras_simples_empresa ON public.leituras_cocho_simples(empresa_id);
CREATE INDEX IF NOT EXISTS idx_leituras_simples_lote ON public.leituras_cocho_simples(lote_id);
CREATE INDEX IF NOT EXISTS idx_leituras_simples_data ON public.leituras_cocho_simples(data_leitura DESC);

-- Comentários
COMMENT ON TABLE public.leituras_cocho_simples IS 'Leitura simples de cocho - apenas registro sem cálculo automático';
COMMENT ON COLUMN public.leituras_cocho_simples.escore IS 'Escore do cocho: -1 (muito vazio), 0 (vazio), 1 (pouca sobra), 2 (muita sobra)';
COMMENT ON COLUMN public.leituras_cocho_simples.comportamento IS 'Observações opcionais sobre comportamento dos animais';

-- RLS (Row Level Security)
ALTER TABLE public.leituras_cocho_simples ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver leituras da empresa
CREATE POLICY "Usuários podem ver leituras simples da empresa"
  ON public.leituras_cocho_simples FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir leituras
CREATE POLICY "Usuários podem criar leituras simples"
  ON public.leituras_cocho_simples FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar leituras da empresa
CREATE POLICY "Usuários podem atualizar leituras simples"
  ON public.leituras_cocho_simples FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem deletar leituras da empresa
CREATE POLICY "Usuários podem deletar leituras simples"
  ON public.leituras_cocho_simples FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );
