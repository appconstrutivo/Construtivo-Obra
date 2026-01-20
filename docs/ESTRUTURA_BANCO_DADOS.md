# Documentação Completa da Estrutura do Banco de Dados - Construtivo

**Data de Geração:** Janeiro 2025  
**Projeto Original:** Construtivo   
**ID do Projeto Supabase:** 

## Objetivo deste Documento

Este documento contém a especificação completa da estrutura do banco de dados do projeto Construtivo original. Ele deve ser utilizado como referência para recriar a mesma estrutura em uma nova instância do Supabase, mantendo todas as tabelas, colunas, constraints, índices, funções, triggers e políticas RLS.

## Extensões Instaladas

As seguintes extensões estão instaladas no banco:

- `uuid-ossp` (schema: extensions) - v1.1
- `pgcrypto` (schema: extensions) - v1.3
- `pgjwt` (schema: extensions) - v0.2.0
- `pg_stat_statements` (schema: extensions) - v1.10
- `pg_graphql` (schema: graphql) - v1.5.11
- `supabase_vault` (schema: vault) - v0.3.1
- `plpgsql` (schema: pg_catalog) - v1.0

## Tabelas do Banco de Dados

### 1. centros_custo

**Descrição:** Tabela de centros de custo do sistema.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('centros_custo_id_seq'::regclass) | PRIMARY KEY | ID único do centro de custo |
| codigo | varchar(2) | NO | - | UNIQUE | Código único do centro de custo |
| descricao | varchar(255) | NO | - | - | Descrição do centro de custo |
| orcado | numeric | YES | 0.00 | - | Valor orçado |
| custo | numeric | YES | 0.00 | - | Custo total |
| realizado | numeric | YES | 0.00 | - | Valor realizado |
| com_bdi | numeric | YES | 0.00 | - | Valor com BDI |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `grupos.centro_custo_id` → `centros_custo.id` (CASCADE)

**Índices:**
- `centros_custo_pkey` (PRIMARY KEY em `id`)
- `centros_custo_codigo_unique` (UNIQUE em `codigo`)

---

### 2. grupos

**Descrição:** Grupos dentro de centros de custo.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('grupos_id_seq'::regclass) | PRIMARY KEY | ID único do grupo |
| centro_custo_id | integer | NO | - | FOREIGN KEY | Referência ao centro de custo |
| codigo | varchar(5) | NO | - | UNIQUE (codigo, centro_custo_id) | Código do grupo (único por centro de custo) |
| descricao | varchar(255) | NO | - | - | Descrição do grupo |
| orcado | numeric | YES | 0.00 | - | Valor orçado |
| custo | numeric | YES | 0.00 | - | Custo total |
| realizado | numeric | YES | 0.00 | - | Valor realizado |
| com_bdi | numeric | YES | 0.00 | - | Valor com BDI |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `grupos.centro_custo_id` → `centros_custo.id` (CASCADE)
- `itens_custo.grupo_id` → `grupos.id` (CASCADE)
- `itens_orcamento.grupo_id` → `grupos.id` (CASCADE)

**Índices:**
- `grupos_pkey` (PRIMARY KEY em `id`)
- `grupos_codigo_centro_custo_id_unique` (UNIQUE em `codigo, centro_custo_id`)

---

### 3. itens_orcamento

**Descrição:** Itens de orçamento dentro de grupos.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('itens_orcamento_id_seq'::regclass) | PRIMARY KEY | ID único do item |
| grupo_id | integer | NO | - | FOREIGN KEY | Referência ao grupo |
| codigo | varchar | NO | - | - | Código do item |
| descricao | varchar | NO | - | - | Descrição do item |
| unidade | varchar | NO | - | - | Unidade de medida |
| quantidade | numeric | YES | 0.00 | - | Quantidade |
| preco_unitario | numeric | YES | 0.00 | - | Preço unitário |
| total | numeric | YES | 0.00 | - | Total |
| com_bdi | numeric | YES | 0.00 | - | Valor com BDI |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `itens_orcamento.grupo_id` → `grupos.id` (CASCADE)
- `itens_custo.item_orcamento_id` → `itens_orcamento.id` (SET NULL)

