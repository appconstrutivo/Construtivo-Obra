-- Tabela de preço unitário dos insumos por UF (SINAPI).
-- Usada no cálculo analítico: preço da composição = Σ (coeficiente × preço unitário do item).
-- Populada via importação da planilha insumo_preco_unitario.xlsx.

CREATE TABLE IF NOT EXISTS insumo_preco_unitario (
  id BIGSERIAL PRIMARY KEY,
  codigo_insumo TEXT NOT NULL,
  classificacao TEXT,
  descricao TEXT NOT NULL,
  unidade_medida TEXT NOT NULL,
  origem_preco TEXT,
  -- Preços por UF (R$)
  ac_custo NUMERIC(12, 2),
  al_custo NUMERIC(12, 2),
  am_custo NUMERIC(12, 2),
  ap_custo NUMERIC(12, 2),
  ba_custo NUMERIC(12, 2),
  ce_custo NUMERIC(12, 2),
  df_custo NUMERIC(12, 2),
  es_custo NUMERIC(12, 2),
  go_custo NUMERIC(12, 2),
  ma_custo NUMERIC(12, 2),
  mg_custo NUMERIC(12, 2),
  ms_custo NUMERIC(12, 2),
  mt_custo NUMERIC(12, 2),
  pa_custo NUMERIC(12, 2),
  pb_custo NUMERIC(12, 2),
  pe_custo NUMERIC(12, 2),
  pi_custo NUMERIC(12, 2),
  pr_custo NUMERIC(12, 2),
  rj_custo NUMERIC(12, 2),
  rn_custo NUMERIC(12, 2),
  ro_custo NUMERIC(12, 2),
  rr_custo NUMERIC(12, 2),
  rs_custo NUMERIC(12, 2),
  sc_custo NUMERIC(12, 2),
  se_custo NUMERIC(12, 2),
  sp_custo NUMERIC(12, 2),
  to_custo NUMERIC(12, 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insumo_preco_unitario_codigo
  ON insumo_preco_unitario (codigo_insumo);

COMMENT ON TABLE insumo_preco_unitario IS 'Preços unitários dos insumos SINAPI por UF; usado no cálculo analítico das composições.';
