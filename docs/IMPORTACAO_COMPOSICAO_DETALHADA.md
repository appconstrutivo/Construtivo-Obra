# Importação Composição Detalhada

Script para popular a tabela `composicao_detalhada` no Supabase a partir do Relatório Analítico de Composições (Excel).

## Pré-requisitos

1. Tabela `composicao_detalhada` criada no Supabase (execute `docs/SQL_COMPOSICAO_DETALHADA.sql`).
2. Para edição de coeficientes na tela de orçamento: tabela `composicao_detalhada_custom` (execute `docs/SQL_COMPOSICAO_DETALHADA_CUSTOM.sql`).
2. Arquivo `.env.local` na raiz do projeto com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Planilha `sinapi/composicao_detalhada.xlsx` com a estrutura:
   - **Coluna A:** Grupo (não importada)
   - **Coluna B:** Código da Composição
   - **Coluna C:** Tipo Item (COMPOSICAO ou INSUMO)
   - **Coluna D:** Código do Item
   - **Coluna E:** Descrição
   - **Coluna F:** Unidade
   - **Coluna G:** Coeficiente
   - **Dados a partir da linha 3** – importa apenas linhas em que Tipo Item = COMPOSICAO ou INSUMO

## Como rodar

Na raiz do projeto:

```bash
npm run composicao-detalhada:import
```

Ou:

```bash
node scripts/import-composicao-detalhada.js
```

## Atualização bimestral

1. Substitua o arquivo `sinapi/composicao_detalhada.xlsx` pelo novo relatório analítico.
2. (Opcional) Se quiser apenas a base mais recente: `DELETE FROM composicao_detalhada;` no SQL Editor do Supabase.
3. Execute `npm run composicao-detalhada:import`.