**Índices:**
- `itens_orcamento_pkey` (PRIMARY KEY em `id`)

**Triggers:**
- `after_item_orcamento_change` (AFTER INSERT/UPDATE/DELETE) → `update_grupo_from_item_orcamento()`
- `update_itens_orcamento_timestamp` (BEFORE UPDATE) → `update_itens_orcamento_timestamp()`

---

### 4. itens_custo

**Descrição:** Itens de custo dentro de grupos.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('itens_custo_id_seq'::regclass) | PRIMARY KEY | ID único do item |
| grupo_id | integer | NO | - | FOREIGN KEY | Referência ao grupo |
| item_orcamento_id | integer | YES | - | FOREIGN KEY | Referência ao item de orçamento (opcional) |
| codigo | varchar | NO | - | - | Código do item |
| descricao | varchar | NO | - | - | Descrição do item |
| unidade | varchar | NO | - | - | Unidade de medida |
| quantidade | numeric | YES | 0.00 | - | Quantidade |
| preco_unitario | numeric | YES | 0.00 | - | Preço unitário |
| total | numeric | YES | 0.00 | - | Total |
| realizado | numeric | YES | 0.00 | - | Valor realizado |
| realizado_percentual | numeric | YES | 0.00 | - | Percentual realizado |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `itens_custo.grupo_id` → `grupos.id` (CASCADE)
- `itens_custo.item_orcamento_id` → `itens_orcamento.id` (SET NULL)
- `itens_negociacao.item_custo_id` → `itens_custo.id` (NO ACTION)
- `itens_pedido_compra.item_custo_id` → `itens_custo.id` (SET NULL)

**Índices:**
- `itens_custo_pkey` (PRIMARY KEY em `id`)

**Triggers:**
- `after_item_custo_change` (AFTER INSERT/UPDATE/DELETE) → `update_grupo_from_item_custo()`
- `trigger_calcular_percentual_realizado` (BEFORE INSERT/UPDATE) → `calcular_percentual_realizado()`
- `update_itens_custo_timestamp` (BEFORE UPDATE) → `update_itens_custo_timestamp()`

---

### 5. fornecedores

**Descrição:** Cadastro de fornecedores.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('fornecedores_id_seq'::regclass) | PRIMARY KEY | ID único do fornecedor |
| codigo | varchar | NO | - | UNIQUE | Código único do fornecedor |
| nome | varchar | NO | - | - | Nome do fornecedor |
| documento | varchar | NO | - | - | CPF/CNPJ |
| contato | varchar | YES | - | - | Nome do contato |
| telefone | varchar | YES | - | - | Telefone |
| email | varchar | YES | - | - | Email |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `negociacoes.fornecedor_id` → `fornecedores.id` (NO ACTION)
- `pedidos_compra.fornecedor_id` → `fornecedores.id` (CASCADE)

**Índices:**
- `fornecedores_pkey` (PRIMARY KEY em `id`)
- `fornecedores_codigo_key` (UNIQUE em `codigo`)

---

### 6. negociacoes

**Descrição:** Negociações com fornecedores.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('negociacoes_id_seq'::regclass) | PRIMARY KEY | ID único da negociação |
| numero | varchar | NO | - | - | Número da negociação |
| tipo | varchar | NO | - | - | Tipo da negociação |
| fornecedor_id | integer | NO | - | FOREIGN KEY | Referência ao fornecedor |
| descricao | varchar | NO | - | - | Descrição |
| data_inicio | date | NO | - | - | Data de início |
| data_fim | date | YES | - | - | Data de fim |
| obra | varchar | YES | - | - | Nome da obra |
| engenheiro_responsavel | varchar | YES | - | - | Nome do engenheiro |
| valor_total | numeric | YES | 0.00 | - | Valor total |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `negociacoes.fornecedor_id` → `fornecedores.id` (NO ACTION)
- `itens_negociacao.negociacao_id` → `negociacoes.id` (CASCADE)
- `medicoes.negociacao_id` → `negociacoes.id` (CASCADE)
- `parcelas_pagamento.negociacao_id` → `negociacoes.id` (CASCADE)

