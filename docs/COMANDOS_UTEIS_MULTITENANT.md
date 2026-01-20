# Comandos Úteis - Multitenant Construtivo Obra

Coleção de comandos SQL e snippets úteis para trabalhar com o sistema multitenant.

---

## Consultas Úteis

### Ver Todas as Empresas

```sql
SELECT 
  id, 
  nome, 
  email, 
  cnpj,
  status,
  TO_CHAR(data_inicio_trial, 'DD/MM/YYYY') AS inicio_trial,
  TO_CHAR(data_fim_trial, 'DD/MM/YYYY') AS fim_trial,
  CASE 
    WHEN status = 'trial' THEN EXTRACT(DAY FROM data_fim_trial - NOW())::INTEGER 
    ELSE NULL 
  END AS dias_restantes_trial
FROM public.empresas
ORDER BY created_at DESC;
```

### Ver Planos Disponíveis

```sql
SELECT 
  id,
  nome,
  'R$ ' || preco_mensal AS mensal,
  'R$ ' || preco_anual AS anual,
  COALESCE(limite_usuarios::TEXT, 'Ilimitado') AS usuarios,
  COALESCE(limite_obras::TEXT, 'Ilimitado') AS obras,
  ativo
FROM public.planos
ORDER BY ordem;
```

### Ver Assinaturas Ativas

```sql
SELECT 
  e.nome AS empresa,
  p.nome AS plano,
  a.periodicidade,
  a.status,
  TO_CHAR(a.data_inicio, 'DD/MM/YYYY') AS inicio,
  TO_CHAR(a.data_fim, 'DD/MM/YYYY') AS fim,
  a.renovacao_automatica
FROM public.assinaturas a
JOIN public.empresas e ON e.id = a.empresa_id
JOIN public.planos p ON p.id = a.plano_id
WHERE a.status = 'active'
ORDER BY e.nome;
```

### Ver Usuários por Empresa

```sql
SELECT 
  e.nome AS empresa,
  u.nome AS usuario,
  u.email,
  u.role,
  u.ativo,
  TO_CHAR(u.ultimo_acesso, 'DD/MM/YYYY HH24:MI') AS ultimo_acesso
FROM public.usuarios u
JOIN public.empresas e ON e.id = u.empresa_id
ORDER BY e.nome, u.nome;
```

### Ver Estatísticas por Empresa

```sql
SELECT 
  e.id,
  e.nome AS empresa,
  e.status,
  COUNT(DISTINCT u.id) AS total_usuarios,
  COUNT(DISTINCT o.id) AS total_obras,
  COUNT(DISTINCT f.id) AS total_fornecedores,
  COUNT(DISTINCT n.id) AS total_negociacoes
FROM public.empresas e
LEFT JOIN public.usuarios u ON u.empresa_id = e.id
LEFT JOIN public.obras o ON o.empresa_id = e.id
LEFT JOIN public.fornecedores f ON f.empresa_id = e.id
LEFT JOIN public.negociacoes n ON n.empresa_id = e.id
GROUP BY e.id, e.nome, e.status
ORDER BY e.nome;
```

### Ver Uso vs Limites do Plano

```sql
SELECT 
  e.nome AS empresa,
  p.nome AS plano,
  
  -- Usuários
  COUNT(DISTINCT u.id) AS usuarios_atuais,
  COALESCE(p.limite_usuarios::TEXT, 'Ilimitado') AS limite_usuarios,
  CASE 
    WHEN p.limite_usuarios IS NULL THEN '✅ OK'
    WHEN COUNT(DISTINCT u.id) >= p.limite_usuarios THEN '⚠️ LIMITE ATINGIDO'
    ELSE '✅ OK'
  END AS status_usuarios,
  
  -- Obras
  COUNT(DISTINCT o.id) AS obras_atuais,
  COALESCE(p.limite_obras::TEXT, 'Ilimitado') AS limite_obras,
  CASE 
    WHEN p.limite_obras IS NULL THEN '✅ OK'
    WHEN COUNT(DISTINCT o.id) >= p.limite_obras THEN '⚠️ LIMITE ATINGIDO'
    ELSE '✅ OK'
  END AS status_obras
  
FROM public.empresas e
JOIN public.assinaturas a ON a.empresa_id = e.id AND a.status = 'active'
JOIN public.planos p ON p.id = a.plano_id
LEFT JOIN public.usuarios u ON u.empresa_id = e.id
LEFT JOIN public.obras o ON o.empresa_id = e.id
GROUP BY e.id, e.nome, p.id, p.nome, p.limite_usuarios, p.limite_obras
ORDER BY e.nome;
```

---

## Operações Administrativas

### Criar Nova Empresa Manualmente

