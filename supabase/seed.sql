-- ============================================
-- SEED - DADOS INICIAIS PARA DESENVOLVIMENTO
-- ============================================

-- ============================================
-- 1️⃣ EMPRESAS
-- ============================================

-- Empresa 1: Feedtratto (sua empresa)
insert into public.empresas (
  slug,
  nome,
  email,
  plano,
  max_clientes,
  max_lotes,
  ativo
) values (
  'app',
  'Feedtratto',
  'contato@feedtratto.com',
  'ENTERPRISE',
  999999,  -- Ilimitado
  999999,  -- Ilimitado
  true
) on conflict (slug) do nothing;

-- Empresa 2: Nutroeste (teste)
insert into public.empresas (
  slug,
  nome,
  cnpj,
  email,
  telefone,
  plano,
  max_clientes,
  max_lotes,
  ativo
) values (
  'nutroeste',
  'Nutroeste Nutrição Animal',
  '12.345.678/0001-90',
  'contato@nutroeste.com.br',
  '(67) 99999-9999',
  'PRO',
  50,
  100,
  true
) on conflict (slug) do nothing;

-- ============================================
-- 2️⃣ NOTAS IMPORTANTES
-- ============================================

-- Para criar usuários (empresa_admins e clientes), você precisa:
-- 1. Criar o usuário no Supabase Auth primeiro
-- 2. Depois inserir na tabela correspondente

-- EXEMPLO (faça isso manualmente no Supabase Dashboard):
-- 
-- 1. Vá em Authentication → Users → Add User
-- 2. Crie um usuário com email/senha
-- 3. Copie o UUID gerado
-- 4. Insira na tabela empresa_admins ou clientes

-- ============================================
-- 3️⃣ EXEMPLO DE INSERÇÃO (após criar no Auth)
-- ============================================

-- EMPRESA ADMIN (Feedtratto)
-- Substitua 'SEU-UUID-AQUI' pelo UUID do usuário criado no Auth
-- 
-- insert into public.empresa_admins (
--   id,
--   empresa_id,
--   email,
--   nome,
--   role
-- ) values (
--   'SEU-UUID-AQUI',
--   (select id from public.empresas where slug = 'app'),
--   'seu-email@exemplo.com',
--   'Seu Nome',
--   'OWNER'
-- );

-- CLIENTE (Feedtratto)
-- 
-- insert into public.clientes (
--   id,
--   empresa_id,
--   email,
--   nome,
--   telefone,
--   fazenda,
--   ativo
-- ) values (
--   'SEU-UUID-AQUI',
--   (select id from public.empresas where slug = 'app'),
--   'cliente@exemplo.com',
--   'Nome do Cliente',
--   '(67) 99999-9999',
--   'Fazenda Exemplo',
--   true
-- );

-- ============================================
-- FIM DO SEED
-- ============================================