**Índices:**
- `negociacoes_pkey` (PRIMARY KEY em `id`)

---

### 7. itens_negociacao

**Descrição:** Itens de uma negociação.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('itens_negociacao_id_seq'::regclass) | PRIMARY KEY | ID único do item |
| negociacao_id | integer | NO | - | FOREIGN KEY | Referência à negociação |
| item_custo_id | integer | YES | - | FOREIGN KEY | Referência ao item de custo (opcional) |
| descricao | varchar | NO | - | - | Descrição do item |
| unidade | varchar | NO | - | - | Unidade de medida |
| quantidade | numeric | NO | 0 | - | Quantidade |
| valor_unitario | numeric | NO | 0 | - | Valor unitário |
| valor_total | numeric | NO | 0 | - | Valor total |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `itens_negociacao.negociacao_id` → `negociacoes.id` (CASCADE)
- `itens_negociacao.item_custo_id` → `itens_custo.id` (NO ACTION)
- `itens_medicao.item_negociacao_id` → `itens_negociacao.id` (CASCADE)

**Índices:**
- `itens_negociacao_pkey` (PRIMARY KEY em `id`)

---

### 8. medicoes

**Descrição:** Medições de obras.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('medicoes_id_seq'::regclass) | PRIMARY KEY | ID único da medição |
| negociacao_id | integer | NO | - | FOREIGN KEY | Referência à negociação |
| data_inicio | date | NO | - | - | Data de início do período |
| data_fim | date | NO | - | - | Data de fim do período |
| valor_total | numeric | YES | 0 | - | Valor total da medição |
| status | text | NO | 'Pendente' | - | Status da medição |
| desconto | numeric | YES | 0 | - | Valor de desconto |
| observacao | text | YES | - | - | Observações |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `medicoes.negociacao_id` → `negociacoes.id` (CASCADE)
- `itens_medicao.medicao_id` → `medicoes.id` (CASCADE)
- `parcelas_medicao.medicao_id` → `medicoes.id` (CASCADE)

**Índices:**
- `medicoes_pkey` (PRIMARY KEY em `id`)

---

### 9. itens_medicao

**Descrição:** Itens de uma medição.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('itens_medicao_id_seq'::regclass) | PRIMARY KEY | ID único do item |
| medicao_id | integer | NO | - | FOREIGN KEY | Referência à medição |
| item_negociacao_id | integer | NO | - | FOREIGN KEY | Referência ao item da negociação |
| descricao | text | NO | - | - | Descrição do item |
| unidade | text | NO | - | - | Unidade de medida |
| quantidade_total | numeric | NO | - | - | Quantidade total |
| quantidade_medida | numeric | NO | - | - | Quantidade medida |
| percentual_executado | numeric | NO | - | - | Percentual executado |
| valor_unitario | numeric | NO | - | - | Valor unitário |
| valor_total | numeric | NO | - | - | Valor total |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `itens_medicao.medicao_id` → `medicoes.id` (CASCADE)
- `itens_medicao.item_negociacao_id` → `itens_negociacao.id` (CASCADE)

**Índices:**
- `itens_medicao_pkey` (PRIMARY KEY em `id`)

---

### 10. pedidos_compra

**Descrição:** Pedidos de compra.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('pedidos_compra_id_seq'::regclass) | PRIMARY KEY | ID único do pedido |
| fornecedor_id | integer | NO | - | FOREIGN KEY | Referência ao fornecedor |
| data_compra | date | NO | - | - | Data da compra |
| valor_total | numeric | NO | 0 | - | Valor total |
| status | varchar(20) | NO | 'Pendente' | - | Status do pedido |
| observacoes | text | YES | - | - | Observações |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `pedidos_compra.fornecedor_id` → `fornecedores.id` (CASCADE)
- `itens_pedido_compra.pedido_compra_id` → `pedidos_compra.id` (CASCADE)
- `parcelas_pedido_compra.pedido_compra_id` → `pedidos_compra.id` (CASCADE)

**Índices:**
- `pedidos_compra_pkey` (PRIMARY KEY em `id`)
- `idx_pedidos_compra_fornecedor_id` (em `fornecedor_id`)

---