```sql
INSERT INTO public.empresas (nome, razao_social, cnpj, email, status, data_inicio_trial, data_fim_trial)
VALUES (
  'Nome da Empresa',
  'Razão Social da Empresa LTDA',
  '12.345.678/0001-90',
  'contato@empresa.com',
  'trial',
  NOW(),
  NOW() + INTERVAL '15 days'
)
RETURNING *;
```

### Ativar Empresa (Trial → Active)

```sql
UPDATE public.empresas
SET status = 'active'
WHERE id = <empresa_id>;
```

### Suspender Empresa

```sql
UPDATE public.empresas
SET status = 'suspended'
WHERE id = <empresa_id>;
```

### Cancelar Empresa

```sql
UPDATE public.empresas
SET status = 'cancelled'
WHERE id = <empresa_id>;

-- Também cancelar assinatura
UPDATE public.assinaturas
SET 
  status = 'cancelled',
  data_cancelamento = NOW(),
  motivo_cancelamento = 'Cancelamento manual'
WHERE empresa_id = <empresa_id> AND status = 'active';
```

### Estender Trial

```sql
UPDATE public.empresas
SET data_fim_trial = data_fim_trial + INTERVAL '15 days'
WHERE id = <empresa_id>;
```

### Tornar Usuário Admin

```sql
UPDATE public.usuarios
SET role = 'admin'
WHERE id = '<usuario_uuid>' AND empresa_id = <empresa_id>;
```

### Criar Assinatura

```sql
INSERT INTO public.assinaturas (
  empresa_id,
  plano_id,
  data_inicio,
  periodicidade,
  valor_mensal,
  valor_anual,
  status,
  renovacao_automatica
)
VALUES (
  <empresa_id>,
  (SELECT id FROM planos WHERE nome = 'Básico'),
  NOW(),
  'mensal', -- ou 'anual'
  99.90,
  NULL,
  'active',
  true
)
RETURNING *;
```

---

## Verificações de Segurança

### Verificar Políticas RLS

```sql
-- Ver todas as políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Verificar RLS Habilitado

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Testar Função get_user_empresa_id()

```sql
-- Requer usuário autenticado
SELECT get_user_empresa_id();
```

### Testar Função is_empresa_admin()

```sql
-- Requer usuário autenticado
SELECT is_empresa_admin();
```

### Testar Função is_empresa_ativa()

```sql
-- Requer usuário autenticado
SELECT is_empresa_ativa();
```

---

## Consultas de Auditoria

### Ver Todas as Tabelas com empresa_id

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE 
  table_schema = 'public' 
  AND column_name = 'empresa_id'
ORDER BY table_name;
```

### Ver Índices em empresa_id

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE 
  schemaname = 'public' 
  AND indexdef LIKE '%empresa_id%'
ORDER BY tablename;
```

### Ver Foreign Keys para empresas

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'empresas'
ORDER BY tc.table_name;
```

---

## Limpeza e Manutenção

### Deletar Empresa e Todos os Dados (CASCADE)

```sql
-- CUIDADO: Isso remove TUDO relacionado à empresa!
DELETE FROM public.empresas
WHERE id = <empresa_id>;
-- O CASCADE vai remover automaticamente:
-- - Usuários
-- - Assinaturas
-- - Obras
-- - Orçamentos
-- - Negociações
-- - Medições
-- - Fornecedores
-- - Pedidos
-- - Clientes
-- - Parcelas
-- E tudo mais vinculado à empresa
```

### Limpar Empresas de Teste

```sql
DELETE FROM public.empresas
WHERE nome LIKE '%Teste%' OR email LIKE '%teste.com';
```

### Remover Empresas Canceladas há Mais de 90 Dias

```sql
DELETE FROM public.empresas
WHERE 
  status = 'cancelled' 
  AND updated_at < NOW() - INTERVAL '90 days';
```

---

## Relatórios

### Relatório de Receita por Plano

```sql
SELECT 
  p.nome AS plano,
  COUNT(a.id) AS total_assinaturas,
  COUNT(CASE WHEN a.periodicidade = 'mensal' THEN 1 END) AS mensais,
  COUNT(CASE WHEN a.periodicidade = 'anual' THEN 1 END) AS anuais,
  SUM(COALESCE(a.valor_mensal, 0)) AS receita_mensal,
  SUM(COALESCE(a.valor_anual, 0)) AS receita_anual
FROM public.planos p
LEFT JOIN public.assinaturas a ON a.plano_id = p.id AND a.status = 'active'
GROUP BY p.id, p.nome, p.ordem
ORDER BY p.ordem;
```

### Relatório de Trials Expirando

```sql
SELECT 
  e.id,
  e.nome,
  e.email,
  TO_CHAR(e.data_fim_trial, 'DD/MM/YYYY') AS expira_em,
  EXTRACT(DAY FROM e.data_fim_trial - NOW())::INTEGER AS dias_restantes
FROM public.empresas e
WHERE 
  e.status = 'trial'
  AND e.data_fim_trial BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY e.data_fim_trial;
```

