# 🚀 Configurar Variáveis de Ambiente no Vercel

**Data**: 26 de Janeiro de 2026  
**Status**: ✅ Guia completo para deploy no Vercel

---

## 🎯 Objetivo

Configurar todas as variáveis de ambiente necessárias no Vercel para que o deploy funcione corretamente.

---

## 📋 Variáveis Necessárias

O projeto precisa das seguintes variáveis de ambiente:

1. `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto Supabase
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima (pública) do Supabase
3. `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (secreta) do Supabase
4. `NEXT_PUBLIC_APP_URL` - URL da aplicação (opcional, mas recomendado)

---

## 🔑 Onde Encontrar as Chaves no Supabase

### Passo 1: Acessar o Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: **Construtivo Obra** (ID: `zgoafwgxenhwhkxdkwox`)

### Passo 2: Encontrar as Chaves

1. No menu lateral esquerdo, clique em **Settings** (⚙️)
2. Clique em **API** na submenu
3. Você verá a seção **Project API keys**

---

## 📝 Valores das Variáveis

### 1. NEXT_PUBLIC_SUPABASE_URL

**Onde encontrar:**
- No Supabase Dashboard: **Settings** > **API** > **Project URL**

**Valor:**
```
https://zgoafwgxenhwhkxdkwox.supabase.co
```

---

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

**Onde encontrar:**
- No Supabase Dashboard: **Settings** > **API** > **Project API keys** > **anon public**

**Valor:**
```
<cole_aqui_a_sua_anon_key_do_supabase>
```

⚠️ **Nota**: Esta chave é pública e pode ser exposta no frontend.

---

### 3. SUPABASE_SERVICE_ROLE_KEY

**Onde encontrar:**
- No Supabase Dashboard: **Settings** > **API** > **Project API keys** > **service_role secret**

**Valor:**
```
<cole_aqui_a_sua_service_role_key_do_supabase>
```

⚠️ **IMPORTANTE**: Esta chave é **SECRETA** e **NUNCA** deve ser exposta no frontend. Ela tem acesso total ao banco de dados, ignorando RLS (Row Level Security).

---

### 4. NEXT_PUBLIC_APP_URL (Opcional)

**Valor para produção:**
```
https://construtivo-obra.vercel.app
```

Ou a URL customizada do seu domínio, se houver.

---

## 🚀 Como Configurar no Vercel

### Passo 1: Acessar o Projeto no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **Construtivo-Obra**

### Passo 2: Adicionar Variáveis de Ambiente

1. No menu do projeto, clique em **Settings**
2. No menu lateral, clique em **Environment Variables**
3. Você verá uma tabela com as variáveis existentes (se houver)

### Passo 3: Adicionar Cada Variável

Para cada variável, siga estes passos:

1. Clique no botão **Add New** (ou **Add More** se já houver variáveis)
2. Preencha:
   - **Key**: Nome da variável (ex: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Valor da variável (cole o valor correspondente)
   - **Environment**: Marque todas as opções:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
3. Clique em **Save**

### Passo 4: Adicionar Todas as Variáveis

Adicione as seguintes variáveis nesta ordem:

#### Variável 1:
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://zgoafwgxenhwhkxdkwox.supabase.co`
- **Environment**: Production, Preview, Development

#### Variável 2:
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `<cole_aqui_a_sua_anon_key_do_supabase>`
- **Environment**: Production, Preview, Development

#### Variável 3:
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `<cole_aqui_a_sua_service_role_key_do_supabase>`
- **Environment**: Production, Preview, Development

#### Variável 4 (Opcional):
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://construtivo-obra.vercel.app` (ou sua URL customizada)
- **Environment**: Production, Preview, Development

---

## ✅ Após Configurar as Variáveis

### 1. Fazer um Novo Deploy

Após adicionar todas as variáveis:

1. Vá para a aba **Deployments**
2. Clique nos três pontos (⋯) do último deploy
3. Selecione **Redeploy**
4. Ou faça um novo commit e push para o GitHub (o Vercel fará deploy automaticamente)

### 2. Verificar o Deploy

1. Aguarde o deploy concluir
2. Verifique os logs do build
3. Se tudo estiver correto, você verá: **"Build Completed"**

---

## 🔍 Verificar se Está Funcionando

### Teste 1: Verificar Variáveis no Build

Nos logs do build no Vercel, você não deve ver erros relacionados a:
- ❌ "NEXT_PUBLIC_SUPABASE_URL is not defined"
- ❌ "NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined"
- ❌ "SUPABASE_SERVICE_ROLE_KEY is not defined"

### Teste 2: Acessar a Aplicação

1. Acesse a URL do deploy (ex: `https://construtivo-obra.vercel.app`)
2. Tente fazer login
3. Se funcionar, as variáveis estão configuradas corretamente

---

## 🚨 Troubleshooting

### Erro: "Build failed"

**Possíveis causas:**
1. Variáveis não foram adicionadas corretamente
2. Valores das variáveis estão incorretos
3. Espaços extras nos valores

**Solução:**
1. Verifique se todas as variáveis foram adicionadas
2. Verifique se os valores estão corretos (sem espaços no início/fim)
3. Verifique se todas as opções de Environment foram marcadas

### Erro: "Invalid API key"

**Causa**: A chave do Supabase está incorreta ou expirada.

**Solução:**
1. Acesse o Supabase Dashboard
2. Vá em **Settings** > **API**
3. Copie novamente as chaves
4. Atualize as variáveis no Vercel

### Erro: "Service role key não configurada"

**Causa**: A variável `SUPABASE_SERVICE_ROLE_KEY` não foi adicionada ou está incorreta.

**Solução:**
1. Verifique se a variável foi adicionada no Vercel
2. Verifique se o valor está correto
3. Faça um novo deploy após corrigir

---

## 📸 Imagem de Referência

No Vercel, a seção de **Environment Variables** deve ficar assim:

```
┌─────────────────────────────────────────────────────────┐
│ Environment Variables                                    │
├─────────────────────────────────────────────────────────┤
│ Key                          │ Value                     │
├─────────────────────────────────────────────────────────┤
│ NEXT_PUBLIC_SUPABASE_URL     │ https://...supabase.co   │
│ NEXT_PUBLIC_SUPABASE_ANON_KEY│ <anon_key>               │
│ SUPABASE_SERVICE_ROLE_KEY    │ <service_role_key>       │
│ NEXT_PUBLIC_APP_URL          │ https://...vercel.app   │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Final

Antes de considerar o deploy completo, verifique:

- [ ] Todas as 4 variáveis foram adicionadas no Vercel
- [ ] Todas as variáveis estão marcadas para Production, Preview e Development
- [ ] Os valores das variáveis estão corretos (sem espaços extras)
- [ ] Um novo deploy foi realizado após adicionar as variáveis
- [ ] O build foi concluído com sucesso
- [ ] A aplicação está acessível e funcionando

---

## 🔗 Links Úteis

- **Supabase Dashboard**: https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/settings/api
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentação Vercel**: https://vercel.com/docs/environment-variables

---

**Próximo Passo**: Adicione todas as variáveis no Vercel e faça um novo deploy!