### 11. itens_pedido_compra

**Descrição:** Itens de um pedido de compra.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('itens_pedido_compra_id_seq'::regclass) | PRIMARY KEY | ID único do item |
| pedido_compra_id | integer | NO | - | FOREIGN KEY | Referência ao pedido |
| item_custo_id | integer | YES | - | FOREIGN KEY | Referência ao item de custo (opcional) |
| descricao | varchar(255) | NO | - | - | Descrição do item |
| unidade | varchar(20) | NO | - | - | Unidade de medida |
| quantidade | numeric | NO | 0 | - | Quantidade |
| valor_unitario | numeric | NO | 0 | - | Valor unitário |
| valor_total | numeric | NO | 0 | - | Valor total |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `itens_pedido_compra.pedido_compra_id` → `pedidos_compra.id` (CASCADE)
- `itens_pedido_compra.item_custo_id` → `itens_custo.id` (SET NULL)

**Índices:**
- `itens_pedido_compra_pkey` (PRIMARY KEY em `id`)
- `idx_itens_pedido_compra_pedido_id` (em `pedido_compra_id`)
- `idx_itens_pedido_compra_item_custo_id` (em `item_custo_id`)

---

### 12. parcelas_pagamento

**Descrição:** Parcelas de pagamento (contas a pagar) relacionadas a negociações.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('parcelas_pagamento_id_seq'::regclass) | PRIMARY KEY | ID único da parcela |
| negociacao_id | integer | NO | - | FOREIGN KEY | Referência à negociação |
| data_prevista | date | NO | - | - | Data prevista para pagamento |
| valor | numeric | NO | 0 | - | Valor da parcela |
| descricao | text | YES | - | - | Descrição da parcela |
| status | varchar(20) | YES | 'Pendente' | - | Status da parcela |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `parcelas_pagamento.negociacao_id` → `negociacoes.id` (CASCADE)

**Índices:**
- `parcelas_pagamento_pkey` (PRIMARY KEY em `id`)

---

### 13. parcelas_pedido_compra

**Descrição:** Parcelas de pagamento relacionadas a pedidos de compra.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('parcelas_pedido_compra_id_seq'::regclass) | PRIMARY KEY | ID único da parcela |
| pedido_compra_id | integer | NO | - | FOREIGN KEY | Referência ao pedido de compra |
| data_prevista | date | NO | - | - | Data prevista para pagamento |
| valor | numeric | NO | 0 | - | Valor da parcela |
| descricao | text | YES | - | - | Descrição da parcela |
| status | varchar(50) | YES | 'Pendente' | - | Status da parcela |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `parcelas_pedido_compra.pedido_compra_id` → `pedidos_compra.id` (CASCADE)

**Índices:**
- `parcelas_pedido_compra_pkey` (PRIMARY KEY em `id`)
- `idx_parcelas_pedido_compra_pedido_id` (em `pedido_compra_id`)
- `idx_parcelas_pedido_compra_data_prevista` (em `data_prevista`)

---

### 14. parcelas_medicao

**Descrição:** Parcelas de pagamento relacionadas a medições.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('parcelas_medicao_id_seq'::regclass) | PRIMARY KEY | ID único da parcela |
| medicao_id | integer | NO | - | FOREIGN KEY | Referência à medição |
| data_prevista | date | NO | - | - | Data prevista para desembolso |
| valor | numeric | NO | 0 | - | Valor da parcela |
| descricao | text | YES | - | - | Descrição da parcela |
| status | varchar | YES | 'Pendente' | - | Status da parcela |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `parcelas_medicao.medicao_id` → `medicoes.id` (CASCADE)

**Índices:**
- `parcelas_medicao_pkey` (PRIMARY KEY em `id`)
- `idx_parcelas_medicao_medicao_id` (em `medicao_id`)
- `idx_parcelas_medicao_data_prevista` (em `data_prevista`)

---

### 15. usuarios

