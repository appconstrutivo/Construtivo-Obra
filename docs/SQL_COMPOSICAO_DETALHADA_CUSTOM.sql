-- Tabela de customização do detalhamento por composição e estado (UF).
-- Quando o usuário edita o coeficiente de um item, grava aqui.
-- Preço unitário da composição = soma dos coeficientes (ref ou custom) quando há customização.

CREATE TABLE IF NOT EXISTS composicao_detalhada_custom (
  id BIGSERIAL PRIMARY KEY,
  codigo_composicao TEXT NOT NULL,
  estado TEXT NOT NULL,
  codigo_item TEXT NOT NULL,
  coeficiente NUMERIC(12, 4) NOT NULL,
  UNIQUE (codigo_composicao, estado, codigo_item)
);

CREATE INDEX IF NOT EXISTS idx_composicao_detalhada_custom_composicao_estado
  ON composicao_detalhada_custom (codigo_composicao, estado);

COMMENT ON TABLE composicao_detalhada_custom IS 'Coeficientes editados pelo usuário por composição e UF; usado para preço calculado.';
