-- ============================================
-- TABELA DE ANIMAIS INDIVIDUAIS
-- ============================================

-- Criar ENUM para tipo de animal
DO $$ BEGIN
  CREATE TYPE tipo_animal AS ENUM ('FUNDO', 'LEVE', 'MEIO', 'PESADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar ENUM para status do animal
DO $$ BEGIN
  CREATE TYPE status_animal AS ENUM ('ATIVO', 'VENDIDO', 'ABATIDO', 'ENFERMARIA', 'MORTO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ANIMAIS
CREATE TABLE IF NOT EXISTS public.animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  -- Identificação (pelo menos um obrigatório)
  brinco_visual TEXT,
  brinco_eletronico TEXT,
  
  -- SISBOV (opcional)
  numero_sisbov TEXT UNIQUE,
  data_nascimento DATE,
  propriedade_origem TEXT,
  observacoes_sisbov TEXT,
  
  -- Dados de entrada
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_entrada DECIMAL(10,2) NOT NULL CHECK (peso_entrada > 0),
  raca_id UUID REFERENCES public.racas ON DELETE RESTRICT NOT NULL,
  categoria_id UUID REFERENCES public.categorias ON DELETE RESTRICT NOT NULL,
  lote_id UUID REFERENCES public.lotes ON DELETE RESTRICT NOT NULL,
  
  -- Tipo e valores
  tipo tipo_animal NOT NULL,
  valor_compra_kg DECIMAL(10,2) NOT NULL CHECK (valor_compra_kg > 0),
  valor_compra_total DECIMAL(10,2) GENERATED ALWAYS AS (peso_entrada * valor_compra_kg) STORED,
  
  -- Status e localização
  status status_animal NOT NULL DEFAULT 'ATIVO',
  curral_id UUID REFERENCES public.currais ON DELETE SET NULL,
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: pelo menos um brinco deve estar preenchido
  CONSTRAINT check_brinco CHECK (
    brinco_visual IS NOT NULL OR brinco_eletronico IS NOT NULL
  ),
  
  -- Constraint: SISBOV deve ter 15 dígitos se preenchido
  CONSTRAINT check_sisbov_length CHECK (
    numero_sisbov IS NULL OR LENGTH(numero_sisbov) = 15
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_animais_cliente ON public.animais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_animais_empresa ON public.animais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_animais_brinco_visual ON public.animais(brinco_visual);
CREATE INDEX IF NOT EXISTS idx_animais_brinco_eletronico ON public.animais(brinco_eletronico);
CREATE INDEX IF NOT EXISTS idx_animais_numero_sisbov ON public.animais(numero_sisbov);
CREATE INDEX IF NOT EXISTS idx_animais_lote ON public.animais(lote_id);
CREATE INDEX IF NOT EXISTS idx_animais_status ON public.animais(status);
CREATE INDEX IF NOT EXISTS idx_animais_raca ON public.animais(raca_id);
CREATE INDEX IF NOT EXISTS idx_animais_categoria ON public.animais(categoria_id);
CREATE INDEX IF NOT EXISTS idx_animais_curral ON public.animais(curral_id);
CREATE INDEX IF NOT EXISTS idx_animais_data_entrada ON public.animais(data_entrada);

-- RLS
ALTER TABLE public.animais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes can manage own animais"
  ON public.animais FOR ALL
  USING (auth.uid() = cliente_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_animais_updated_at
  BEFORE UPDATE ON public.animais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA DE HISTÓRICO DE MOVIMENTAÇÕES DE ANIMAIS
-- ============================================

CREATE TABLE IF NOT EXISTS public.movimentacoes_animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  animal_id UUID REFERENCES public.animais ON DELETE CASCADE NOT NULL,
  
  -- Movimentação
  tipo_movimentacao TEXT NOT NULL, -- 'ENTRADA', 'MUDANCA_CURRAL', 'MUDANCA_LOTE', 'VENDA', 'ABATE', 'ENFERMARIA', 'MORTE'
  curral_origem_id UUID REFERENCES public.currais ON DELETE SET NULL,
  curral_destino_id UUID REFERENCES public.currais ON DELETE SET NULL,
  lote_origem_id UUID REFERENCES public.lotes ON DELETE SET NULL,
  lote_destino_id UUID REFERENCES public.lotes ON DELETE SET NULL,
  
  data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_movimentacoes_animais_cliente ON public.movimentacoes_animais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_animais_empresa ON public.movimentacoes_animais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_animais_animal ON public.movimentacoes_animais(animal_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_animais_data ON public.movimentacoes_animais(data_movimentacao);

-- RLS
ALTER TABLE public.movimentacoes_animais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes can manage own movimentacoes_animais"
  ON public.movimentacoes_animais FOR ALL
  USING (auth.uid() = cliente_id);

-- ============================================
-- TABELA DE HISTÓRICO DE PESAGENS
-- ============================================

CREATE TABLE IF NOT EXISTS public.pesagens_animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  animal_id UUID REFERENCES public.animais ON DELETE CASCADE NOT NULL,
  
  data_pesagem DATE NOT NULL DEFAULT CURRENT_DATE,
  peso DECIMAL(10,2) NOT NULL CHECK (peso > 0),
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pesagens_animais_cliente ON public.pesagens_animais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_animais_empresa ON public.pesagens_animais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_animais_animal ON public.pesagens_animais(animal_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_animais_data ON public.pesagens_animais(data_pesagem);

-- RLS
ALTER TABLE public.pesagens_animais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes can manage own pesagens_animais"
  ON public.pesagens_animais FOR ALL
  USING (auth.uid() = cliente_id);

-- Trigger para atualizar peso atual do animal na última pesagem
CREATE OR REPLACE FUNCTION atualizar_peso_animal()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar o peso_entrada do animal com o peso da última pesagem
  -- (Isso é opcional, depende se você quer manter o peso atualizado ou só no histórico)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_peso_animal
  AFTER INSERT ON public.pesagens_animais
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_peso_animal();