**Descrição:** Usuários do sistema (vinculados ao auth.users do Supabase).

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | uuid | NO | - | PRIMARY KEY, FOREIGN KEY | ID do usuário (vinculado a auth.users) |
| nome | varchar | NO | - | - | Nome do usuário |
| email | varchar | NO | - | UNIQUE | Email do usuário |
| cargo | varchar | YES | - | - | Cargo do usuário |
| empresa | varchar | YES | - | - | Empresa do usuário |
| avatar_url | varchar | YES | - | - | URL do avatar |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |
| ultimo_acesso | timestamptz | YES | now() | - | Data do último acesso |

**Relacionamentos:**
- `usuarios.id` → `auth.users.id` (FOREIGN KEY)
- `obras.usuario_id` → `usuarios.id` (NO ACTION)

**Índices:**
- `usuarios_pkey` (PRIMARY KEY em `id`)
- `usuarios_email_key` (UNIQUE em `email`)

**RLS (Row Level Security):** Habilitado

**Políticas RLS:**
- **SELECT:** Usuários podem ver seus próprios dados (`auth.uid() = id`)
- **UPDATE:** Usuários podem atualizar seus próprios dados (`auth.uid() = id`)

---

### 16. obras

**Descrição:** Cadastro de obras.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | integer | NO | nextval('obras_id_seq'::regclass) | PRIMARY KEY | ID único da obra |
| nome | varchar(255) | NO | - | - | Nome da obra |
| endereco | text | YES | - | - | Endereço da obra |
| responsavel_tecnico | varchar(255) | YES | - | - | Nome do responsável técnico |
| crea | varchar(50) | YES | - | - | Número do CREA |
| data_inicio | date | YES | - | - | Data de início |
| data_prevista_fim | date | YES | - | - | Data prevista de término |
| area_construida | numeric | YES | - | - | Área construída (m²) |
| orcamento_total | numeric | YES | 0.00 | - | Orçamento total |
| status | varchar(50) | YES | 'Em andamento' | - | Status da obra |
| observacoes | text | YES | - | - | Observações |
| cliente | text | YES | - | - | Nome do cliente |
| usuario_id | uuid | YES | - | FOREIGN KEY | Referência ao usuário responsável |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `obras.usuario_id` → `usuarios.id` (NO ACTION)

**Índices:**
- `obras_pkey` (PRIMARY KEY em `id`)

---

### 17. clientes

**Descrição:** Tabela de clientes e investidores do sistema.

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | bigint | NO | nextval('clientes_id_seq'::regclass) | PRIMARY KEY | ID único do cliente |
| codigo | varchar(50) | NO | - | UNIQUE | Código único do cliente |
| nome | varchar(255) | NO | - | - | Nome do cliente |
| tipo | varchar(50) | NO | - | CHECK | Tipo: 'Pessoa Física', 'Pessoa Jurídica' ou 'Investidor' |
| documento | varchar(20) | NO | - | UNIQUE | CPF ou CNPJ |
| contato | varchar(255) | YES | - | - | Nome do contato |
| telefone | varchar(20) | YES | - | - | Telefone |
| email | varchar(255) | YES | - | - | Email |
| endereco | text | YES | - | - | Endereço |
| observacoes | text | YES | - | - | Observações |
| ativo | boolean | YES | true | - | Indica se o cliente está ativo |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `parcelas_receber.cliente_id` → `clientes.id` (CASCADE)

**Índices:**
- `clientes_pkey` (PRIMARY KEY em `id`)
- `clientes_codigo_key` (UNIQUE em `codigo`)
- `clientes_documento_key` (UNIQUE em `documento`)
- `idx_clientes_codigo` (em `codigo`)
- `idx_clientes_documento` (em `documento`)
- `idx_clientes_ativo` (em `ativo`)

---

### 18. parcelas_receber

**Descrição:** Tabela de contas a receber (receitas).

