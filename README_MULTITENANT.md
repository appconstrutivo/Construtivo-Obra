# Construtivo Obra - Sistema SaaS Multitenant

> Sistema de gestão e controle de obras de engenharia civil transformado em SaaS multitenant com isolamento total de dados.

## 🎯 Visão Geral

O **Construtivo Obra** é um sistema completo para gestão de obras de construção civil, agora com arquitetura **SaaS multitenant**, permitindo que múltiplas empresas usem o sistema com **isolamento total de dados**.

### Características Principais

- ✅ **Multitenant com Isolamento Total**: Cada empresa tem seus próprios dados
- ✅ **Sistema de Planos**: 4 planos (Gratuito, Básico, Profissional, Empresarial)
- ✅ **Trial de 15 dias**: Período de teste gratuito
- ✅ **Gerenciamento de Equipe**: Admin + Membros + Visualizadores
- ✅ **Row Level Security (RLS)**: Segurança em nível de banco de dados
- ✅ **Controle de Limites**: Usuários e obras por plano

---

## 📁 Documentação

Toda a documentação está na pasta `docs/`:

### Documentos Principais

1. **[MIGRATION_MULTITENANT.sql](docs/MIGRATION_MULTITENANT.sql)**
   - Script SQL completo para transformar o banco em multitenant
   - 850+ linhas de código
   - Pronto para executar no Supabase

2. **[GUIA_IMPLEMENTACAO_MULTITENANT.md](docs/GUIA_IMPLEMENTACAO_MULTITENANT.md)**
   - Arquitetura detalhada
   - Explicação de RLS e políticas de segurança
   - Fluxos de cadastro e gerenciamento

3. **[IMPLEMENTACAO_FRONTEND_MULTITENANT.md](docs/IMPLEMENTACAO_FRONTEND_MULTITENANT.md)**
   - Código pronto para React/Next.js
   - Contexts, Hooks e Componentes
   - Exemplos práticos de uso

4. **[RESUMO_TRANSFORMACAO_MULTITENANT.md](docs/RESUMO_TRANSFORMACAO_MULTITENANT.md)**
   - Resumo executivo
   - Checklist completo de implementação
   - Estimativa de tempo (21-31 horas)

5. **[ESTRUTURA_BANCO_DADOS.md](docs/ESTRUTURA_BANCO_DADOS.md)**
   - Documentação completa do banco original
   - Todas as 18 tabelas existentes
   - Triggers e funções

---

## 🚀 Como Começar

### Passo 1: Aplicar Migration no Supabase

```bash
# 1. Acesse o Supabase Dashboard
# 2. Vá para SQL Editor
# 3. Copie o conteúdo de docs/MIGRATION_MULTITENANT.sql
# 4. Execute o script
```

**Token de Acesso**: `sbp_57f6145fd339f1c21b533a7399bd273a98f1cd3a`

### Passo 2: Verificar Aplicação

```sql
-- Verificar tabelas criadas
SELECT * FROM public.empresas;
SELECT * FROM public.planos;
SELECT * FROM public.assinaturas;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Passo 3: Implementar Frontend

Siga o guia em `IMPLEMENTACAO_FRONTEND_MULTITENANT.md` para:

1. Criar Contexts (`EmpresaContext`, etc)
2. Criar Hooks (`usePermissao`, `useUsuarios`)
3. Criar páginas de cadastro e gerenciamento
4. Atualizar queries para incluir `empresa_id`

---

## 📊 Estrutura de Dados

### Novas Tabelas

- **`empresas`**: Cadastro de organizações (tenants)
- **`planos`**: 4 planos pré-configurados
- **`assinaturas`**: Controle de assinaturas

### Tabelas Modificadas (18)

Todas receberam:
- Campo `empresa_id` (FK para `empresas.id`)
- Índice em `empresa_id`
- Políticas RLS para isolamento

Lista de tabelas:
- centros_custo
- grupos
- itens_orcamento
- itens_custo
- fornecedores
- negociacoes
- itens_negociacao
- medicoes
- itens_medicao
- pedidos_compra
- itens_pedido_compra
- parcelas_pagamento
- parcelas_pedido_compra
- parcelas_medicao
- obras
- clientes
- parcelas_receber
- usuarios (modificada com role, ativo, convidado_por)

---

## 🔒 Segurança

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS que garantem:

```sql
-- SELECT: Usuário vê apenas dados de sua empresa
USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa())

