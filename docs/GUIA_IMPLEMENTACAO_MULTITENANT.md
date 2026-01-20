# Guia de Implementação Multitenant - Construtivo Obra

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura Multitenant](#arquitetura-multitenant)
3. [Como Aplicar a Migration](#como-aplicar-a-migration)
4. [Estrutura de Dados](#estrutura-de-dados)
5. [Políticas de Segurança (RLS)](#políticas-de-segurança-rls)
6. [Fluxo de Cadastro de Empresas](#fluxo-de-cadastro-de-empresas)
7. [Gerenciamento de Usuários](#gerenciamento-de-usuários)
8. [Sistema de Planos](#sistema-de-planos)
9. [Integração com o Frontend](#integração-com-o-frontend)
10. [Testes e Validação](#testes-e-validação)

---

## Visão Geral

O Construtivo Obra foi transformado em um sistema **SaaS Multitenant** com **isolamento total de dados** entre empresas. Cada empresa assinante tem:

- Dados completamente isolados (nenhuma empresa vê dados de outra)
- Seu próprio conjunto de usuários (admin + membros de equipe)
- Controle de assinatura e planos
- Período de trial de 15 dias
- Row Level Security (RLS) em todas as tabelas

---

## Arquitetura Multitenant

### Conceitos Principais

**Tenant (Inquilino)**: Cada empresa é um tenant independente.

**Isolamento**: Implementado através de:
- Campo `empresa_id` em todas as tabelas
- Políticas RLS (Row Level Security) no PostgreSQL
- Funções auxiliares que filtram automaticamente por empresa

**Hierarquia**:
```
Empresa (Tenant)
  ├── Assinatura (vinculada a um Plano)
  ├── Usuários
  │   ├── Admin (gerencia empresa e usuários)
  │   ├── Membro (usa o sistema)
  │   └── Visualizador (apenas leitura)
  └── Dados da Empresa
      ├── Obras
      ├── Orçamentos
      ├── Negociações
      ├── Medições
      ├── Fornecedores
      ├── etc...
```

---

## Como Aplicar a Migration

### Passo 1: Conectar ao Supabase via MCP

Você já tem o MCP Supabase configurado. Use o token fornecido:
```
sbp_57f6145fd339f1c21b533a7399bd273a98f1cd3a
```

### Passo 2: Executar a Migration

1. Acesse o Supabase Dashboard ou use o MCP
2. Vá para SQL Editor
3. Cole o conteúdo completo do arquivo `MIGRATION_MULTITENANT.sql`
4. Execute o script

**IMPORTANTE**: A migration é **idempotente** (pode ser executada múltiplas vezes sem causar erros). Ela usa `IF NOT EXISTS` e `IF NOT EXISTS` em todas as criações.

### Passo 3: Verificar a Aplicação

Execute estas queries para verificar:

```sql
-- Verificar tabelas criadas
SELECT * FROM public.empresas;
SELECT * FROM public.planos;
SELECT * FROM public.assinaturas;

-- Verificar que empresa_id foi adicionado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'centros_custo' AND column_name = 'empresa_id';

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Estrutura de Dados

### Novas Tabelas

#### 1. `empresas` (Tenants)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | BIGSERIAL | ID único da empresa |
| nome | VARCHAR(255) | Nome fantasia |
| razao_social | VARCHAR(255) | Razão social |
| cnpj | VARCHAR(18) | CNPJ (único) |
| email | VARCHAR(255) | Email principal |
| status | VARCHAR(20) | trial, active, suspended, cancelled |
| data_inicio_trial | TIMESTAMPTZ | Início do período de teste |
| data_fim_trial | TIMESTAMPTZ | Fim do período de teste (15 dias) |
| configuracoes | JSONB | Configurações personalizadas |

#### 2. `planos`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | BIGSERIAL | ID único do plano |
| nome | VARCHAR(100) | Nome do plano |
| preco_mensal | NUMERIC(10,2) | Preço mensal |
| preco_anual | NUMERIC(10,2) | Preço anual |
| limite_usuarios | INTEGER | Limite de usuários (NULL = ilimitado) |
| limite_obras | INTEGER | Limite de obras (NULL = ilimitado) |
| funcionalidades | JSONB | Funcionalidades habilitadas |
| ativo | BOOLEAN | Se o plano está disponível |

**Planos Pré-cadastrados**:
1. **Gratuito**: R$ 0,00 - 2 usuários, 1 obra
2. **Básico**: R$ 99,90/mês - 5 usuários, 3 obras
3. **Profissional**: R$ 249,90/mês - 15 usuários, 10 obras
4. **Empresarial**: R$ 499,90/mês - Usuários e obras ilimitados

#### 3. `assinaturas`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | BIGSERIAL | ID único da assinatura |
| empresa_id | BIGINT | Referência à empresa |
| plano_id | BIGINT | Referência ao plano |
| data_inicio | TIMESTAMPTZ | Início da assinatura |
| data_fim | TIMESTAMPTZ | Fim da assinatura |
| status | VARCHAR(20) | active, cancelled, expired, suspended |
| periodicidade | VARCHAR(20) | mensal, anual |
| renovacao_automatica | BOOLEAN | Se renova automaticamente |

### Modificações em Tabelas Existentes

**Todas as 18 tabelas** receberam:
- Coluna `empresa_id BIGINT` (FK para `empresas.id`)
- Índice em `empresa_id` para performance
- Políticas RLS para isolamento

**Tabela `usuarios`** recebeu campos adicionais:
- `empresa_id`: Empresa a qual pertence
- `role`: admin, membro, visualizador
- `ativo`: Se o usuário está ativo
- `convidado_por`: Quem convidou o usuário
- `data_convite`: Quando foi convidado
- `data_ativacao`: Quando ativou a conta

---

## Políticas de Segurança (RLS)

### Como Funciona

**Row Level Security (RLS)** é um recurso do PostgreSQL que filtra automaticamente as linhas de uma tabela baseado em regras.

No Construtivo Obra, **todas as tabelas** têm RLS habilitado com as seguintes políticas:

#### Política de SELECT (Leitura)
```sql
USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa())
```
- Usuário só vê registros de sua própria empresa
- Apenas se a empresa estiver ativa (trial ou active)

#### Política de INSERT (Criação)
```sql
WITH CHECK (empresa_id = get_user_empresa_id() AND is_empresa_ativa())
```
- Usuário só pode criar registros para sua própria empresa

#### Política de UPDATE (Atualização)
```sql
USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa())
```
- Usuário só pode atualizar registros de sua própria empresa

#### Política de DELETE (Exclusão)
```sql
USING (empresa_id = get_user_empresa_id() AND is_empresa_ativa() AND is_empresa_admin())
```
- Apenas admins da empresa podem deletar
- Apenas registros da própria empresa

### Funções Auxiliares

#### `get_user_empresa_id()`
Retorna o `empresa_id` do usuário autenticado.

```sql
SELECT get_user_empresa_id();
-- Retorna: 1 (se o usuário pertence à empresa 1)
```

#### `is_empresa_admin()`
Verifica se o usuário autenticado é admin da empresa.

```sql
SELECT is_empresa_admin();
-- Retorna: true ou false
```

#### `is_empresa_ativa()`
Verifica se a empresa do usuário está ativa (trial ou active).

```sql
SELECT is_empresa_ativa();
-- Retorna: true ou false
```

---

## Fluxo de Cadastro de Empresas

### 1. Novo Cadastro (Sign Up)

```typescript
// Exemplo de fluxo de cadastro
async function cadastrarEmpresa(dados) {
  // 1. Criar empresa
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .insert({
      nome: dados.nomeEmpresa,
      cnpj: dados.cnpj,
      email: dados.email,
      status: 'trial',
      data_inicio_trial: new Date(),
      data_fim_trial: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 dias
    })
    .select()
    .single();

  // 2. Criar usuário no auth.users (Supabase Auth)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      data: {
        nome: dados.nomeUsuario,
        empresa_id: empresa.id
      }
    }
  });

  // 3. Atualizar registro em public.usuarios (via trigger handle_new_user)
  // O trigger já cria o registro, mas precisamos atualizar com empresa_id e role
  await supabase
    .from('usuarios')
    .update({
      empresa_id: empresa.id,
      role: 'admin', // Primeiro usuário é sempre admin
      ativo: true,
      data_ativacao: new Date()
    })
    .eq('id', authData.user.id);

  // 4. Criar assinatura trial (plano gratuito)
  const { data: planoGratuito } = await supabase
    .from('planos')
    .select('id')
    .eq('nome', 'Gratuito')
    .single();

  await supabase
    .from('assinaturas')
    .insert({
      empresa_id: empresa.id,
      plano_id: planoGratuito.id,
      data_inicio: new Date(),
      status: 'active',
      periodicidade: 'mensal',
      valor_mensal: 0
    });

  return { empresa, usuario: authData.user };
}
```

### 2. Fluxo de Trial

```
Cadastro → Trial (15 dias) → Escolher Plano → Assinatura Ativa
                ↓
         Se não assinar após 15 dias
                ↓
         Status: suspended (acesso bloqueado)
```

---

## Gerenciamento de Usuários

### Papéis (Roles)

#### Admin
- Pode gerenciar a empresa (nome, dados, configurações)
- Pode convidar e remover usuários
- Pode gerenciar assinaturas
- Pode deletar dados
- Tem acesso total ao sistema

#### Membro
- Pode criar, editar e visualizar dados
- Não pode deletar dados
- Não pode gerenciar usuários
- Não pode gerenciar assinatura

#### Visualizador
- Apenas leitura
- Não pode criar, editar ou deletar
- Ideal para clientes ou investidores

### Convidar Usuários

```typescript
async function convidarUsuario(email, role = 'membro') {
  const userEmpresaId = await getUserEmpresaId(); // Empresa do usuário logado
  const userId = await getUserId(); // ID do usuário logado

  // 1. Criar usuário no auth
  const { data: authData, error } = await supabase.auth.admin.createUser({
    email: email,
    email_confirm: false, // Exige confirmação de email
    user_metadata: {
      empresa_id: userEmpresaId,
      convidado_por: userId
    }
  });

  // 2. Criar registro em usuarios
  await supabase
    .from('usuarios')
    .insert({
      id: authData.user.id,
      email: email,
      empresa_id: userEmpresaId,
      role: role,
      ativo: false, // Ativa quando aceitar o convite
      convidado_por: userId,
      data_convite: new Date()
    });

  // 3. Enviar email de convite (implementar)
  // await enviarEmailConvite(email);
}
```

---

## Sistema de Planos

### Verificar Limites do Plano

```typescript
async function verificarLimitePlano(tipo: 'usuarios' | 'obras') {
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano_id, planos(*)')
    .eq('empresa_id', empresa_id)
    .eq('status', 'active')
    .single();

  const limite = assinatura.planos[`limite_${tipo}`];
  
  if (limite === null) return true; // Ilimitado

  // Contar registros atuais
  const { count } = await supabase
    .from(tipo === 'usuarios' ? 'usuarios' : 'obras')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresa_id);

  return count < limite;
}
```

### Upgrade de Plano

```typescript
async function upgradePlano(novoPlanoId: number, periodicidade: 'mensal' | 'anual') {
  // 1. Buscar assinatura atual
  const { data: assinaturaAtual } = await supabase
    .from('assinaturas')
    .select('*')
    .eq('empresa_id', empresa_id)
    .eq('status', 'active')
    .single();

  // 2. Cancelar assinatura atual
  await supabase
    .from('assinaturas')
    .update({
      status: 'cancelled',
      data_cancelamento: new Date()
    })
    .eq('id', assinaturaAtual.id);

  // 3. Buscar dados do novo plano
  const { data: plano } = await supabase
    .from('planos')
    .select('*')
    .eq('id', novoPlanoId)
    .single();

  // 4. Criar nova assinatura
  const valor = periodicidade === 'mensal' ? plano.preco_mensal : plano.preco_anual;
  
  await supabase
    .from('assinaturas')
    .insert({
      empresa_id: empresa_id,
      plano_id: novoPlanoId,
      data_inicio: new Date(),
      periodicidade: periodicidade,
      valor_mensal: periodicidade === 'mensal' ? valor : null,
      valor_anual: periodicidade === 'anual' ? valor : null,
      status: 'active',
      renovacao_automatica: true
    });

  // 5. Atualizar status da empresa para 'active'
  await supabase
    .from('empresas')
    .update({ status: 'active' })
    .eq('id', empresa_id);
}
```

---

## Integração com o Frontend

### 1. Atualizar Queries para Incluir empresa_id

**ANTES (single-tenant):**
```typescript
const { data } = await supabase
  .from('obras')
  .select('*');
```

**DEPOIS (multi-tenant):**
```typescript
// O RLS filtra automaticamente por empresa_id!
// Não precisa adicionar .eq('empresa_id', ...)
const { data } = await supabase
  .from('obras')
  .select('*');
```

O RLS garante que apenas obras da empresa do usuário sejam retornadas.

### 2. Criar Registros com empresa_id

```typescript
// Obter empresa_id do usuário
const { data: usuario } = await supabase
  .from('usuarios')
  .select('empresa_id')
  .eq('id', auth.user.id)
  .single();

// Criar registro
const { data } = await supabase
  .from('obras')
  .insert({
    nome: 'Obra XYZ',
    empresa_id: usuario.empresa_id, // Obrigatório!
    // ... outros campos
  });
```

### 3. Context de Empresa (Recomendado)

Criar um Context React para gerenciar dados da empresa:

```typescript
// contexts/EmpresaContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EmpresaContextData {
  empresa: Empresa | null;
  assinatura: Assinatura | null;
  plano: Plano | null;
  loading: boolean;
}

const EmpresaContext = createContext<EmpresaContextData>({} as EmpresaContextData);

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(null);
  const [assinatura, setAssinatura] = useState(null);
  const [plano, setPlano] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosEmpresa();
  }, []);

  async function carregarDadosEmpresa() {
    try {
      // Buscar usuário atual
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', (await supabase.auth.getUser()).data.user.id)
        .single();

      // Buscar empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuario.empresa_id)
        .single();

      // Buscar assinatura e plano
      const { data: assinaturaData } = await supabase
        .from('assinaturas')
        .select('*, plano:planos(*)')
        .eq('empresa_id', usuario.empresa_id)
        .eq('status', 'active')
        .single();

      setEmpresa(empresaData);
      setAssinatura(assinaturaData);
      setPlano(assinaturaData.plano);
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <EmpresaContext.Provider value={{ empresa, assinatura, plano, loading }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export const useEmpresa = () => useContext(EmpresaContext);
```

### 4. Verificações de Permissão

```typescript
// hooks/usePermissao.ts
import { useEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/lib/supabase';

export function usePermissao() {
  const { empresa, plano } = useEmpresa();
  const [role, setRole] = useState<'admin' | 'membro' | 'visualizador'>('membro');

  useEffect(() => {
    carregarRole();
  }, []);

  async function carregarRole() {
    const { data } = await supabase
      .from('usuarios')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single();
    
    setRole(data.role);
  }

  return {
    isAdmin: role === 'admin',
    isMembro: role === 'membro',
    isVisualizador: role === 'visualizador',
    podeEditar: role !== 'visualizador',
    podeDeletar: role === 'admin',
    podeGerenciarUsuarios: role === 'admin',
    empresaAtiva: empresa?.status === 'active' || empresa?.status === 'trial',
  };
}
```

---

## Testes e Validação

### 1. Testar Isolamento de Dados

```sql
-- Criar 2 empresas de teste
INSERT INTO empresas (nome, email, status) VALUES
  ('Empresa A', 'empresaa@test.com', 'active'),
  ('Empresa B', 'empresab@test.com', 'active');

-- Criar 2 usuários, cada um em uma empresa
INSERT INTO usuarios (id, nome, email, empresa_id, role) VALUES
  ('uuid-usuario-a', 'Usuario A', 'usera@test.com', 1, 'admin'),
  ('uuid-usuario-b', 'Usuario B', 'userb@test.com', 2, 'admin');

-- Criar obras para cada empresa
INSERT INTO obras (nome, empresa_id) VALUES
  ('Obra da Empresa A', 1),
  ('Obra da Empresa B', 2);

-- Testar isolamento: Logar como Usuario A
-- SET LOCAL jwt.claims.sub = 'uuid-usuario-a';
-- SELECT * FROM obras; -- Deve retornar apenas obra da Empresa A

-- Testar isolamento: Logar como Usuario B
-- SET LOCAL jwt.claims.sub = 'uuid-usuario-b';
-- SELECT * FROM obras; -- Deve retornar apenas obra da Empresa B
```

### 2. Testar Limites de Plano

```typescript
// Tentar criar usuário além do limite
test('Não deve permitir criar usuário além do limite do plano', async () => {
  // Empresa com plano Básico (limite: 5 usuários)
  const resultado = await criarUsuarios(6); // Tentar criar 6
  
  expect(resultado.sucesso).toBe(false);
  expect(resultado.erro).toContain('limite de usuários');
});
```

### 3. Testar Permissões

```typescript
// Testar que membro não pode deletar
test('Membro não deve poder deletar registro', async () => {
  // Logar como membro
  await supabase.auth.signInWithPassword({
    email: 'membro@empresa.com',
    password: 'senha'
  });

  // Tentar deletar
  const { error } = await supabase
    .from('obras')
    .delete()
    .eq('id', 1);

  expect(error).toBeTruthy(); // Deve dar erro
  expect(error.message).toContain('permission denied');
});
```

---

## Próximos Passos

1. **Aplicar a migration** no Supabase
2. **Criar tela de cadastro** de empresas
3. **Criar tela de gerenciamento** de usuários
4. **Criar tela de planos** e assinaturas
5. **Implementar verificações de limite** no frontend
6. **Adicionar empresa_id** em todos os inserts
7. **Testar isolamento** com múltiplas empresas
8. **Implementar sistema de pagamentos** (Stripe, PagSeguro, etc)

---

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do Supabase
2. Teste as queries SQL diretamente
3. Valide as políticas RLS
4. Consulte a documentação do Supabase sobre RLS

---

**Última atualização**: Janeiro 2025
