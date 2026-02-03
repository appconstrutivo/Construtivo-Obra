# Importação SINAPI Não Desonerada

Script para popular a tabela `sinapi_nao_desonerada` no Supabase a partir da planilha da CAIXA.

## Pré-requisitos

1. Tabela `sinapi_nao_desonerada` criada no Supabase (execute `docs/SQL_SINAPI_NAO_DESONERADA.sql`).
2. Arquivo `.env.local` na raiz do projeto com:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Planilha `sinapi/nao desonerado.xlsx` com a estrutura:
   - **Coluna A:** Código da Composição  
   - **Coluna B:** Descrição  
   - **Coluna C:** Unidade  
   - **Colunas D em diante:** Custo (R$) por UF, na ordem AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO  
   - **Dados a partir da linha 3**

## Como rodar

Na raiz do projeto:

```bash
npm run sinapi:import
```

Ou diretamente:

```bash
node scripts/import-sinapi.js
```

## Atualização bimestral

1. Baixe a nova planilha no site da CAIXA.
2. Substitua o arquivo `sinapi/nao desonerado.xlsx`.
3. (Opcional) Se quiser manter apenas a base mais recente, apague os dados antigos no Supabase antes de importar (ex.: `DELETE FROM sinapi_nao_desonerada;` no SQL Editor).
4. Execute `npm run sinapi:import`.

## Ajustes no script

- Se a planilha tiver **cabeçalho em outra linha** ou **dados a partir de outra linha**, edite em `scripts/import-sinapi.js`:
  - `DATA_START_ROW`: linha (0-based) em que começam os dados (padrão: 2 = 3ª linha).
- Se a **ordem das UFs** for diferente na planilha, altere o array `UF_ORDER` no script.
