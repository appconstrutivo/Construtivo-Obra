-- =====================================================
-- SCRIPT DE TESTE: Isolamento Multitenant
-- Projeto: Construtivo Obra
-- Objetivo: Validar que o isolamento entre empresas funciona
-- =====================================================

-- Este script cria dados de teste para validar o isolamento multitenant.
-- Execute após aplicar MIGRATION_MULTITENANT.sql

-- =====================================================
-- PARTE 1: CRIAR EMPRESAS DE TESTE
-- =====================================================

-- Limpar dados de teste anteriores (se existirem)
DELETE FROM public.empresas WHERE nome LIKE 'Empresa Teste%';

-- Criar 2 empresas de teste
INSERT INTO public.empresas (nome, email, cnpj, status, data_inicio_trial, data_fim_trial)
VALUES 
  ('Empresa Teste A', 'empresaa@teste.com', '12.345.678/0001-90', 'active', NOW(), NOW() + INTERVAL '30 days'),
  ('Empresa Teste B', 'empresab@teste.com', '98.765.432/0001-10', 'active', NOW(), NOW() + INTERVAL '30 days')
RETURNING id, nome;

-- Anotar os IDs retornados:
-- Empresa Teste A: ID = ?
-- Empresa Teste B: ID = ?

-- =====================================================
-- PARTE 2: CRIAR USUÁRIOS DE TESTE
-- =====================================================

-- IMPORTANTE: Estes comandos criam registros em public.usuarios
-- mas NÃO criam usuários em auth.users.
-- Para testes completos, use o Supabase Dashboard para criar usuários reais.

-- Criar usuários fictícios (para testes de consulta)
INSERT INTO public.usuarios (id, nome, email, empresa_id, role, ativo)
VALUES
  -- Usuário da Empresa A (substitua o UUID por um real do auth.users)
  ('00000000-0000-0000-0000-000000000001', 'Admin Empresa A', 'admina@teste.com', 
   (SELECT id FROM empresas WHERE nome = 'Empresa Teste A'), 'admin', true),
  
  -- Usuário da Empresa B
  ('00000000-0000-0000-0000-000000000002', 'Admin Empresa B', 'adminb@teste.com', 
   (SELECT id FROM empresas WHERE nome = 'Empresa Teste B'), 'admin', true);

-- =====================================================
-- PARTE 3: CRIAR DADOS DE TESTE
-- =====================================================

-- Obter IDs das empresas
DO $$
DECLARE
  empresa_a_id BIGINT;
  empresa_b_id BIGINT;
BEGIN
  SELECT id INTO empresa_a_id FROM public.empresas WHERE nome = 'Empresa Teste A';
  SELECT id INTO empresa_b_id FROM public.empresas WHERE nome = 'Empresa Teste B';

  -- Criar obras para Empresa A
  INSERT INTO public.obras (nome, endereco, status, empresa_id)
  VALUES 
    ('Obra 1 da Empresa A', 'Rua A, 123', 'Em andamento', empresa_a_id),
    ('Obra 2 da Empresa A', 'Rua A, 456', 'Em andamento', empresa_a_id);

  -- Criar obras para Empresa B
  INSERT INTO public.obras (nome, endereco, status, empresa_id)
  VALUES 
    ('Obra 1 da Empresa B', 'Rua B, 789', 'Em andamento', empresa_b_id),
    ('Obra 2 da Empresa B', 'Rua B, 012', 'Em andamento', empresa_b_id);

  -- Criar fornecedores para Empresa A
  INSERT INTO public.fornecedores (codigo, nome, documento, empresa_id)
  VALUES 
    ('FA001', 'Fornecedor A1', '111.111.111-11', empresa_a_id),
    ('FA002', 'Fornecedor A2', '222.222.222-22', empresa_a_id);

  -- Criar fornecedores para Empresa B
  INSERT INTO public.fornecedores (codigo, nome, documento, empresa_id)
  VALUES 
    ('FB001', 'Fornecedor B1', '333.333.333-33', empresa_b_id),
    ('FB002', 'Fornecedor B2', '444.444.444-44', empresa_b_id);

  -- Criar centros de custo para Empresa A
  INSERT INTO public.centros_custo (codigo, descricao, empresa_id)
  VALUES 
    ('01', 'Centro de Custo A1', empresa_a_id),
    ('02', 'Centro de Custo A2', empresa_a_id);

  -- Criar centros de custo para Empresa B
  INSERT INTO public.centros_custo (codigo, descricao, empresa_id)
  VALUES 
    ('01', 'Centro de Custo B1', empresa_b_id),
    ('02', 'Centro de Custo B2', empresa_b_id);

  RAISE NOTICE 'Dados de teste criados com sucesso!';
