# 📧 Configurar Envio de Emails no Supabase

**Data**: 20 de Janeiro de 2026  
**Status**: ⚠️ Configuração necessária para envio de emails de convite

---

## 🎯 Objetivo

Configurar o Supabase para enviar emails de convite aos usuários quando forem convidados para o sistema.

---

## ⚠️ IMPORTANTE

O Supabase tem limites no plano gratuito para envio de emails:
- **Plano Free**: 3 emails por hora
- **Plano Pro**: 4 emails por hora (aumenta com upgrades)

Para produção, recomenda-se configurar um provedor de email customizado (SendGrid, Mailgun, etc.).

---

## 📋 Configuração no Supabase Dashboard

### 1. Verificar Configurações de Email

1. Acesse o Dashboard do Supabase:
   - https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox

2. Vá em **Authentication** > **Email Templates**

3. Verifique se os templates estão configurados:
   - **Invite user** (Convite de usuário)
   - **Magic Link** (Link mágico)
   - **Reset Password** (Redefinir senha)

### 2. Configurar Template de Convite (Opcional)

1. Em **Authentication** > **Email Templates**
2. Selecione **"Invite user"**
3. Personalize o template se desejar
4. Salve as alterações

### 3. Configurar URL de Redirecionamento

1. Vá em **Authentication** > **URL Configuration**
2. Adicione a URL do seu site em **Site URL**:
   ```
   http://localhost:3001  (desenvolvimento)
   https://seu-dominio.vercel.app  (produção)
   ```
3. Adicione em **Redirect URLs**:
   ```
   http://localhost:3001/**
   https://seu-dominio.vercel.app/**
   ```

### 4. Verificar Configurações de SMTP (Opcional - Produção)

Para usar um provedor de email customizado:

1. Vá em **Settings** > **Auth**
2. Role até **SMTP Settings**
3. Configure com suas credenciais:
   - **SendGrid**
   - **Mailgun**
   - **AWS SES**
   - **Outros provedores SMTP**

---

## 🧪 Testar o Envio de Email

### 1. Verificar Logs de Email

1. No Dashboard, vá em **Logs** > **Auth Logs**
2. Procure por tentativas de envio de email
3. Verifique se há erros

### 2. Testar Convite

1. Acesse **Configurações** > **Usuários e Permissões**
2. Clique em **"Convidar Usuário"**
3. Preencha um email válido
4. Clique em **"Enviar Convite"**

### 3. Verificar Email

- Verifique a **caixa de entrada** do email
- Verifique a **pasta de spam/lixo eletrônico**
- Aguarde alguns minutos (pode haver delay)

---

## 🔍 Troubleshooting

### Problema: Email não chega

**Possíveis causas**:

1. **Limite de emails atingido** (plano gratuito)
   - **Solução**: Aguarde 1 hora ou faça upgrade do plano

2. **Email bloqueado pelo provedor**
   - **Solução**: Verifique spam, adicione remetente à lista de permitidos

3. **URL de redirecionamento não configurada**
   - **Solução**: Configure em Authentication > URL Configuration

4. **Template de email não configurado**
   - **Solução**: Verifique Authentication > Email Templates

### Problema: Link do email não funciona

**Causa**: URL de redirecionamento incorreta

**Solução**:
1. Verifique `NEXT_PUBLIC_APP_URL` no `.env.local`
2. Configure a URL correta no Supabase Dashboard
3. Adicione a URL em Redirect URLs

### Problema: Erro "Email rate limit exceeded"

**Causa**: Limite de emails do plano atingido

**Solução**:
- Aguarde 1 hora
- Faça upgrade do plano Supabase
- Configure SMTP customizado

---

## 📝 Configuração Recomendada para Produção

### 1. Usar Provedor de Email Customizado

Recomenda-se usar **SendGrid** ou **Mailgun**:

1. Crie conta no provedor escolhido
2. Obtenha as credenciais SMTP
3. Configure no Supabase Dashboard:
   - **Settings** > **Auth** > **SMTP Settings**

### 2. Configurar Variáveis de Ambiente

No `.env.local` (desenvolvimento) e Vercel (produção):

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

### 3. Personalizar Templates de Email

1. Acesse **Authentication** > **Email Templates**
2. Personalize os templates com:
   - Logo da empresa
   - Cores da marca
   - Texto personalizado

---

## ✅ Checklist de Configuração

- [ ] Templates de email verificados no Dashboard
- [ ] URL de redirecionamento configurada
- [ ] `NEXT_PUBLIC_APP_URL` configurado no `.env.local`
- [ ] Teste de convite realizado
- [ ] Email recebido (verificar spam)
- [ ] Link do email funciona corretamente
- [ ] SMTP customizado configurado (produção)

---

## 🔗 Links Úteis

- [Documentação Supabase - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Documentação Supabase - SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid](https://sendgrid.com/)
- [Mailgun](https://www.mailgun.com/)

---

## 📞 Próximos Passos

1. **Verifique as configurações** no Dashboard do Supabase
2. **Teste o envio** de um convite
3. **Configure SMTP customizado** para produção (recomendado)

---

**Status**: ⚠️ Verificar configurações no Dashboard do Supabase
