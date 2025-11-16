-- ============================================
-- VIEW PARA TOTALIZAR ANIMAIS POR LOTE
-- ============================================

-- Dropar view se existir
DROP VIEW IF EXISTS public.lotes_com_totais CASCADE;

-- Criar view que soma animais individuais + animais em lote
CREATE OR REPLACE VIEW public.lotes_com_totais AS
SELECT 
  l.id,
  l.cliente_id,
  l.empresa_id,
  l.nome,
  l.curral_id,
  l.data_entrada,
  l.dias_planejados,
  l.data_inicial,
  l.data_final_projetada,
  l.quantidade_animais,
  l.peso_medio_entrada,
  l.gmd_projetado,
  l.peso_medio_saida_projetado,
  l.custo_fixo_cabeca_dia_projetado,
  l.custo_protocolo_sanitario_projetado,
  l.rendimento_carcaca_projetado,
  l.valor_venda_projetado,
  l.kg_por_cabeca_atual,
  l.status,
  l.observacoes,
  l.created_at,
  l.updated_at,
  
  -- Contar animais individuais ativos
  COALESCE(
    (SELECT COUNT(*) 
     FROM public.animais a 
     WHERE a.lote_id = l.id 
       AND a.status = 'ATIVO'),
    0
  ) as total_animais_individuais,
  
  -- Somar quantidade de animais em lote ativos
  COALESCE(
    (SELECT SUM(la.quantidade) 
     FROM public.lotes_animais la 
     WHERE la.lote_confinamento_id = l.id 
       AND la.status = 'ATIVO'),
    0
  ) as total_animais_lote,
  
  -- Total geral (individuais + lote)
  COALESCE(
    (SELECT COUNT(*) 
     FROM public.animais a 
     WHERE a.lote_id = l.id 
       AND a.status = 'ATIVO'),
    0
  ) + COALESCE(
    (SELECT SUM(la.quantidade) 
     FROM public.lotes_animais la 
     WHERE la.lote_confinamento_id = l.id 
       AND la.status = 'ATIVO'),
    0
  ) as total_animais
  
FROM public.lotes l;

-- Comentários
COMMENT ON VIEW public.lotes_com_totais IS 'View que totaliza animais individuais e em lote por lote de confinamento';
COMMENT ON COLUMN public.lotes_com_totais.total_animais_individuais IS 'Quantidade de animais cadastrados individualmente';
COMMENT ON COLUMN public.lotes_com_totais.total_animais_lote IS 'Quantidade de animais cadastrados em lote';
COMMENT ON COLUMN public.lotes_com_totais.total_animais IS 'Total geral de animais (individuais + lote)';

-- Garantir que a view respeita RLS
ALTER VIEW public.lotes_com_totais SET (security_invoker = true);