| Coluna | Tipo | Nullable | Default | Constraint | Descrição |
|--------|------|----------|---------|------------|-----------|
| id | bigint | NO | nextval('parcelas_receber_id_seq'::regclass) | PRIMARY KEY | ID único da parcela |
| cliente_id | bigint | NO | - | FOREIGN KEY | Referência ao cliente |
| descricao | text | NO | - | - | Descrição da parcela |
| valor | numeric | NO | - | CHECK (valor > 0) | Valor da parcela |
| data_vencimento | date | NO | - | - | Data de vencimento |
| data_recebimento | date | YES | - | - | Data de recebimento |
| status | varchar(50) | NO | 'Pendente' | CHECK | Status: 'Pendente', 'Recebido', 'Atrasado' ou 'Cancelado' |
| forma_recebimento | varchar(100) | YES | - | - | Forma: Dinheiro, PIX, Transferência, Boleto, etc |
| categoria | varchar(100) | YES | - | - | Categoria: Medição, Adiantamento, Reembolso, etc |
| observacoes | text | YES | - | - | Observações |
| numero_documento | varchar(100) | YES | - | - | Número do documento |
| created_at | timestamptz | YES | now() | - | Data de criação |
| updated_at | timestamptz | YES | now() | - | Data de atualização |

**Relacionamentos:**
- `parcelas_receber.cliente_id` → `clientes.id` (CASCADE)

**Índices:**
- `parcelas_receber_pkey` (PRIMARY KEY em `id`)
- `idx_parcelas_receber_cliente` (em `cliente_id`)
- `idx_parcelas_receber_vencimento` (em `data_vencimento`)
- `idx_parcelas_receber_status` (em `status`)
- `idx_parcelas_receber_categoria` (em `categoria`)

---

## Funções Armazenadas (Stored Functions)

### 1. calcular_percentual_realizado()

**Tipo:** Trigger Function  
**Descrição:** Calcula o percentual realizado baseado nos valores de `realizado` e `total`.

```sql
CREATE OR REPLACE FUNCTION public.calcular_percentual_realizado()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Calcular o percentual baseado nos valores atuais
    IF NEW.total > 0 THEN
        NEW.realizado_percentual = (NEW.realizado / NEW.total * 100);
    ELSE
        NEW.realizado_percentual = 0;
    END IF;
    
    RETURN NEW;
END;
$function$
```

**Uso:** Trigger BEFORE INSERT/UPDATE na tabela `itens_custo`

---

### 2. calcular_saldo(orcado numeric, realizado numeric)

**Tipo:** Function  
**Descrição:** Calcula o saldo (diferença entre orçado e realizado).

```sql
CREATE OR REPLACE FUNCTION public.calcular_saldo(orcado numeric, realizado numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN orcado - realizado;
END;
$function$
```

---

### 3. handle_new_user()

**Tipo:** Trigger Function (SECURITY DEFINER)  
**Descrição:** Cria um registro na tabela `usuarios` quando um novo usuário é criado no `auth.users`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.usuarios (id, nome, email)
  VALUES (new.id, new.raw_user_meta_data->>'nome', new.email);
  RETURN new;
END;
$function$
```

**Nota:** Esta função deve ter um trigger no `auth.users` (gerenciado pelo Supabase).

---

### 4. recalcular_todos_percentuais_itens_custo()

**Tipo:** Function  
**Descrição:** Recalcula todos os percentuais realizados da tabela `itens_custo`.

```sql
CREATE OR REPLACE FUNCTION public.recalcular_todos_percentuais_itens_custo()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    itens_atualizados INTEGER;
BEGIN
    UPDATE itens_custo 
    SET realizado_percentual = CASE 
        WHEN total > 0 THEN (realizado / total * 100)
        ELSE 0 
    END;
    
    GET DIAGNOSTICS itens_atualizados = ROW_COUNT;
    
    RETURN 'Percentuais recalculados para ' || itens_atualizados || ' itens.';
END;
$function$
```

---

### 5. update_grupo_from_item_custo()

**Tipo:** Trigger Function  
**Descrição:** Atualiza os valores de `custo` e `realizado` do grupo quando itens de custo são modificados.

```sql
CREATE OR REPLACE FUNCTION public.update_grupo_from_item_custo()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_grupo_id INTEGER;
  v_custo NUMERIC;
  v_realizado NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_grupo_id := OLD.grupo_id;
  ELSE
    v_grupo_id := NEW.grupo_id;
  END IF;
  
  -- Calcular o total de custo e realizado de todos os itens_custo do grupo
  SELECT 
    COALESCE(SUM(total), 0),
    COALESCE(SUM(realizado), 0)
  INTO v_custo, v_realizado
  FROM itens_custo
  WHERE grupo_id = v_grupo_id;
  
  -- Atualizar o grupo
  UPDATE grupos
  SET custo = v_custo,
      realizado = v_realizado,
      updated_at = now()
  WHERE id = v_grupo_id;
  
  RETURN NULL;
