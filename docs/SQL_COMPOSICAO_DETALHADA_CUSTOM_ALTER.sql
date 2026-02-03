-- Estender composicao_detalhada_custom para suportar inserção e exclusão de itens.
-- tipo_item, descricao, unidade_medida: preenchidos quando o item foi adicionado pelo usuário.
-- excluido: true = item de referência foi excluído do detalhamento pelo usuário.

ALTER TABLE composicao_detalhada_custom
  ADD COLUMN IF NOT EXISTS tipo_item TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS unidade_medida TEXT,
  ADD COLUMN IF NOT EXISTS excluido BOOLEAN DEFAULT false;

COMMENT ON COLUMN composicao_detalhada_custom.tipo_item IS 'Preenchido quando item foi inserido pelo usuário (ex.: COMPOSICAO).';
COMMENT ON COLUMN composicao_detalhada_custom.excluido IS 'true = item de referência foi excluído do detalhamento pelo usuário.';
