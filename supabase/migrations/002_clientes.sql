-- ============================================
-- TABELAS DE USUÁRIOS (CLIENTES)
-- ============================================

-- Tabela de clientes (fazendeiros)
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index if not exists idx_clientes_empresa on public.clientes(empresa_id);
create index if not exists idx_clientes_ativo on public.clientes(ativo);

-- RLS
alter table public.clientes enable row level security;

create policy "Clientes can see themselves"
  on public.clientes for select
  using (auth.uid() = id);

create policy "Clientes can update themselves"
  on public.clientes for update
  using (auth.uid() = id);

-- Trigger para atualizar updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_clientes_updated_at
  before update on public.clientes
  for each row execute function public.update_updated_at();