END $$;

-- =====================================================
-- PARTE 4: TESTES DE ISOLAMENTO
-- =====================================================

-- Verificar dados criados
SELECT '=== EMPRESAS ===' AS secao;
SELECT id, nome, email, status FROM public.empresas WHERE nome LIKE 'Empresa Teste%';

SELECT '=== USUÁRIOS ===' AS secao;
SELECT id, nome, email, empresa_id, role FROM public.usuarios WHERE email LIKE '%@teste.com';

SELECT '=== OBRAS ===' AS secao;
SELECT id, nome, empresa_id, 
       (SELECT nome FROM empresas WHERE id = obras.empresa_id) AS nome_empresa
FROM public.obras 
WHERE empresa_id IN (SELECT id FROM empresas WHERE nome LIKE 'Empresa Teste%');

SELECT '=== FORNECEDORES ===' AS secao;
SELECT id, codigo, nome, empresa_id,
       (SELECT nome FROM empresas WHERE id = fornecedores.empresa_id) AS nome_empresa
FROM public.fornecedores 
WHERE empresa_id IN (SELECT id FROM empresas WHERE nome LIKE 'Empresa Teste%');

SELECT '=== CENTROS DE CUSTO ===' AS secao;
SELECT id, codigo, descricao, empresa_id,
       (SELECT nome FROM empresas WHERE id = centros_custo.empresa_id) AS nome_empresa
FROM public.centros_custo 
WHERE empresa_id IN (SELECT id FROM empresas WHERE nome LIKE 'Empresa Teste%');

-- =====================================================
-- PARTE 5: SIMULAR CONTEXTO DE USUÁRIO (RLS)
-- =====================================================

-- NOTA: Para testar RLS de verdade, você precisa estar autenticado
-- com um usuário real via Supabase Auth. Os comandos abaixo são apenas
-- demonstrativos e não funcionarão sem autenticação real.

-- Exemplo de como as políticas RLS filtram dados:

-- Simulando usuário da Empresa A
-- (Em produção, isso seria automático via auth.uid())
COMMENT ON TABLE public.obras IS 'Teste: Se logar como usuário da Empresa A, verá apenas obras da Empresa A';

-- Query que seria executada pelo usuário da Empresa A:
-- SELECT * FROM obras;
-- Resultado esperado: Apenas "Obra 1 da Empresa A" e "Obra 2 da Empresa A"

-- Query que seria executada pelo usuário da Empresa B:
-- SELECT * FROM obras;
-- Resultado esperado: Apenas "Obra 1 da Empresa B" e "Obra 2 da Empresa B"

-- =====================================================
-- PARTE 6: TESTAR POLÍTICAS RLS (Manual)
-- =====================================================

-- Para testar RLS de verdade:
-- 1. Crie usuários reais no Supabase Auth Dashboard
-- 2. Associe cada usuário a uma empresa em public.usuarios
-- 3. Faça login com cada usuário
-- 4. Execute: SELECT * FROM obras;
-- 5. Verifique que cada usuário vê apenas obras de sua empresa

-- =====================================================
-- PARTE 7: TESTAR FUNÇÕES AUXILIARES
-- =====================================================

-- Testar função get_user_empresa_id() (requer usuário autenticado)
-- SELECT get_user_empresa_id();
-- Resultado esperado: ID da empresa do usuário autenticado

-- Testar função is_empresa_admin() (requer usuário autenticado)
-- SELECT is_empresa_admin();
-- Resultado esperado: true se usuário é admin, false caso contrário

-- Testar função is_empresa_ativa() (requer usuário autenticado)
-- SELECT is_empresa_ativa();
-- Resultado esperado: true se empresa está ativa ou em trial

-- =====================================================
-- PARTE 8: TESTAR LIMITES DE PLANO
-- =====================================================

-- Criar assinaturas de teste para as empresas
DO $$
DECLARE
  empresa_a_id BIGINT;
  empresa_b_id BIGINT;
  plano_basico_id BIGINT;
