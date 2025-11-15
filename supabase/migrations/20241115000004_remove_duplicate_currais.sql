-- ==========================================
-- REMOVER CURRAIS DUPLICADOS
-- Mantém apenas o curral mais antigo de cada nome
-- ==========================================

-- Deletar currais duplicados, mantendo apenas o mais antigo (menor created_at)
DELETE FROM currais
WHERE id NOT IN (
  SELECT DISTINCT ON (nome, cliente_id) id
  FROM currais
  ORDER BY nome, cliente_id, created_at ASC
);

-- Verificar quantos currais restaram
SELECT COUNT(*) as total_currais FROM currais;
