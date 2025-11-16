-- ============================================
-- CORREÇÃO DO TRIGGER DE CÁLCULO DE GMD
-- ============================================

-- Dropar trigger e função existentes
DROP TRIGGER IF EXISTS trigger_calcular_gmd_pesagem ON public.pesagens;
DROP FUNCTION IF EXISTS calcular_gmd_pesagem();

-- Recriar função corrigida
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

-- Recriar trigger
CREATE TRIGGER trigger_calcular_gmd_pesagem
  BEFORE INSERT ON public.pesagens
  FOR EACH ROW
  EXECUTE FUNCTION calcular_gmd_pesagem();

COMMENT ON FUNCTION calcular_gmd_pesagem() IS 'Calcula GMD automaticamente usando última pesagem ou peso de entrada do animal';