BEGIN
  SELECT id INTO empresa_a_id FROM public.empresas WHERE nome = 'Empresa Teste A';
  SELECT id INTO empresa_b_id FROM public.empresas WHERE nome = 'Empresa Teste B';
  SELECT id INTO plano_basico_id FROM public.planos WHERE nome = 'Básico';

  -- Empresa A: Plano Básico (5 usuários, 3 obras)
  INSERT INTO public.assinaturas (empresa_id, plano_id, data_inicio, status, periodicidade, valor_mensal)
  VALUES (empresa_a_id, plano_basico_id, NOW(), 'active', 'mensal', 99.90)
  ON CONFLICT DO NOTHING;

  -- Empresa B: Plano Básico
  INSERT INTO public.assinaturas (empresa_id, plano_id, data_inicio, status, periodicidade, valor_mensal)
  VALUES (empresa_b_id, plano_basico_id, NOW(), 'active', 'mensal', 99.90)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Assinaturas de teste criadas!';
END $$;

-- Verificar limites das empresas
SELECT 
  e.nome AS empresa,
  p.nome AS plano,
  p.limite_usuarios,
  p.limite_obras,
  (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id) AS usuarios_atuais,
  (SELECT COUNT(*) FROM obras WHERE empresa_id = e.id) AS obras_atuais
FROM public.empresas e
JOIN public.assinaturas a ON a.empresa_id = e.id AND a.status = 'active'
JOIN public.planos p ON p.id = a.plano_id
WHERE e.nome LIKE 'Empresa Teste%';

-- =====================================================
-- PARTE 9: TESTAR TENTATIVA DE ACESSO CRUZADO
-- =====================================================

-- Teste 1: Tentar acessar obra de outra empresa (deve falhar com RLS)
-- Este comando só funcionaria se RLS estivesse desabilitado ou com privilégios de superusuário
COMMENT ON TABLE public.obras IS 'RLS impede que Empresa A veja obras da Empresa B';

-- Teste 2: Tentar criar obra para outra empresa (deve falhar com RLS)
-- Este INSERT falharia se o usuário autenticado pertencesse à Empresa A
-- mas tentasse inserir com empresa_id da Empresa B
-- INSERT INTO obras (nome, empresa_id) VALUES ('Teste', <id_empresa_b>);
-- Resultado esperado: Erro de violação de política RLS

-- =====================================================
-- PARTE 10: LIMPAR DADOS DE TESTE (OPCIONAL)
-- =====================================================

-- ATENÇÃO: Execute apenas se quiser remover os dados de teste!

/*
-- Remover assinaturas de teste
DELETE FROM public.assinaturas 
WHERE empresa_id IN (SELECT id FROM empresas WHERE nome LIKE 'Empresa Teste%');

-- Remover centros de custo de teste
DELETE FROM public.centros_custo 
WHERE empresa_id IN (SELECT id FROM empresas WHERE nome LIKE 'Empresa Teste%');

-- Remover fornecedores de teste
DELETE FROM public.fornecedores 
WHERE empresa_id IN (SELECT id FROM empresas WHERE nome LIKE 'Empresa Teste%');

-- Remover obras de teste
DELETE FROM public.obras 
WHERE empresa_id IN (SELECT id FROM empresas WHERE nome LIKE 'Empresa Teste%');

-- Remover usuários de teste
DELETE FROM public.usuarios 
WHERE email LIKE '%@teste.com';

-- Remover empresas de teste (CASCADE removerá dados relacionados)
DELETE FROM public.empresas 
WHERE nome LIKE 'Empresa Teste%';

SELECT 'Dados de teste removidos!' AS resultado;
*/

-- =====================================================
-- CHECKLIST DE VALIDAÇÃO
-- =====================================================

/*
CHECKLIST:

1. [ ] Empresas de teste criadas
2. [ ] Usuários de teste criados
3. [ ] Obras criadas para cada empresa
4. [ ] Fornecedores criados para cada empresa
5. [ ] Centros de custo criados para cada empresa
6. [ ] Cada empresa vê apenas seus próprios dados
7. [ ] Políticas RLS impedem acesso cruzado
8. [ ] Funções auxiliares retornam valores corretos
9. [ ] Limites de plano estão corretos
10. [ ] Tentativas de acesso cruzado são bloqueadas

RESULTADO ESPERADO:
- Empresa A vê apenas dados da Empresa A
- Empresa B vê apenas dados da Empresa B
- Nenhuma empresa consegue acessar dados de outra
- Todas as políticas RLS estão funcionando
*/

-- =====================================================
-- FIM DO SCRIPT DE TESTE
-- =====================================================

SELECT '✅ Script de teste concluído! Verifique os resultados acima.' AS status;
