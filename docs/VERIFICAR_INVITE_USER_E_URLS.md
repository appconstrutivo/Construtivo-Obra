# ✅ Verificar "Invite user" e Configurar URLs

**Data**: 20 de Janeiro de 2026  
**Status**: ⚠️ Verificação necessária no Dashboard do Supabase

---

## 1️⃣ Verificar se "Invite user" está ativo

### Onde verificar:

1. **Authentication > Email Templates**
   - Acesse: https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/auth/templates
   - Procure pelo template **"Invite user"**
   - Verifique se está **habilitado/ativo**

2. **Authentication > Providers**
   - Verifique se **Email** está habilitado como provedor de autenticação
   - Acesse: https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/auth/providers

### Importante:

O "Invite user" **não é um toggle de notificação**, mas sim uma **funcionalidade** que funciona quando você usa `inviteUserByEmail()`. O que você viu na imagem são **notificações de email** para eventos (mudança de senha, etc.), não a funcionalidade de convite em si.

---

## 2️⃣ Configurar URLs para Múltiplas Portas

### Problema:

Se você configurar apenas a porta 3001 no Supabase, quando o projeto rodar em outra porta (ex: 3000, 3002), o link do email não funcionará.

### Solução: Configurar Múltiplas URLs

No Supabase Dashboard:

1. **Acesse**: Authentication > URL Configuration
   - https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/auth/url-configuration

2. **Configure Site URL**:
   ```
   http://localhost:3001
   ```
   (Esta é a URL padrão, mas não é crítica para desenvolvimento)

3. **Configure Redirect URLs** (IMPORTANTE):
   Adicione **todas as portas possíveis** que você pode usar:
   ```
   http://localhost:3000/**
   http://localhost:3001/**
   http://localhost:3002/**
   http://localhost:3003/**
   http://localhost:*
   ```

   **OU** use um padrão mais flexível:
   ```
   http://localhost:*
   ```

   **Para produção**, adicione também:
   ```
   https://seu-dominio.vercel.app/**
   https://*.vercel.app/**
   ```

### Solução no Código (Já Implementada ✅)

O código foi atualizado para **detectar automaticamente** a URL da requisição:

```typescript
// Obtém a URL dinamicamente da requisição
const origin = request.headers.get('origin') || 
               request.headers.get('referer') || 
               process.env.NEXT_PUBLIC_APP_URL || 
               'http://localhost:3001';
```

Isso significa que:
- ✅ Funciona em **qualquer porta** que você usar
- ✅ Detecta automaticamente a URL do navegador
- ✅ Usa a URL correta no link do email

---

## 📋 Checklist de Configuração

### No Supabase Dashboard:

- [ ] Verificar se Email está habilitado em **Authentication > Providers**
- [ ] Verificar template "Invite user" em **Authentication > Email Templates**
- [ ] Configurar **Site URL** em **Authentication > URL Configuration**
- [ ] Adicionar múltiplas URLs em **Redirect URLs**:
  - [ ] `http://localhost:3000/**`
  - [ ] `http://localhost:3001/**`
  - [ ] `http://localhost:3002/**`
  - [ ] `http://localhost:*` (padrão flexível)
  - [ ] URL de produção (se aplicável)

### No Código (Já feito ✅):

- [x] Código atualizado para detectar URL dinamicamente
- [x] Funciona em qualquer porta automaticamente

---

## 🔍 Como Testar

### 1. Testar em Diferentes Portas

1. Inicie o servidor em uma porta (ex: `npm run dev` - geralmente porta 3000)
2. Tente convidar um usuário
3. Verifique se o link do email usa a porta correta

### 2. Verificar Link do Email

Quando receber o email de convite:
- O link deve começar com a URL correta (ex: `http://localhost:3000/...`)
- Deve funcionar ao clicar no link

### 3. Verificar Logs

No Supabase Dashboard:
- **Logs** > **Auth Logs**
- Procure por tentativas de envio de email
- Verifique se há erros relacionados a URLs

---

## ⚠️ Importante sobre Redirect URLs

O Supabase **valida** as URLs de redirecionamento. Se a URL no link do email não estiver na lista de **Redirect URLs**, o redirecionamento será **bloqueado** por segurança.

**Por isso é importante**:
- Adicionar todas as portas possíveis em **Redirect URLs**
- Ou usar o padrão `http://localhost:*` para aceitar qualquer porta local

---

## 🚀 Para Produção

Quando for para produção:

1. **Configure a URL de produção**:
   ```
   Site URL: https://seu-dominio.vercel.app
   ```

2. **Adicione em Redirect URLs**:
   ```
   https://seu-dominio.vercel.app/**
   ```

3. **Configure no `.env.local`** (ou variáveis do Vercel):
   ```env
   NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
   ```

---

## ✅ Resumo

1. **"Invite user"**: É uma funcionalidade, não um toggle. Verifique em **Email Templates** e **Providers**.

2. **Múltiplas portas**: 
   - ✅ Código já detecta automaticamente
   - ⚠️ Configure **Redirect URLs** no Supabase para aceitar múltiplas portas
   - Use `http://localhost:*` para aceitar qualquer porta local

---

**Próximo Passo**: Configure as **Redirect URLs** no Supabase Dashboard para aceitar múltiplas portas!
