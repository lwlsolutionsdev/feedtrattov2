-- ============================================
-- TABELA DE PESAGENS DE ANIMAIS
-- ============================================

-- Dropar tabela se existir
DROP TABLE IF EXISTS public.pesagens CASCADE;

-- Dropar ENUM se existir
DROP TYPE IF EXISTS tipo_pesagem CASCADE;

-- Criar ENUM para tipo de pesagem
CREATE TYPE tipo_pesagem AS ENUM ('ENTRADA', 'MANEJO', 'SAIDA', 'TECNOLOGIA_PARCEIRA');

-- PESAGENS
CREATE TABLE public.pesagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas ON DELETE CASCADE NOT NULL,
  
  -- Animal pesado
  animal_id UUID REFERENCES public.animais ON DELETE CASCADE NOT NULL,
  
  -- Dados da pesagem
  tipo tipo_pesagem NOT NULL,
  data_pesagem DATE NOT NULL DEFAULT CURRENT_DATE,
  peso DECIMAL(10,2) NOT NULL CHECK (peso > 0),
  
  -- Cálculo de GMD (Ganho Médio Diário)
  dias_desde_ultima_pesagem INTEGER,
  peso_anterior DECIMAL(10,2),
  gmd DECIMAL(10,3), -- Ganho Médio Diário em kg/dia
  
  -- Informações adicionais
  observacoes TEXT,
  
  -- Tecnologia parceira (para pesagens de saída)
  tecnologia_parceira_id TEXT, -- ID externo da tecnologia
  tecnologia_parceira_dados JSONB, -- Dados extras da tecnologia (câmeras 3D, IA, etc)
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.clientes ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pesagens_animal ON public.pesagens(animal_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_cliente ON public.pesagens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_empresa ON public.pesagens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_data ON public.pesagens(data_pesagem DESC);
CREATE INDEX IF NOT EXISTS idx_pesagens_tipo ON public.pesagens(tipo);
CREATE INDEX IF NOT EXISTS idx_pesagens_animal_data ON public.pesagens(animal_id, data_pesagem DESC);

-- Comentários
COMMENT ON TABLE public.pesagens IS 'Histórico de pesagens de animais (entrada, manejo, saída)';
COMMENT ON COLUMN public.pesagens.tipo IS 'Tipo de pesagem: ENTRADA (primeira pesagem), MANEJO (pesagens intermediárias), SAIDA (pesagem final manual), TECNOLOGIA_PARCEIRA (pesagem automática com câmeras 3D/IA)';
COMMENT ON COLUMN public.pesagens.gmd IS 'Ganho Médio Diário calculado automaticamente em kg/dia';
COMMENT ON COLUMN public.pesagens.tecnologia_parceira_dados IS 'Dados JSON da tecnologia parceira (imagens, confiança da IA, etc)';

-- RLS (Row Level Security)
ALTER TABLE public.pesagens ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver pesagens da empresa
CREATE POLICY "Usuários podem ver pesagens da empresa"
  ON public.pesagens FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir pesagens
CREATE POLICY "Usuários podem criar pesagens"
  ON public.pesagens FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar pesagens da empresa
CREATE POLICY "Usuários podem atualizar pesagens"
  ON public.pesagens FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem deletar pesagens da empresa
CREATE POLICY "Usuários podem deletar pesagens"
  ON public.pesagens FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.clientes WHERE id = auth.uid()
    )
  );

-- Função para calcular GMD automaticamente
CREATE OR REPLACE FUNCTION calcular_gmd_pesagem()
RETURNS TRIGGER AS $$
DECLARE
  v_peso_anterior DECIMAL(10,2);
  v_data_anterior DATE;
  v_dias INTEGER;
  v_gmd DECIMAL(10,3);
BEGIN
  -- Inicializar valores
  v_peso_anterior := NULL;
  v_data_anterior := NULL;
  
  -- Buscar a última pesagem anterior do mesmo animal
  SELECT peso, data_pesagem
  INTO v_peso_anterior, v_data_anterior
  FROM public.pesagens
  WHERE animal_id = NEW.animal_id
    AND data_pesagem < NEW.data_pesagem
  ORDER BY data_pesagem DESC
  LIMIT 1;
  
  -- Se não encontrou pesagem anterior, buscar peso de entrada do animal
  IF v_peso_anterior IS NULL THEN
    SELECT peso_entrada, data_entrada
    INTO v_peso_anterior, v_data_anterior
    FROM public.animais
    WHERE id = NEW.animal_id;
  END IF;
  
  -- Se encontrou peso anterior (de pesagem ou entrada), calcular GMD
  IF v_peso_anterior IS NOT NULL AND v_data_anterior IS NOT NULL THEN
    v_dias := NEW.data_pesagem - v_data_anterior;
    
    IF v_dias > 0 THEN
      v_gmd := (NEW.peso - v_peso_anterior) / v_dias;
      
      NEW.dias_desde_ultima_pesagem := v_dias;
      NEW.peso_anterior := v_peso_anterior;
      NEW.gmd := v_gmd;
      
      -- Log para debug (aparece no log do Supabase)
      RAISE NOTICE 'GMD calculado: % kg/dia (% dias, peso anterior: % kg)', v_gmd, v_dias, v_peso_anterior;
    END IF;
  ELSE
    RAISE NOTICE 'Não foi possível calcular GMD - peso_anterior: %, data_anterior: %', v_peso_anterior, v_data_anterior;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular GMD automaticamente antes de inserir
CREATE TRIGGER trigger_calcular_gmd_pesagem
  BEFORE INSERT ON public.pesagens
  FOR EACH ROW
  EXECUTE FUNCTION calcular_gmd_pesagem();

-- View para facilitar consultas com informações do animal
CREATE OR REPLACE VIEW public.pesagens_completas AS
SELECT 
  p.*,
  a.brinco_visual,
  a.brinco_eletronico,
  a.numero_sisbov,
  a.data_entrada,
  a.peso_entrada,
  r.nome as raca_nome,
  c.nome as categoria_nome,
  l.nome as lote_nome
FROM public.pesagens p
INNER JOIN public.animais a ON p.animal_id = a.id
LEFT JOIN public.racas r ON a.raca_id = r.id
LEFT JOIN public.categorias c ON a.categoria_id = c.id
LEFT JOIN public.lotes l ON a.lote_id = l.id;

COMMENT ON VIEW public.pesagens_completas IS 'View com pesagens e informações completas dos animais';
