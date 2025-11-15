-- ============================================
-- TABELA DE CURRAIS
-- ============================================

-- CURRAIS
create table if not exists public.currais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes on delete cascade not null,
  empresa_id uuid references public.empresas on delete cascade not null,
  
  nome text not null,
  linha text check (linha ~ '^[A-Z]$'),
  area_m2 decimal(10,2) not null,
  capacidade_animais int,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_currais_cliente on public.currais(cliente_id);
create index if not exists idx_currais_empresa on public.currais(empresa_id);

alter table public.currais enable row level security;

create policy "Clientes can manage own currais"
  on public.currais for all
  using (auth.uid() = cliente_id);

-- Trigger para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_currais_updated_at
  before update on public.currais
  for each row
  execute function update_updated_at_column();
