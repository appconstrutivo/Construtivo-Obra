-- Tabela Composição Detalhada
-- Itens que compõem cada composição (insumos ou subcomposições).
-- Populada via importação do relatório analítico; coeficiente = preço unitário do item.
-- Preço unitário da composição = soma dos coeficientes dos itens (quando editado pelo usuário).

CREATE TABLE IF NOT EXISTS composicao_detalhada (
  id BIGSERIAL PRIMARY KEY,
  codigo_composicao TEXT NOT NULL,
  tipo_item TEXT NOT NULL,
  codigo_item TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade_medida TEXT NOT NULL,
  coeficiente NUMERIC(12, 4) NOT NULL
);

-- Índice para buscar itens por composição
CREATE INDEX IF NOT EXISTS idx_composicao_detalhada_codigo_composicao
  ON composicao_detalhada (codigo_composicao);

-- Índice para buscar por código do item
CREATE INDEX IF NOT EXISTS idx_composicao_detalhada_codigo_item
  ON composicao_detalhada (codigo_item);

COMMENT ON TABLE composicao_detalhada IS 'Detalhamento das composições SINAPI; itens (insumos/composições) e coeficiente (preço unitário do item).';