### Relatório de Crescimento

```sql
SELECT 
  TO_CHAR(created_at, 'YYYY-MM') AS mes,
  COUNT(*) AS novas_empresas,
  COUNT(CASE WHEN status = 'active' THEN 1 END) AS ativas,
  COUNT(CASE WHEN status = 'trial' THEN 1 END) AS em_trial,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS canceladas
FROM public.empresas
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY mes DESC
LIMIT 12;
```

### Empresas Mais Ativas

```sql
SELECT 
  e.nome,
  COUNT(DISTINCT o.id) AS obras,
  COUNT(DISTINCT n.id) AS negociacoes,
  COUNT(DISTINCT m.id) AS medicoes,
  COUNT(DISTINCT pc.id) AS pedidos_compra,
  COUNT(DISTINCT u.id) AS usuarios
FROM public.empresas e
LEFT JOIN public.obras o ON o.empresa_id = e.id
LEFT JOIN public.negociacoes n ON n.empresa_id = e.id
LEFT JOIN public.medicoes m ON m.empresa_id = e.id
LEFT JOIN public.pedidos_compra pc ON pc.empresa_id = e.id
LEFT JOIN public.usuarios u ON u.empresa_id = e.id
WHERE e.status IN ('active', 'trial')
GROUP BY e.id, e.nome
ORDER BY COUNT(DISTINCT o.id) DESC
LIMIT 10;
```

---

## Troubleshooting

### Ver Erros de RLS

Se uma query falhar com erro de permissão:

```sql
-- 1. Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = '<nome_tabela>';

-- 2. Ver políticas da tabela
SELECT * FROM pg_policies 
WHERE tablename = '<nome_tabela>';

-- 3. Testar função auxiliar
SELECT get_user_empresa_id();

-- 4. Verificar usuário está associado a uma empresa
SELECT u.*, e.nome AS empresa_nome
FROM usuarios u
LEFT JOIN empresas e ON e.id = u.empresa_id
WHERE u.id = auth.uid();
```

### Resetar Senha de Usuário (via Supabase Auth)

```sql
-- Isso gera um email de reset
-- Use o Supabase Dashboard ou API para isso
-- Não é possível fazer diretamente no SQL por segurança
```

### Ver Últimas Ações

```sql
-- Se você tiver logging habilitado
SELECT * FROM <sua_tabela_de_logs>
ORDER BY created_at DESC
LIMIT 100;
```

---

## Comandos TypeScript/JavaScript

### Obter Empresa do Usuário Logado

```typescript
const { data: usuario } = await supabase
  .from('usuarios')
  .select('empresa_id, role, empresa:empresas(*)')
  .eq('id', (await supabase.auth.getUser()).data.user.id)
  .single();
```

### Verificar Limite de Usuários

```typescript
async function verificarLimiteUsuarios(empresaId: number): Promise<boolean> {
  // Buscar plano
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano:planos(limite_usuarios)')
    .eq('empresa_id', empresaId)
    .eq('status', 'active')
    .single();
  
  const limite = assinatura?.plano?.limite_usuarios;
  if (limite === null) return true; // Ilimitado
  
  // Contar usuários
  const { count } = await supabase
    .from('usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId);
  
  return (count || 0) < limite;
}
```

### Criar Registro com empresa_id

```typescript
const { data: usuario } = await supabase
  .from('usuarios')
  .select('empresa_id')
  .eq('id', (await supabase.auth.getUser()).data.user.id)
  .single();

const { data, error } = await supabase
  .from('obras')
  .insert({
    nome: 'Nova Obra',
    empresa_id: usuario.empresa_id, // Obrigatório!
    status: 'Em andamento'
  });
```

---

## Backup e Restore

### Backup de Empresa Específica

```bash
# Via pg_dump (linha de comando)
pg_dump \
  --host=<supabase-host> \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --table=empresas \
  --table=usuarios \
  --table=obras \
  --where="empresa_id = <ID>" \
  > backup_empresa_<ID>.sql
```

### Restore

```bash
psql \
  --host=<supabase-host> \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  < backup_empresa_<ID>.sql
```

---

## Performance

### Analisar Queries Lentas

```sql
-- Ver queries mais lentas
SELECT 
  calls,
  total_time,
  mean_time,
  query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Ver Tamanho das Tabelas

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Referências Rápidas

### Status de Empresa
- `trial`: Período de teste (15 dias)
- `active`: Assinatura ativa
- `suspended`: Suspensa (falta de pagamento)
- `cancelled`: Cancelada

### Roles de Usuário
- `admin`: Administrador da empresa
- `membro`: Membro da equipe
- `visualizador`: Apenas leitura

### Status de Assinatura
- `active`: Ativa
- `cancelled`: Cancelada
- `expired`: Expirada
- `suspended`: Suspensa

---

**Dica**: Salve este arquivo como favorito e use como referência rápida!
