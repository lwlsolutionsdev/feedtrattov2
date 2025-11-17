-- ==========================================
-- ADICIONAR POLÍTICA DE DELETE PARA LEITURAS
-- ==========================================

-- Política para permitir que usuários deletem leituras de sua empresa
CREATE POLICY "Usuários podem deletar leituras inteligentes de sua empresa"
  ON leituras_cocho_inteligente FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM clientes WHERE id = auth.uid()
    )
  );

-- Comentário
COMMENT ON POLICY "Usuários podem deletar leituras inteligentes de sua empresa" ON leituras_cocho_inteligente IS 'Permite que usuários deletem leituras da sua empresa';
