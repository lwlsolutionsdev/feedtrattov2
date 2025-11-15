-- ============================================
-- FEEDTRATTO V2 - SCHEMA MULTI-TENANT
-- 3 Níveis: Super Admin → Empresas → Clientes
-- ============================================

-- ============================================
-- 1️⃣ SUPER ADMINS (Você)
-- ============================================
create table if not exists public.super_admins (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  nome text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Super admins veem tudo
alter table public.super_admins enable row level security;

create policy "Super admins can manage themselves"
  on public.super_admins for all
  using (auth.uid() = id);

-- ============================================
-- 2️⃣ EMPRESAS (ex: Nutroeste)
-- ============================================
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- nutroeste (usado no subdomínio)
  nome text not null,                           -- Nutroeste Nutrição Animal
  cnpj text,
  email text,
  telefone text,
  logo_url text,
  logo_light_url text,                          -- Logo para dark mode
  logo_dark_url text,                           -- Logo para light mode
  
  -- Subdomínio gerado automaticamente
  subdominio text unique generated always as (slug || '.feedtratto.com') stored,
  
  -- Controle
  ativo boolean default true,
  plano text default 'FREE' check (plano in ('FREE', 'PRO', 'ENTERPRISE')),
  
  -- Limites por plano
  max_clientes int default 5,                   -- FREE: 5, PRO: 50, ENTERPRISE: ilimitado
  max_lotes int default 10,                     -- FREE: 10, PRO: 100, ENTERPRISE: ilimitado
  
  -- Auditoria
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index idx_empresas_slug on public.empresas(slug);
create index idx_empresas_ativo on public.empresas(ativo);

-- RLS: Super admins veem todas, empresas veem apenas a sua
alter table public.empresas enable row level security;

create policy "Super admins can see all empresas"
  on public.empresas for all
  using (
    exists (
      select 1 from public.super_admins
      where super_admins.id = auth.uid()
    )
  );

create policy "Empresa admins can see own empresa"
  on public.empresas for select
  using (
    id in (
      select empresa_id from public.empresa_admins
      where empresa_admins.id = auth.uid()
    )
  );

-- ============================================
-- 3️⃣ ADMINS DAS EMPRESAS (Portal)
-- ============================================
create table if not exists public.empresa_admins (
  id uuid primary key references auth.users on delete cascade,
  empresa_id uuid references public.empresas on delete cascade not null,
  email text unique not null,
  nome text,
  role text default 'ADMIN' check (role in ('OWNER', 'ADMIN', 'MANAGER')),
  
  -- Auditoria
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index idx_empresa_admins_empresa on public.empresa_admins(empresa_id);

-- RLS
alter table public.empresa_admins enable row level security;

create policy "Super admins can manage all empresa admins"
  on public.empresa_admins for all
  using (
    exists (
      select 1 from public.super_admins
      where super_admins.id = auth.uid()
    )
  );

create policy "Empresa admins can see themselves"
  on public.empresa_admins for select
  using (auth.uid() = id);

-- ============================================
-- 4️⃣ CLIENTES (Fazendeiros - Usuários Finais)
-- ============================================
create table if not exists public.clientes (
  id uuid primary key references auth.users on delete cascade,
  empresa_id uuid references public.empresas on delete cascade not null,
  email text unique not null,
  nome text not null,
  telefone text,
  cpf_cnpj text,
  
  -- Dados da fazenda
  fazenda text,
  cidade text,
  estado text,
  
  -- Status
  ativo boolean default true,
  
  -- Auditoria
  created_by uuid references public.empresa_admins,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index idx_clientes_empresa on public.clientes(empresa_id);
create index idx_clientes_ativo on public.clientes(ativo);

-- RLS
alter table public.clientes enable row level security;

create policy "Super admins can see all clientes"
  on public.clientes for all
  using (
    exists (
      select 1 from public.super_admins
      where super_admins.id = auth.uid()
    )
  );

create policy "Empresa admins can manage own clientes"
  on public.clientes for all
  using (
    empresa_id in (
      select empresa_id from public.empresa_admins
      where empresa_admins.id = auth.uid()
    )
  );

create policy "Clientes can see themselves"
  on public.clientes for select
  using (auth.uid() = id);

create policy "Clientes can update themselves"
  on public.clientes for update
  using (auth.uid() = id);

-- ============================================
-- 5️⃣ DADOS DO SISTEMA (Multi-tenant)
-- ============================================

-- CURRAIS
create table if not exists public.currais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes on delete cascade not null,
  empresa_id uuid references public.empresas on delete cascade not null,
  
  nome text not null,
  capacidade_animais int,
  area_m2 decimal(10,2),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_currais_cliente on public.currais(cliente_id);
create index idx_currais_empresa on public.currais(empresa_id);

alter table public.currais enable row level security;

create policy "Clientes can manage own currais"
  on public.currais for all
  using (auth.uid() = cliente_id);

-- DIETAS
create table if not exists public.dietas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes on delete cascade not null,
  empresa_id uuid references public.empresas on delete cascade not null,
  
  nome text not null,
  ms_media decimal(5,2),
  custo_por_kg_mn decimal(10,2),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_dietas_cliente on public.dietas(cliente_id);
create index idx_dietas_empresa on public.dietas(empresa_id);

alter table public.dietas enable row level security;

create policy "Clientes can manage own dietas"
  on public.dietas for all
  using (auth.uid() = cliente_id);

-- LOTES
create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes on delete cascade not null,
  empresa_id uuid references public.empresas on delete cascade not null,
  curral_id uuid references public.currais on delete set null,
  
  nome text not null,
  data_inicial date not null,
  quantidade_animais int not null,
  peso_medio_entrada decimal(10,2),
  gmd_projetado decimal(10,2),
  status text default 'ATIVO' check (status in ('ATIVO', 'FINALIZADO', 'CANCELADO')),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lotes_cliente on public.lotes(cliente_id);
create index idx_lotes_empresa on public.lotes(empresa_id);
create index idx_lotes_status on public.lotes(status);

alter table public.lotes enable row level security;

create policy "Clientes can manage own lotes"
  on public.lotes for all
  using (auth.uid() = cliente_id);

-- ============================================
-- 6️⃣ FUNÇÕES AUXILIARES
-- ============================================

-- Função para validar slug (apenas letras minúsculas, números e hífen)
create or replace function public.validar_slug(slug text)
returns boolean as $$
begin
  return slug ~ '^[a-z0-9-]+$';
end;
$$ language plpgsql;

-- Função para verificar se slug está disponível
create or replace function public.slug_disponivel(slug text)
returns boolean as $$
begin
  return not exists (
    select 1 from public.empresas
    where empresas.slug = slug_disponivel.slug
  );
end;
$$ language plpgsql;

-- ============================================
-- 7️⃣ TRIGGERS
-- ============================================

-- Atualizar updated_at automaticamente
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_empresas_updated_at
  before update on public.empresas
  for each row execute function public.update_updated_at();

create trigger update_empresa_admins_updated_at
  before update on public.empresa_admins
  for each row execute function public.update_updated_at();

create trigger update_clientes_updated_at
  before update on public.clientes
  for each row execute function public.update_updated_at();

-- ============================================
-- 8️⃣ DADOS INICIAIS (Seed)
-- ============================================

-- Inserir você como super admin (AJUSTE O EMAIL!)
-- insert into public.super_admins (id, email, nome)
-- values (
--   'seu-user-id-do-supabase-auth',
--   'seu-email@exemplo.com',
--   'Seu Nome'
-- );

-- ============================================
-- FIM DO SCHEMA
-- ============================================
