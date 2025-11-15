-- ==========================================
-- ADICIONAR CAMPOS NA TABELA DIETAS
-- ==========================================

-- Adicionar campos de MS média e custos
ALTER TABLE dietas
ADD COLUMN IF NOT EXISTS ms_media DECIMAL(5,2) DEFAULT 0 CHECK (ms_media >= 0 AND ms_media <= 100),
ADD COLUMN IF NOT EXISTS custo_mn DECIMAL(10,2) DEFAULT 0 CHECK (custo_mn >= 0),
ADD COLUMN IF NOT EXISTS custo_ms DECIMAL(10,2) DEFAULT 0 CHECK (custo_ms >= 0);

-- Comentários
COMMENT ON COLUMN dietas.ms_media IS 'Porcentagem média de Matéria Seca da dieta (0-100%)';
COMMENT ON COLUMN dietas.custo_mn IS 'Custo por kg de Matéria Natural (R$/kg MN)';
COMMENT ON COLUMN dietas.custo_ms IS 'Custo por kg de Matéria Seca (R$/kg MS)';

-- Índice para facilitar buscas
CREATE INDEX IF NOT EXISTS idx_dietas_ms_media ON dietas(ms_media);
