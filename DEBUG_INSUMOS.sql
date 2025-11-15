-- DEBUG: Verificar insumos cadastrados

-- 1. Ver TODOS os insumos
SELECT 
  id,
  nome,
  cliente_id,
  empresa_id,
  ativo,
  created_at
FROM insumos
ORDER BY nome;

-- 2. Ver insumos do cliente atual
SELECT 
  id,
  nome,
  cliente_id,
  empresa_id,
  ativo
FROM insumos
WHERE cliente_id = auth.uid()
ORDER BY nome;

-- 3. Buscar "milho" (case insensitive)
SELECT 
  id,
  nome,
  cliente_id
FROM insumos
WHERE nome ILIKE '%milho%'
ORDER BY nome;

-- 4. Buscar "Milho Moído" (exato)
SELECT 
  id,
  nome,
  cliente_id
FROM insumos
WHERE nome ILIKE 'milho moído'
ORDER BY nome;

-- 5. Ver estrutura da tabela
\d insumos;

-- 6. Contar insumos por cliente
SELECT 
  cliente_id,
  COUNT(*) as total_insumos
FROM insumos
GROUP BY cliente_id;
