-- ============================================
-- CONFIGURAR RLS PARA VIEW PESAGENS_COMPLETAS
-- ============================================

-- A view pesagens_completas usa a tabela pesagens como base
-- Vamos garantir que o RLS da tabela base está correto

-- Garantir que RLS está habilitado na tabela pesagens
ALTER TABLE public.pesagens ENABLE ROW LEVEL SECURITY;

-- Configurar a view para usar security_invoker (respeita RLS do usuário)
ALTER VIEW public.pesagens_completas SET (security_invoker = true);

-- Verificar configuração
DO $$
BEGIN
  RAISE NOTICE 'View pesagens_completas configurada para respeitar RLS da tabela pesagens';
END $$;
