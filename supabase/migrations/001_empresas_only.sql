-- ============================================
-- CRIAR APENAS TABELA DE EMPRESAS (TESTE)
-- ============================================

-- Tabela de empresas
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  cnpj text,
  email text,
  telefone text,
  logo_url text,
  logo_light_url text,
  logo_dark_url text,
  
  -- Subdomínio gerado automaticamente
  subdominio text unique generated always as (slug || '.feedtratto.com') stored,
  
  -- Controle
  ativo boolean default true,
  plano text default 'FREE' check (plano in ('FREE', 'PRO', 'ENTERPRISE')),
  
  -- Limites por plano
  max_clientes int default 5,
  max_lotes int default 10,
  
  -- Auditoria
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index if not exists idx_empresas_slug on public.empresas(slug);
create index if not exists idx_empresas_ativo on public.empresas(ativo);

-- RLS
alter table public.empresas enable row level security;

-- Inserir as 2 empresas
insert into public.empresas (slug, nome, email, plano, max_clientes, max_lotes, ativo)
values 
  ('app', 'Feedtratto', 'contato@feedtratto.com', 'ENTERPRISE', 999999, 999999, true),
  ('nutroeste', 'Nutroeste Nutrição Animal', 'contato@nutroeste.com.br', 'PRO', 50, 100, true)
on conflict (slug) do nothing;
