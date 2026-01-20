# ✅ Configurar Trigger para Sincronizar auth.users → public.usuarios

**Data**: 18 de Janeiro de 2026  
**Status**: ✅ Função criada | ⏳ Trigger pendente de configuração  
**Usuário Existente**: ✅ Sincronizado manualmente

---

## 🎯 Objetivo

Criar um trigger no `auth.users` que automaticamente cria um registro em `public.usuarios` sempre que um novo usuário se cadastra no sistema.

---

## ✅ O Que Já Foi Feito

### 1. Função `handle_new_user()` Criada ✅

A função que sincroniza os usuários já está criada no banco de dados:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (
    id,
    nome,
    email,
    cargo,
    empresa_id,
    role,
    ativo,
    data_ativacao,
    created_at,
    updated_at,
    ultimo_acesso
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cargo', NULL),
    COALESCE((NEW.raw_user_meta_data->>'empresa_id')::BIGINT, NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'membro'),
    true,
    NOW(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
```

### 2. Usuário Existente Sincronizado ✅

O usuário `thiagowendley@gmail.com` (UUID: `3beb4c1d-d65e-46bb-bf6e-272c0ec5175f`) foi sincronizado:

- ✅ Criado em `public.usuarios`
- ✅ Role definida como `admin` (primeiro usuário)
- ✅ Status: ativo

---

## ⏳ Configurar Trigger no Dashboard (OBRIGATÓRIO)

Como não é possível criar triggers em `auth.users` via SQL por questões de segurança, você precisa configurar via **Database Webhooks** do Supabase.

### Opção 1: Database Webhooks (Recomendado)

1. **Acesse o Dashboard do Supabase**:
   - https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox

2. **Vá para Database > Webhooks**:
   - Menu lateral > Database > Webhooks

3. **Clique em "Create a new hook"**

4. **Configure o Webhook**:
   ```
   Name: sync_new_user_to_usuarios
   Table: auth.users
   Events: Insert
   Type: Postgres Function
   Function: public.handle_new_user
   ```

5. **Clique em "Confirm"**

### Opção 2: SQL Editor com Permissões Elevadas

Se você tiver acesso ao usuário `postgres` com privilégios de superusuário:

1. **Acesse o SQL Editor**:
   - https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/sql

2. **Execute este comando**:

```sql
-- IMPORTANTE: Executar como usuário postgres com privilégios elevados
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Opção 3: Supabase CLI (Avançado)

Se você usa o Supabase CLI:

```bash
# Criar migration
supabase migration new add_auth_user_trigger

# Adicionar o SQL da migration
echo "CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();" > supabase/migrations/[timestamp]_add_auth_user_trigger.sql

# Aplicar migration
supabase db push
```

---

## 🧪 Testar o Trigger

### 1. Criar um Novo Usuário de Teste

Use a página de cadastro do seu sistema ou execute via SQL Editor:

```sql
-- Criar um usuário de teste via auth.users (simulação)
-- NOTA: Na prática, use a interface de cadastro do sistema
```

Ou pela interface:
1. Vá para: Authentication > Users
2. Clique em "Add User"
3. Preencha email e senha
4. Clique em "Create User"

### 2. Verificar Sincronização

Execute no SQL Editor:

```sql
-- Ver usuários no auth.users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Ver usuários sincronizados em public.usuarios
SELECT id, nome, email, role, ativo 
FROM public.usuarios 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar se todos os usuários do auth.users estão em usuarios
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ Sincronizado'
    ELSE '❌ NÃO sincronizado'
  END as status
FROM auth.users au
LEFT JOIN public.usuarios pu ON pu.id = au.id
ORDER BY au.created_at DESC;
```

### 3. Resultado Esperado

Todos os usuários devem aparecer em ambas as tabelas:

| Email | auth.users | public.usuarios | Status |
|-------|------------|-----------------|--------|
| thiagowendley@gmail.com | ✅ | ✅ | Sincronizado |
| novousuario@teste.com | ✅ | ✅ | Sincronizado |

---

## 🔍 Troubleshooting

### Problema: Novo usuário não aparece em public.usuarios

**Verificar se o trigger foi criado**:

```sql
-- Ver triggers em auth.users
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';
```

**Resultado esperado**:
```
trigger_name: on_auth_user_created
event_manipulation: INSERT
action_statement: EXECUTE FUNCTION public.handle_new_user()
```

### Problema: Erro ao criar o trigger

Se você receber erro `permission denied` ou `must be owner of relation users`:

1. **Usar Database Webhooks** (Opção 1 acima) - É a forma recomendada pelo Supabase
2. **Ou** contatar o suporte do Supabase para habilitar permissões adicionais

### Problema: Usuário criado sem empresa_id

Isso é normal para o primeiro cadastro. O fluxo correto é:

1. **Primeiro**: Criar empresa
2. **Depois**: Criar usuário com `empresa_id` no metadata

Para adicionar `empresa_id` manualmente:

```sql
UPDATE public.usuarios
SET empresa_id = 1 -- ID da empresa
WHERE id = '3beb4c1d-d65e-46bb-bf6e-272c0ec5175f';
```

---

## 📋 Checklist de Validação

Execute este checklist para garantir que tudo está funcionando:

- [x] Função `handle_new_user()` criada
- [x] Usuário existente sincronizado
- [ ] Trigger configurado no Dashboard (via Webhooks ou SQL)
- [ ] Trigger testado criando novo usuário
- [ ] Novo usuário aparece em `public.usuarios` automaticamente
- [ ] Dados corretos (nome, email, role)

---

## 📝 Fluxo de Cadastro Completo (Futuro)

Para implementar cadastro com empresa:

```typescript
// 1. Criar empresa
const { data: empresa } = await supabase
  .from('empresas')
  .insert({
    nome: 'Nome da Empresa',
    email: 'empresa@email.com',
    status: 'trial'
  })
  .select()
  .single();

// 2. Criar usuário com metadata da empresa
const { data: authData } = await supabase.auth.signUp({
  email: 'usuario@email.com',
  password: 'senha123',
  options: {
    data: {
      nome: 'Nome do Usuário',
      empresa_id: empresa.id,  // ID da empresa
      role: 'admin'            // Primeiro usuário é admin
    }
  }
});

// 3. O trigger handle_new_user() cria automaticamente em public.usuarios
// com os dados do metadata
```

---

## 🚨 IMPORTANTE: Configurar Agora!

**Ação Requerida**: Configure o trigger através de uma das 3 opções acima para que novos usuários sejam automaticamente sincronizados.

**Prioridade**: 🔴 ALTA - Sem o trigger, novos cadastros não funcionarão corretamente.

---

## 📞 Suporte

- Documentação Supabase Webhooks: https://supabase.com/docs/guides/database/webhooks
- Documentação Triggers: https://supabase.com/docs/guides/database/postgres/triggers

---

**Próximo Passo**: Escolha uma das 3 opções acima e configure o trigger AGORA!

---

**Data de Criação**: 18/01/2026  
**Status**: ⏳ Aguardando configuração do trigger  
**Usuário Sincronizado**: ✅ thiagowendley@gmail.com
