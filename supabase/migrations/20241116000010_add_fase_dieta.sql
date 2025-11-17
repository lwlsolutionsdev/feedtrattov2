-- ==========================================
-- ADICIONAR FASE DA DIETA
-- ==========================================

-- Adicionar campo fase_dieta na tabela dietas (obrigatório)
ALTER TABLE public.dietas
ADD COLUMN IF NOT EXISTS fase_dieta VARCHAR(50) NOT NULL DEFAULT 'terminacao' CHECK (fase_dieta IN ('adaptacao_crescimento', 'terminacao'));

-- Remover o default após adicionar a coluna (para forçar preenchimento em novos registros)
ALTER TABLE public.dietas
ALTER COLUMN fase_dieta DROP DEFAULT;

-- Comentário
COMMENT ON COLUMN public.dietas.fase_dieta IS 'Fase da dieta: adaptacao_crescimento ou terminacao (obrigatório)';

-- Índice para facilitar buscas
CREATE INDEX IF NOT EXISTS idx_dietas_fase ON public.dietas(fase_dieta);
