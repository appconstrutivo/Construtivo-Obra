# Importação – Insumo Preço Unitário

## Objetivo

Popular a tabela `insumo_preco_unitario` no Supabase a partir da planilha SINAPI **insumo_preco_unitario.xlsx**, que contém os preços unitários dos insumos por UF. Esses dados são usados no **cálculo analítico** do preço da composição:

**Preço unitário da composição = Σ (coeficiente do item × preço unitário do item)**

- Itens do tipo **COMPOSICAO**: preço em `sinapi_nao_desonerada`.
- Itens do tipo **INSUMO**: preço em `insumo_preco_unitario`.

## Pré-requisitos

1. **Criar a tabela** no Supabase (uma vez), executando o SQL em `docs/SQL_INSUMO_PRECO_UNITARIO.sql` no SQL Editor do projeto.
2. Arquivo **sinapi/insumo_preco_unitario.xlsx** na raiz do projeto (planilha com Classificação, Código do Insumo, Descrição, Unidade, Origem de Preço e colunas de preço por UF: AC, AL, ..., TO).
3. `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Execução

```bash
npm run insumo-preco-unitario:import
```

O script usa **upsert** por `codigo_insumo`, então pode ser reexecutado para atualizar registros existentes ou incluir novos.

## Estrutura da planilha

- **Linha 0:** Título (ignorada).
- **Linha 1:** Cabeçalhos: Classificação, Código do Insumo, Descrição do Insumo, Unidade, Origem de Preço, AC, AL, AM, ..., TO.
- **Linha 2 em diante:** Dados (uma linha por insumo).

Colunas de preço: índices 5 a 31 (AC a TO).
