-- Isolamento por tenant (empresa) na tabela composicao_detalhada_custom.
-- Cada empresa vê e edita apenas suas próprias customizações de detalhamento.

-- 1. Adicionar coluna empresa_id
ALTER TABLE composicao_detalhada_custom
  ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 2. Atribuir empresa existente a registros antigos (se houver)
UPDATE composicao_detalhada_custom
SET empresa_id = (SELECT id FROM public.empresas ORDER BY id LIMIT 1)
WHERE empresa_id IS NULL;

-- 3. Tornar empresa_id obrigatório
ALTER TABLE composicao_detalhada_custom
  ALTER COLUMN empresa_id SET NOT NULL;

-- 4. Remover constraint UNIQUE antiga e criar nova incluindo empresa_id
ALTER TABLE composicao_detalhada_custom
  DROP CONSTRAINT IF EXISTS composicao_detalhada_custom_codigo_composicao_estado_codigo_item_key;

ALTER TABLE composicao_detalhada_custom
  ADD CONSTRAINT composicao_detalhada_custom_empresa_composicao_estado_item_key
  UNIQUE (empresa_id, codigo_composicao, estado, codigo_item);

-- 5. Índice para filtro por empresa
CREATE INDEX IF NOT EXISTS idx_composicao_detalhada_custom_empresa
  ON composicao_detalhada_custom (empresa_id);

-- 6. Habilitar RLS
ALTER TABLE composicao_detalhada_custom ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS (isolamento por get_user_empresa_id())
DROP POLICY IF EXISTS "composicao_detalhada_custom_select" ON composicao_detalhada_custom;
CREATE POLICY "composicao_detalhada_custom_select"
  ON composicao_detalhada_custom FOR SELECT
  USING (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "composicao_detalhada_custom_insert" ON composicao_detalhada_custom;
CREATE POLICY "composicao_detalhada_custom_insert"
  ON composicao_detalhada_custom FOR INSERT
  WITH CHECK (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "composicao_detalhada_custom_update" ON composicao_detalhada_custom;
CREATE POLICY "composicao_detalhada_custom_update"
  ON composicao_detalhada_custom FOR UPDATE
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "composicao_detalhada_custom_delete" ON composicao_detalhada_custom;
CREATE POLICY "composicao_detalhada_custom_delete"
  ON composicao_detalhada_custom FOR DELETE
  USING (empresa_id = get_user_empresa_id());

COMMENT ON COLUMN composicao_detalhada_custom.empresa_id IS 'Isolamento multi-tenant; customizações visíveis apenas para a empresa.';

-- Se o DROP CONSTRAINT falhar (nome diferente), liste com:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'composicao_detalhada_custom'::regclass AND contype = 'u';
-- e faça: ALTER TABLE composicao_detalhada_custom DROP CONSTRAINT <conname>;
