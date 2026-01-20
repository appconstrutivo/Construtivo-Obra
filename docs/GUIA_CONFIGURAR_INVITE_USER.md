# 📧 Guia: Como Encontrar e Configurar "Invite user" no Supabase

**Data**: 20 de Janeiro de 2026  
**Status**: ✅ Guia passo a passo

---

## 🎯 Onde Encontrar "Invite user"

### Passo 1: Acessar o Dashboard

1. Acesse: https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox
2. Faça login se necessário

### Passo 2: Navegar até Authentication > Templates

1. No menu lateral esquerdo, clique em **"Authentication"**
2. Dentro de "Authentication", procure por **"NOTIFICATIONS"**
3. Clique em **"Email"** (deve estar destacado)
4. Você verá duas abas no topo: **"Templates"** e **"SMTP Settings"**
5. Certifique-se de estar na aba **"Templates"**

### Passo 3: Encontrar "Invite user"

Na seção **"Authentication"** (não "Security"), você verá uma lista de templates:

- ✅ **"Confirm sign up"** - Confirmar cadastro
- ✅ **"Invite user"** ← **ESTE É O QUE VOCÊ PROCURA!**
- ✅ **"Magic link"** - Link mágico de login
- ✅ **"Change email address"** - Mudar email
- ✅ **"Reset password"** - Redefinir senha
- ✅ **"Reauthentication"** - Reautenticação

### Passo 4: Configurar "Invite user"

1. **Clique em "Invite user"** (há uma seta → ao lado)
2. Você será levado para a página de edição do template
3. Aqui você pode:
   - **Visualizar** o template atual
   - **Editar** o conteúdo do email
   - **Personalizar** com HTML/CSS
   - **Ver preview** do email

---

## ⚙️ Configurações Importantes

### 1. Verificar se Email está Habilitado

1. No menu lateral, vá em **"CONFIGURATION"**
2. Clique em **"Sign In / Providers"**
3. Verifique se **"Email"** está **habilitado** (toggle ON)
4. Se não estiver, **ative o toggle**

### 2. Configurar URLs de Redirecionamento

1. No menu lateral, vá em **"CONFIGURATION"**
2. Clique em **"URL Configuration"**
3. Configure:

   **Site URL:**
   ```
   http://localhost:3001
   ```
   (ou a URL do seu ambiente de desenvolvimento)

   **Redirect URLs:**
   Adicione todas as portas possíveis:
   ```
   http://localhost:3000/**
   http://localhost:3001/**
   http://localhost:3002/**
   http://localhost:*
   ```

   Para produção, adicione também:
   ```
   https://seu-dominio.vercel.app/**
   ```

4. Clique em **"Save"**

### 3. Configurar SMTP (Recomendado para Produção)

⚠️ **IMPORTANTE**: O Supabase tem limites no plano gratuito (3 emails/hora). Para produção, configure SMTP customizado.

1. Na aba **"SMTP Settings"** (ao lado de "Templates")
2. Clique em **"Set up SMTP"**
3. Configure com um provedor:
   - **SendGrid**
   - **Mailgun**
   - **AWS SES**
   - **Outros SMTP**

---

## 📝 Template "Invite user" - Estrutura

O template padrão do "Invite user" geralmente contém:

```html
<h2>Você foi convidado!</h2>
<p>Clique no link abaixo para aceitar o convite e definir sua senha:</p>
<a href="{{ .ConfirmationURL }}">Aceitar Convite</a>
```

### Variáveis Disponíveis no Template

- `{{ .ConfirmationURL }}` - Link para aceitar o convite
- `{{ .Email }}` - Email do usuário
- `{{ .SiteURL }}` - URL do site
- `{{ .RedirectTo }}` - URL de redirecionamento após aceitar

---

## 🧪 Como Testar

### 1. Verificar Configuração

1. ✅ Email habilitado em "Sign In / Providers"
2. ✅ Template "Invite user" existe e está configurado
3. ✅ URLs de redirecionamento configuradas
4. ✅ SMTP configurado (ou usando serviço padrão do Supabase)

### 2. Testar Convite

1. No seu sistema, vá em **Configurações** > **Usuários e Permissões**
2. Clique em **"Convidar Usuário"**
3. Preencha um email válido
4. Clique em **"Enviar Convite"**

### 3. Verificar Email

- Verifique a **caixa de entrada**
- Verifique a **pasta de spam**
- Aguarde alguns minutos (pode haver delay)

### 4. Verificar Logs

1. No Supabase Dashboard, vá em **"Logs"** > **"Auth Logs"**
2. Procure por tentativas de envio de email
3. Verifique se há erros

---

## 🔍 Troubleshooting

### Problema: Não encontro "Invite user"

**Solução**:
1. Certifique-se de estar em **Authentication** > **Email** > **Templates**
2. Role a página para baixo - pode estar mais abaixo
3. Procure na seção **"Authentication"** (não "Security")

### Problema: Template não aparece

**Solução**:
1. Verifique se você está no projeto correto (`zgoafwgxenhwhkxdkwox`)
2. Verifique se tem permissões de admin no projeto
3. Tente atualizar a página (F5)

### Problema: Email não chega

**Possíveis causas**:

1. **Limite de emails atingido** (plano gratuito: 3/hora)
   - **Solução**: Aguarde 1 hora ou configure SMTP

2. **URL de redirecionamento não configurada**
   - **Solução**: Configure em "URL Configuration"

3. **Email bloqueado**
   - **Solução**: Verifique spam, adicione remetente à lista de permitidos

4. **SMTP não configurado** (usando serviço padrão com limites)
   - **Solução**: Configure SMTP customizado

---

## 📋 Checklist Completo

### Configuração Básica:
- [ ] Acessou Authentication > Email > Templates
- [ ] Encontrou "Invite user" na lista
- [ ] Clicou em "Invite user" para ver/editar o template
- [ ] Email habilitado em "Sign In / Providers"
- [ ] URLs configuradas em "URL Configuration"

### Para Produção:
- [ ] SMTP customizado configurado
- [ ] Template personalizado com logo/marca
- [ ] URLs de produção configuradas
- [ ] Testado envio de convite
- [ ] Email recebido e link funcionando

---

## 🎯 Resumo Rápido

**Caminho completo**:
```
Dashboard → Authentication → Email (NOTIFICATIONS) → Templates → "Invite user"
```

**URL direta**:
```
https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/auth/templates
```

**O que fazer**:
1. Clique em **"Invite user"** na lista de templates
2. Verifique/edite o template se necessário
3. Configure URLs em **"URL Configuration"**
4. Configure SMTP se for para produção

---

## 🔗 Links Úteis

- [Documentação Supabase - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Documentação Supabase - Invite Users](https://supabase.com/docs/guides/auth/auth-invite)
- [Documentação Supabase - SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

---

**Próximo Passo**: Siga o caminho acima e clique em "Invite user" para configurar!
