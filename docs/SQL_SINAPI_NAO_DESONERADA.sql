-- Tabela SINAPI Não Desonerada
-- Composições com custos por UF (27 estados).
-- Atualizada a cada 2 meses via importação da planilha CAIXA.

CREATE TABLE IF NOT EXISTS sinapi_nao_desonerada (
  id BIGSERIAL PRIMARY KEY,
  codigo_composicao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade_medida TEXT NOT NULL,
  -- Custos por UF (R$)
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

-- Índices para busca por código e descrição (tela de orçamento)
CREATE INDEX IF NOT EXISTS idx_sinapi_nao_desonerada_codigo
  ON sinapi_nao_desonerada (codigo_composicao);

CREATE INDEX IF NOT EXISTS idx_sinapi_nao_desonerada_descricao
  ON sinapi_nao_desonerada USING gin (to_tsvector('portuguese', descricao));

COMMENT ON TABLE sinapi_nao_desonerada IS 'Composições SINAPI não desonerada; custos por UF; atualização bimestral.';