END;
$function$
```

**Uso:** Trigger AFTER INSERT/UPDATE/DELETE na tabela `itens_custo`

---

### 6. update_grupo_from_item_orcamento()

**Tipo:** Trigger Function  
**Descrição:** Atualiza os valores de `orcado` e `com_bdi` do grupo quando itens de orçamento são modificados.

```sql
CREATE OR REPLACE FUNCTION public.update_grupo_from_item_orcamento()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_grupo_id INTEGER;
  v_orcado NUMERIC;
  v_com_bdi NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_grupo_id := OLD.grupo_id;
  ELSE
    v_grupo_id := NEW.grupo_id;
  END IF;
  
  -- Calcular o total de orcado e com_bdi de todos os itens_orcamento do grupo
  SELECT 
    COALESCE(SUM(total), 0),
    COALESCE(SUM(com_bdi), 0)
  INTO v_orcado, v_com_bdi
  FROM itens_orcamento
  WHERE grupo_id = v_grupo_id;
  
  -- Atualizar o grupo
  UPDATE grupos
  SET orcado = v_orcado,
      com_bdi = v_com_bdi,
      updated_at = now()
  WHERE id = v_grupo_id;
  
  RETURN NULL;
END;
$function$
```

**Uso:** Trigger AFTER INSERT/UPDATE/DELETE na tabela `itens_orcamento`

---

### 7. update_itens_custo_timestamp()

**Tipo:** Trigger Function  
**Descrição:** Atualiza o campo `updated_at` da tabela `itens_custo`.

```sql
CREATE OR REPLACE FUNCTION public.update_itens_custo_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
```

**Uso:** Trigger BEFORE UPDATE na tabela `itens_custo`

---

### 8. update_itens_orcamento_timestamp()

**Tipo:** Trigger Function  
**Descrição:** Atualiza o campo `updated_at` da tabela `itens_orcamento`.

```sql
CREATE OR REPLACE FUNCTION public.update_itens_orcamento_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
```

**Uso:** Trigger BEFORE UPDATE na tabela `itens_orcamento`

---

## Triggers

| Nome | Tabela | Evento | Timing | Função |
|------|--------|--------|--------|--------|
| after_item_custo_change | itens_custo | INSERT/UPDATE/DELETE | AFTER | update_grupo_from_item_custo() |
| trigger_calcular_percentual_realizado | itens_custo | INSERT/UPDATE | BEFORE | calcular_percentual_realizado() |
| update_itens_custo_timestamp | itens_custo | UPDATE | BEFORE | update_itens_custo_timestamp() |
| after_item_orcamento_change | itens_orcamento | INSERT/UPDATE/DELETE | AFTER | update_grupo_from_item_orcamento() |
| update_itens_orcamento_timestamp | itens_orcamento | UPDATE | BEFORE | update_itens_orcamento_timestamp() |

---

## Políticas RLS (Row Level Security)

Apenas a tabela `usuarios` possui RLS habilitado:

### Tabela: usuarios

**Política 1: Usuários podem ver seus próprios dados**
- **Comando:** SELECT
- **Permissivo:** PERMISSIVE
- **Roles:** public
- **Qual:** `(auth.uid() = id)`

**Política 2: Usuários podem atualizar seus próprios dados**
- **Comando:** UPDATE
- **Permissivo:** PERMISSIVE
- **Roles:** public
- **Qual:** `(auth.uid() = id)`

---

## Sequences (Auto-increment)

As seguintes sequences são utilizadas para IDs auto-incrementais:

1. `centros_custo_id_seq`
2. `grupos_id_seq`
3. `itens_orcamento_id_seq`
4. `itens_custo_id_seq`
5. `fornecedores_id_seq`
6. `negociacoes_id_seq`
7. `itens_negociacao_id_seq`
8. `medicoes_id_seq`
9. `itens_medicao_id_seq`
10. `pedidos_compra_id_seq`
11. `itens_pedido_compra_id_seq`
12. `parcelas_pagamento_id_seq`
13. `parcelas_pedido_compra_id_seq`
14. `obras_id_seq`
15. `parcelas_medicao_id_seq`
16. `clientes_id_seq` (bigint)
17. `parcelas_receber_id_seq` (bigint)

---

## Ordem Recomendada de Criação

Para recriar o banco de dados, siga esta ordem:

1. Criar extensões necessárias
2. Criar tabelas na seguinte ordem:
   - `centros_custo`
   - `grupos`
   - `itens_orcamento`
   - `itens_custo`
   - `fornecedores`
   - `negociacoes`
   - `itens_negociacao`
   - `medicoes`
   - `itens_medicao`
   - `pedidos_compra`
   - `itens_pedido_compra`
   - `parcelas_pagamento`
   - `parcelas_pedido_compra`
   - `usuarios` (vinculada a auth.users)
   - `obras`
   - `parcelas_medicao`
   - `clientes`
   - `parcelas_receber`
3. Criar foreign keys
4. Criar índices
5. Criar funções armazenadas
6. Criar triggers
7. Configurar políticas RLS na tabela `usuarios`
8. Criar trigger no `auth.users` para `handle_new_user()` (se aplicável)

---

## Observações Importantes

1. **Tabela usuarios:** A coluna `id` é do tipo UUID e faz referência a `auth.users.id`. Esta relação é fundamental para a integração com o sistema de autenticação do Supabase.

2. **RLS:** Apenas a tabela `usuarios` possui Row Level Security habilitado no momento. As demais tabelas não possuem isolamento por usuário no nível do banco.

3. **Cascading deletes:** Muitas foreign keys possuem `ON DELETE CASCADE`, o que significa que a exclusão de um registro pai excluirá automaticamente os registros filhos.

4. **Valores padrão:** Muitas colunas numéricas possuem valor padrão `0.00` ou `0`, e colunas de timestamp possuem `now()`.

5. **CHECK constraints:** Algumas tabelas possuem constraints CHECK:
   - `clientes.tipo`: deve ser 'Pessoa Física', 'Pessoa Jurídica' ou 'Investidor'
   - `parcelas_receber.valor`: deve ser maior que 0
   - `parcelas_receber.status`: deve ser 'Pendente', 'Recebido', 'Atrasado' ou 'Cancelado'

6. **Unicidade:** Várias colunas possuem constraints UNIQUE:
   - `centros_custo.codigo`
   - `fornecedores.codigo`
   - `usuarios.email`
   - `clientes.codigo`
   - `clientes.documento`
   - `grupos.codigo + centro_custo_id` (único por centro de custo)

---

## Migrations Disponíveis

O banco possui as seguintes migrations (para referência):

1. criar_tabela_itens (20250508011510)
2. create_centros_custo_table (20250508041357)
3. create_grupos_table (20250508050358)
4. criar_tabela_fornecedores (20250509051630)
5. criar_tabela_negociacoes (20250509054103)
6. criar_tabela_itens_negociacao (20250509054118)
7. create_medicoes_tables (20250509112839)
8. create_pedidos_compra_tables (20250513012500)
9. criar_tabela_parcelas_pagamento (20250513061446)
10. create_usuarios_table (20250514123451)
11. create_avatars_bucket (20250514124543)
12. adicionar_coluna_observacoes_pedidos_compra (20250517101258)
13. create_obras_table (20250518090245)
14. add_cliente_column_to_obras (20250519111841)
15. add_desconto_column_to_medicoes (20250519123338)
16. add_observacao_column_to_medicoes (20250519123358)
17. create_parcelas_pedido_compra_table (20250528032210)
18. add_ultimo_acesso_column (20250529010857)
19. corrigir_calculo_percentual_realizado (20250708013755)
20. funcao_recalcular_percentuais_manuais (20250708013930)
21. create_parcelas_medicao_table (20251005111450)
22. create_clientes_table (20251005120325)
23. create_parcelas_receber_table (20251005120343)

---

**Fim da Documentação**
