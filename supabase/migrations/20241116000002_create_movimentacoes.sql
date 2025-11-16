-- ============================================
-- TABELA DE MOVIMENTAÇÕES DE ANIMAIS
-- ============================================

-- Dropar tabela se existir (para recriar corretamente)
DROP TABLE IF EXISTS public.movimentacoes_animais CASCADE;

-- Dropar ENUM se existir
DROP TYPE IF EXISTS tipo_destino_movimentacao CASCADE;

-- Criar ENUM para tipo de destino
CREATE TYPE tipo_destino_movimentacao AS ENUM ('LOTE', 'REFUGO', 'ENFERMARIA');

-- MOVIMENTAÇÕES
CREATE TABLE public.movimentacoes_animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  -- Animal movimentado
  animal_id UUID REFERENCES public.animais ON DELETE CASCADE NOT NULL,
  
  -- Origem
  lote_origem_id UUID REFERENCES public.lotes ON DELETE SET NULL,
  curral_origem_id UUID REFERENCES public.currais ON DELETE SET NULL,
  
  -- Destino
  tipo_destino tipo_destino_movimentacao NOT NULL,
  lote_destino_id UUID REFERENCES public.lotes ON DELETE SET NULL,
  curral_destino_id UUID REFERENCES public.currais ON DELETE SET NULL,
  
  -- Dados da movimentação
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_movimentacao DECIMAL(10,2),
  motivo TEXT,
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.clientes ON DELETE SET NULL
);

-- Constraints
ALTER TABLE public.movimentacoes_animais
ADD CONSTRAINT movimentacao_destino_lote_check 
CHECK (
  (tipo_destino = 'LOTE'::tipo_destino_movimentacao AND lote_destino_id IS NOT NULL) OR
  (tipo_destino IN ('REFUGO'::tipo_destino_movimentacao, 'ENFERMARIA'::tipo_destino_movimentacao))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_animal ON public.movimentacoes_animais(animal_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_cliente ON public.movimentacoes_animais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa ON public.movimentacoes_animais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON public.movimentacoes_animais(data_movimentacao DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote_origem ON public.movimentacoes_animais(lote_origem_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote_destino ON public.movimentacoes_animais(lote_destino_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_curral_destino ON public.movimentacoes_animais(curral_destino_id);

-- Comentários
COMMENT ON TABLE public.movimentacoes_animais IS 'Histórico de movimentações de animais entre lotes, refugo e enfermaria';
COMMENT ON COLUMN public.movimentacoes_animais.tipo_destino IS 'Tipo de destino: LOTE (outro lote), REFUGO (descarte) ou ENFERMARIA (tratamento)';
COMMENT ON COLUMN public.movimentacoes_animais.peso_movimentacao IS 'Peso do animal no momento da movimentação (opcional)';

-- RLS (Row Level Security)
ALTER TABLE public.movimentacoes_animais ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver movimentações da sua empresa
CREATE POLICY "Usuários podem ver movimentações da empresa"
  ON public.movimentacoes_animais FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir movimentações
CREATE POLICY "Usuários podem criar movimentações"
  ON public.movimentacoes_animais FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar movimentações da empresa
CREATE POLICY "Usuários podem atualizar movimentações"
  ON public.movimentacoes_animais FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem deletar movimentações da empresa
CREATE POLICY "Usuários podem deletar movimentações"
  ON public.movimentacoes_animais FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Função para atualizar localização do animal após movimentação
CREATE OR REPLACE FUNCTION atualizar_localizacao_animal()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar o animal com a nova localização
  IF NEW.tipo_destino = 'LOTE' THEN
    -- Movimentação para outro lote
    UPDATE public.animais
    SET 
      lote_id = NEW.lote_destino_id,
      curral_id = NEW.curral_destino_id,
      status = 'ATIVO'
    WHERE id = NEW.animal_id;
    
  ELSIF NEW.tipo_destino = 'REFUGO' THEN
    -- Refugo: pode ter curral (opcional), sem lote
    UPDATE public.animais
    SET 
      lote_id = NULL,
      curral_id = NEW.curral_destino_id,
      status = 'ATIVO'
    WHERE id = NEW.animal_id;
    
  ELSIF NEW.tipo_destino = 'ENFERMARIA' THEN
    -- Enfermaria: sem lote, sem curral, status ENFERMARIA
    UPDATE public.animais
    SET 
      lote_id = NULL,
      curral_id = NULL,
      status = 'ENFERMARIA'
    WHERE id = NEW.animal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar localização automaticamente
CREATE TRIGGER trigger_atualizar_localizacao_animal
  AFTER INSERT ON public.movimentacoes_animais
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_localizacao_animal();