-- INSERT: Usuário cria apenas para sua empresa
WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa())

-- UPDATE: Usuário atualiza apenas sua empresa
USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa())

-- DELETE: Apenas admins podem deletar
USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin())
```

### Controle de Permissões

| Role | Criar | Editar | Visualizar | Deletar | Gerenciar Usuários |
|------|-------|--------|------------|---------|-------------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Membro** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Visualizador** | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## 💰 Planos Disponíveis

| Plano | Preço Mensal | Usuários | Obras | Funcionalidades |
|-------|--------------|----------|-------|-----------------|
| **Gratuito** | R$ 0,00 | 2 | 1 | Orçamento básico |
| **Básico** | R$ 99,90 | 5 | 3 | + Financeiro + Negociações |
| **Profissional** | R$ 249,90 | 15 | 10 | + Medições + Relatórios avançados |
| **Empresarial** | R$ 499,90 | Ilimitado | Ilimitado | + API + Suporte prioritário |

---

## 📋 Checklist de Implementação

### Banco de Dados
- [ ] Aplicar `MIGRATION_MULTITENANT.sql`
- [ ] Verificar tabelas criadas
- [ ] Verificar políticas RLS

### Frontend - Estrutura
- [ ] Criar `EmpresaContext.tsx`
- [ ] Criar `usePermissao.ts`
- [ ] Criar `useUsuarios.ts`

### Páginas
- [ ] `/cadastro-empresa`
- [ ] `/equipe`
- [ ] `/planos`
- [ ] `/configuracoes-empresa`

### Atualizar Código
- [ ] Adicionar `empresa_id` em todos os inserts
- [ ] Implementar verificações de limite
- [ ] Implementar controle de permissões

### Testes
- [ ] Testar isolamento de dados
- [ ] Testar permissões por role
- [ ] Testar limites de plano

---

## 🛠 Stack Tecnológica

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Autenticação**: Supabase Auth
- **Banco de Dados**: PostgreSQL com Row Level Security (RLS)
- **Hospedagem**: Vercel (frontend) + Supabase (backend)

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a documentação em `docs/`
2. Verifique os logs do Supabase
3. Teste queries SQL diretamente no SQL Editor
4. Consulte [Documentação do Supabase sobre RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

## 📝 Notas Importantes

### Migração de Dados Existentes

Se houver dados no banco atual, será necessário:

1. Criar empresa padrão
2. Atualizar registros existentes com `empresa_id`
3. Criar usuário admin para essa empresa

Veja exemplo em `RESUMO_TRANSFORMACAO_MULTITENANT.md`.

### Performance

- Índices criados automaticamente em `empresa_id`
- Funções marcadas como `STABLE` para cache
- RLS otimizado para performance

### Escalabilidade

- Arquitetura preparada para milhares de empresas
- Isolamento total garante escalabilidade
- Sem interferência entre tenants

---

## 📅 Roadmap

### Fase 1 - Implementação Base (Atual)
- ✅ Estrutura de banco multitenant
- ✅ Políticas RLS
- ✅ Documentação completa

### Fase 2 - Frontend
- [ ] Context e Hooks
- [ ] Páginas de cadastro e gerenciamento
- [ ] Componentes de UI

### Fase 3 - Sistema de Pagamentos
- [ ] Integração com Stripe/PagSeguro
- [ ] Webhooks de pagamento
- [ ] Renovação automática

### Fase 4 - Funcionalidades Avançadas
- [ ] Dashboard de analytics
- [ ] Relatórios customizados
- [ ] API pública
- [ ] Integrações (WhatsApp, Email)

---

## 📄 Licença

Projeto proprietário - Construtivo Obra

---

## 👥 Equipe

Desenvolvido por engenheiros de software especializados em sistemas para construção civil.

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0  
**Status**: ✅ Pronto para Implementação
