-- =====================================================
-- SCRIPT: Criar Trigger para Sincronizar auth.users → public.usuarios
-- Projeto: Construtivo Obra (zgoafwgxenhwhkxdkwox)
-- Objetivo: Automatizar criação de registro em usuarios quando novo user é criado
-- =====================================================

-- IMPORTANTE: Este script precisa ser executado com privilégios de superusuário
-- Execute através do Dashboard do Supabase ou com usuário postgres

-- =====================================================
-- VERIFICAR SE A FUNÇÃO JÁ EXISTE
-- =====================================================

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- =====================================================
-- CRIAR O TRIGGER (Requer privilégios elevados)
-- =====================================================

-- Opção 1: Criar trigger direto (SE você tiver permissão)
DO $$
BEGIN
  -- Remover trigger se já existir
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Criar novo trigger
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
    
  RAISE NOTICE 'Trigger criado com sucesso!';
  
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'ERRO: Sem permissões suficientes. Use uma das alternativas abaixo.';
  WHEN OTHERS THEN
    RAISE NOTICE 'ERRO: %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICAR SE O TRIGGER FOI CRIADO
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Resultado esperado:
-- trigger_name: on_auth_user_created
-- event_manipulation: INSERT
-- action_statement: EXECUTE FUNCTION public.handle_new_user()
-- action_timing: AFTER

-- =====================================================
-- ALTERNATIVA: Configurar via Supabase Webhooks
-- =====================================================

/*
Se o comando acima falhar com erro de permissão, configure via Dashboard:

1. Acesse: https://supabase.com/dashboard/project/zgoafwgxenhwhkxdkwox/database/hooks

2. Clique em "Create a new hook"

3. Configure:
   - Name: sync_new_user_to_usuarios
   - Schema: auth
   - Table: users
   - Events: INSERT
   - Type: postgres_changes
   - Postgres Function: public.handle_new_user

4. Salve e teste criando um novo usuário
*/

-- =====================================================
-- TESTAR O TRIGGER
-- =====================================================

-- Ver usuários atuais
SELECT 'Usuários em auth.users:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

SELECT 'Usuários em public.usuarios:' as info;
SELECT id, nome, email, role FROM public.usuarios ORDER BY created_at DESC LIMIT 5;

-- Verificar sincronização
SELECT 
  'Status de Sincronização:' as info,
  COUNT(au.id) as total_auth_users,
  COUNT(pu.id) as total_usuarios,
  CASE 
    WHEN COUNT(au.id) = COUNT(pu.id) THEN '✅ TODOS SINCRONIZADOS'
    ELSE '⚠️ FALTAM SINCRONIZAR'
  END as status
FROM auth.users au
LEFT JOIN public.usuarios pu ON pu.id = au.id;

-- =====================================================
-- SINCRONIZAR USUÁRIOS EXISTENTES (Se necessário)
-- =====================================================

-- Se houver usuários em auth.users que não estão em public.usuarios, execute:
INSERT INTO public.usuarios (
  id,
  nome,
  email,
  role,
  ativo,
  data_ativacao,
  created_at,
  updated_at,
  ultimo_acesso
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'nome', SPLIT_PART(au.email, '@', 1)) as nome,
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'membro') as role,
  true as ativo,
  NOW() as data_ativacao,
  au.created_at,
  NOW() as updated_at,
  NOW() as ultimo_acesso
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.usuarios)
ON CONFLICT (id) DO NOTHING;

-- Verificar resultado
SELECT '✅ Usuários sincronizados:' as info;
SELECT id, nome, email, role, ativo FROM public.usuarios ORDER BY created_at DESC;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

<think>O trigger não existe ainda. Vou verificar as extensões disponíveis e tentar outra abordagem. Na verdade, o melhor é criar um script SQL que o usuário possa executar com privilégios elevados ou orientá-lo a usar o Dashboard.

Vou criar um script SQL que ele pode executar como superusuário e também verificar se posso usar a extensão supabase_admin.</think>
