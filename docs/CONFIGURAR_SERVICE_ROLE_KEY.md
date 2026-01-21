# 🔐 Configurar Service Role Key

**Data**: 20 de Janeiro de 2026  
**Status**: ✅ Configuração necessária para funcionalidade de convite de usuários

---

## 🎯 Objetivo

Configurar a `SUPABASE_SERVICE_ROLE_KEY` no ambiente local para permitir que a API route `/api/convidar-usuario` funcione corretamente.

---

## ⚠️ IMPORTANTE: Segurança

A **Service Role Key** é uma chave secreta que:
- ✅ **PODE** ser usada em **API routes do servidor** (Next.js)
- ❌ **NUNCA** deve ser exposta no **frontend** ou código do cliente
- ❌ **NUNCA** deve ser commitada no Git
- ⚠️ Tem acesso total ao banco de dados, **ignorando RLS**

---

## 📋 Passo a Passo

### 1. Adicionar a Chave no `.env.local`

1. Abra o arquivo `.env.local` na raiz do projeto
2. Se o arquivo não existir, crie-o
3. Adicione a seguinte linha:

```env
SUPABASE_SERVICE_ROLE_KEY=<cole_aqui_a_sua_service_role_key_do_supabase>
```

### 2. Verificar se o arquivo está no `.gitignore`

O arquivo `.env.local` já está configurado no `.gitignore`, então está seguro.

### 3. Reiniciar o servidor de desenvolvimento

Após adicionar a variável, reinicie o servidor:

```bash
# Parar o servidor (Ctrl+C)
# Depois iniciar novamente
npm run dev
```

---

## 🧪 Testar a Configuração

1. Acesse a página de **Configurações** > **Usuários e Permissões**
2. Clique em **"Convidar Usuário"**
3. Preencha o email e selecione a permissão
4. Clique em **"Enviar Convite"**

**Resultado esperado**: 
- ✅ Mensagem de sucesso: "Convite enviado para [email]..."
- ✅ Usuário aparece na lista (com status inativo até confirmar email)

---

## 🚀 Configuração em Produção (Vercel)

Para configurar na Vercel:

1. Acesse o dashboard da Vercel: https://vercel.com/dashboard
2. Selecione o projeto "Construtivo Obra"
3. Vá em **Settings** > **Environment Variables**
4. Adicione a variável:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: `<cole_aqui_a_sua_service_role_key_do_supabase>`
   - **Environment**: Production, Preview, Development (marque todos)
5. Clique em **Save**
6. Faça um novo deploy para aplicar as mudanças

---

## 🔍 Verificar se está funcionando

Se a chave estiver configurada corretamente, você verá no console do servidor (ao tentar convidar um usuário):

```
✅ Usuário criado no auth.users
✅ Registro criado em usuarios
```

Se houver erro, verifique:
- ✅ A variável está no `.env.local`?
- ✅ O servidor foi reiniciado após adicionar a variável?
- ✅ A chave está correta (sem espaços extras)?

---

## 📝 Estrutura do Arquivo `.env.local`

Seu arquivo `.env.local` deve ter esta estrutura:

```env
# Configurações do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zgoafwgxenhwhkxdkwox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<cole_aqui_a_sua_anon_key_do_supabase>

# Service Role Key (SECRET - apenas para uso no servidor)
SUPABASE_SERVICE_ROLE_KEY=<cole_aqui_a_sua_service_role_key_do_supabase>

# Outras configurações
NEXT_PUBLIC_APP_URL=http://localhost:3001
NODE_ENV=development
```

---

## 🚨 Troubleshooting

### Erro: "Service role key não configurada"

**Causa**: A variável `SUPABASE_SERVICE_ROLE_KEY` não está definida.

**Solução**:
1. Verifique se o arquivo `.env.local` existe
2. Verifique se a variável está escrita corretamente (sem espaços)
3. Reinicie o servidor de desenvolvimento

### Erro: "Erro ao criar usuário no auth"

**Causa**: A service role key pode estar incorreta ou expirada.

**Solução**:
1. Verifique a chave no Supabase Dashboard
2. Se necessário, gere uma nova chave
3. Atualize o `.env.local` e reinicie o servidor

---

## ✅ Checklist

- [ ] Arquivo `.env.local` criado/atualizado
- [ ] Variável `SUPABASE_SERVICE_ROLE_KEY` adicionada
- [ ] Servidor reiniciado
- [ ] Teste de convite de usuário realizado
- [ ] Configuração na Vercel (produção) realizada

---

**Próximo Passo**: Adicione a chave no `.env.local` e teste o convite de usuário!
