# 📧 Instruções: Como Copiar os Templates de Email no Supabase

**Data**: 20 de Janeiro de 2026  
**Status**: ✅ Templates prontos para uso

---

## 🎯 Objetivo

Copiar os templates de email modernos e profissionais para o Supabase Dashboard.

---

## 📋 Templates Disponíveis

Criei 3 templates profissionais:

1. ✅ **Confirm sign up** - Confirmação de cadastro
2. ✅ **Invite user** - Convite de usuário
3. ✅ **Reset password** - Redefinição de senha

---

## 📝 Passo a Passo para Copiar

### 1. Acessar Templates no Supabase

1. Acesse: https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/auth/templates
2. Certifique-se de estar na aba **"Templates"**

### 2. Para "Confirm sign up"

1. Clique em **"Confirm sign up"** na lista
2. Você verá o editor de template
3. **Copie TODO o conteúdo** do arquivo `TEMPLATE_EMAIL_CONFIRM_SIGNUP.html`
4. **Cole no editor** do Supabase (substitua o conteúdo existente)
5. Clique em **"Save"** ou **"Salvar"**

### 3. Para "Invite user"

1. Clique em **"Invite user"** na lista
2. Você verá o editor de template
3. **Copie TODO o conteúdo** do arquivo `TEMPLATE_EMAIL_INVITE_USER.html`
4. **Cole no editor** do Supabase (substitua o conteúdo existente)
5. Clique em **"Save"** ou **"Salvar"**

### 4. Para "Reset password"

1. Clique em **"Reset password"** na lista
2. Você verá o editor de template
3. **Copie TODO o conteúdo** do arquivo `TEMPLATE_EMAIL_RESET_PASSWORD.html`
4. **Cole no editor** do Supabase (substitua o conteúdo existente)
5. Clique em **"Save"** ou **"Salvar"**

---

## ⚠️ IMPORTANTE: Variáveis do Supabase

Os templates usam variáveis do Supabase que **NÃO devem ser alteradas**:

- `{{ .ConfirmationURL }}` - Link de confirmação/convite
- `{{ .Email }}` - Email do usuário
- `{{ .SiteURL }}` - URL do site
- `{{ .RedirectTo }}` - URL de redirecionamento

**NÃO remova ou altere essas variáveis!** Elas são substituídas automaticamente pelo Supabase.

---

## 🎨 Características dos Templates

✅ **Design Moderno**: Gradientes, sombras e bordas arredondadas  
✅ **Responsivo**: Funciona em desktop e mobile  
✅ **Profissional**: Cores corporativas e tipografia limpa  
✅ **Compatível**: Funciona na maioria dos clientes de email  
✅ **Acessível**: Boa legibilidade e contraste  
✅ **Branding**: Inclui logo e informações da empresa  

---

## 🧪 Como Testar

### 1. Testar "Confirm sign up"

1. Crie um novo cadastro no sistema
2. Verifique o email recebido
3. O template deve aparecer formatado

### 2. Testar "Invite user"

1. Convide um novo usuário
2. Verifique o email recebido
3. O template deve aparecer formatado

### 3. Testar "Reset password"

1. Solicite redefinição de senha
2. Verifique o email recebido
3. O template deve aparecer formatado

---

## 🔧 Personalização (Opcional)

Se quiser personalizar os templates:

### Cores

Os templates usam a paleta azul (`#2563eb`, `#1e40af`). Para mudar:

1. Procure por `#2563eb` e `#1e40af` no código
2. Substitua pelas cores da sua marca
3. Mantenha o contraste para acessibilidade

### Logo

Atualmente usa emoji 🏗️. Para adicionar logo:

1. Faça upload da imagem em um serviço (ex: Imgur, Cloudinary)
2. Substitua a linha do emoji por:
   ```html
   <img src="URL_DA_SUA_IMAGEM" alt="Construtivo" style="max-width: 200px; height: auto;">
   ```

### Textos

Você pode personalizar qualquer texto nos templates, mas **mantenha as variáveis** `{{ .ConfirmationURL }}` etc.

---

## ✅ Checklist

- [ ] Template "Confirm sign up" copiado e salvo
- [ ] Template "Invite user" copiado e salvo
- [ ] Template "Reset password" copiado e salvo
- [ ] Testado envio de email de confirmação
- [ ] Testado envio de email de convite
- [ ] Testado envio de email de redefinição
- [ ] Templates aparecem formatados corretamente

---

## 📁 Arquivos dos Templates

Os templates estão nos arquivos:

- `docs/TEMPLATE_EMAIL_CONFIRM_SIGNUP.html`
- `docs/TEMPLATE_EMAIL_INVITE_USER.html`
- `docs/TEMPLATE_EMAIL_RESET_PASSWORD.html`

---

## 🚀 Próximos Passos

1. **Copie os templates** seguindo o passo a passo acima
2. **Teste o envio** de cada tipo de email
3. **Personalize** se desejar (cores, logo, textos)
4. **Configure SMTP** para produção (recomendado)

---

**Status**: ✅ Templates prontos para copiar e usar!
