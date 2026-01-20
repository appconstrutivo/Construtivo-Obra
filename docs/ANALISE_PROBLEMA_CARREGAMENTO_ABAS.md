# Análise do Problema: Carregamento Indefinido Após Mudança de Aba

## Problema Identificado

Quando o usuário sai do navegador (muda de aba ou minimiza) e depois volta, as páginas ficam em estado de "Carregando..." indefinidamente. O problema só é resolvido quando o usuário pressiona F5 para recarregar a página.

**Páginas afetadas:**
- `/medicoes` (Boletins de Medição)
- `/negociacoes` (Contratos)
- `/financeiro` (Centros de Custo)
- Outras páginas que fazem fetch de dados do Supabase

## Análise do Código Atual

### 1. Configuração do Supabase Client (`src/lib/supabaseClient.ts`)

**Pontos Positivos:**
- ✅ `autoRefreshToken: true` está configurado
- ✅ `persistSession: true` está configurado
- ✅ Storage dual (localStorage + cookies) implementado

**Possíveis Problemas:**
- ⚠️ O `autoRefreshToken` pode não estar funcionando corretamente quando a aba volta
- ⚠️ Não há tratamento de erro específico para sessão expirada
- ⚠️ Não há verificação de sessão válida antes de fazer queries

### 2. AuthContext (`src/contexts/AuthContext.tsx`)

**Pontos Positivos:**
- ✅ Listener de `onAuthStateChange` configurado
- ✅ Verificação inicial de sessão no `useEffect`

**Possíveis Problemas:**
- ⚠️ Não há listener de `visibilitychange` para verificar sessão quando a aba volta
- ⚠️ Não há tratamento para quando a sessão expira durante a inatividade
- ⚠️ O `isLoading` pode ficar `true` indefinidamente se a sessão não for recuperada

### 3. Páginas Afetadas

**Padrão Identificado:**
- Todas as páginas usam `useEffect(() => { ... }, [])` para carregar dados na montagem
- Nenhuma página verifica se a sessão está válida antes de fazer queries
- Nenhuma página tem tratamento de erro para queries que falham por sessão expirada
- Apenas o Dashboard tem listener de `visibilitychange` (linhas 498-571)

**Exemplo do problema:**
```typescript
// src/app/medicoes/page.tsx - linha 81
useEffect(() => {
  carregarMedicoes();
  carregarContratos();
  carregarFornecedores();
}, []); // ❌ Não verifica sessão, não trata erros de autenticação
```

### 4. Funções de Fetch (`src/lib/supabase.ts`)

**Padrão Identificado:**
```typescript
export async function fetchMedicoes() {
  const { data, error } = await supabase
    .from('medicoes')
    .select(`...`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar medições:', error);
    return []; // ❌ Retorna array vazio, mas não trata erro de autenticação
  }
  
  return data as Medicao[];
}
```

**Problemas:**
- ❌ Não verifica se a sessão está válida antes da query
- ❌ Não trata especificamente erros de autenticação (401/403)
- ❌ Retorna array vazio silenciosamente em caso de erro

## Causa Raiz Provável

1. **Sessão expira durante inatividade**: Quando a aba fica inativa por muito tempo, o token do Supabase pode expirar
2. **Auto-refresh não funciona na volta**: O `autoRefreshToken` pode não estar sendo acionado quando a aba volta
3. **Queries ficam pendentes**: As queries são iniciadas mas ficam travadas esperando uma resposta que nunca vem porque a sessão está inválida
4. **Falta de timeout**: Não há timeout nas queries, então elas ficam pendentes indefinidamente
5. **Estado de loading não é resetado**: O `loading` fica `true` porque a query nunca completa (nem com sucesso nem com erro)

## Recomendações de Solução

### 1. Adicionar Verificação de Sessão no AuthContext

**Implementar listener de `visibilitychange` no AuthContext:**

```typescript
// Adicionar no AuthContext.tsx
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      // Aba voltou a ficar visível
      console.log('Aba voltou a ficar visível - verificando sessão...');
      
      try {
        // Verificar e renovar sessão se necessário
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          // Sessão inválida - fazer logout
          await signOut();
          return;
        }
        
        if (!session) {
          console.log('Nenhuma sessão encontrada - redirecionando para login');
          window.location.href = '/login';
          return;
        }
        
        // Verificar se o token está expirado
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 < Date.now()) {
          console.log('Token expirado - tentando renovar...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Erro ao renovar sessão:', refreshError);
            await signOut();
            return;
          }
          
          if (refreshData.session) {
            setSession(refreshData.session);
            setUser(refreshData.session.user);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão na volta da aba:', error);
      }
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### 2. Criar Hook Personalizado para Fetch com Tratamento de Erro

**Criar `src/hooks/useSupabaseQuery.ts`:**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { session } = useAuth();

  const executeQuery = useCallback(async () => {
    // Verificar sessão antes de executar query
    if (!session) {
      console.warn('Sem sessão - não executando query');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Timeout de 30 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout após 30 segundos')), 30000);
      });

      const queryPromise = queryFn();
      const result = await Promise.race([queryPromise, timeoutPromise]) as T;
      
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Erro na query:', err);
      
      // Verificar se é erro de autenticação
      if (err?.message?.includes('JWT') || err?.status === 401 || err?.status === 403) {
        console.error('Erro de autenticação - sessão expirada');
        // Forçar verificação de sessão
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (!newSession) {
          window.location.href = '/login';
          return;
        }
        // Tentar novamente uma vez
        try {
          const retryResult = await queryFn();
          setData(retryResult);
          setError(null);
        } catch (retryErr) {
          setError(retryErr);
          setData(null);
        }
      } else {
        setError(err);
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [queryFn, session, ...dependencies]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Recarregar quando a aba volta a ficar visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        console.log('Aba voltou - recarregando dados...');
        executeQuery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [executeQuery, session]);

  return { data, loading, error, refetch: executeQuery };
}
```

### 3. Melhorar Funções de Fetch com Tratamento de Erro

**Atualizar `src/lib/supabase.ts`:**

```typescript
export async function fetchMedicoes() {
  // Verificar sessão antes de fazer query
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão não encontrada');
  }

  const { data, error } = await supabase
    .from('medicoes')
    .select(`
      *,
      negociacao:negociacao_id (
        *,
        fornecedor:fornecedor_id (*)
      )
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    // Verificar se é erro de autenticação
    if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
      console.error('Erro de autenticação ao buscar medições:', error);
      // Tentar renovar sessão
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      // Tentar novamente
      const { data: retryData, error: retryError } = await supabase
        .from('medicoes')
        .select(`...`)
        .order('created_at', { ascending: false });
      
      if (retryError) {
        console.error('Erro ao buscar medições após renovar sessão:', retryError);
        throw retryError;
      }
      return retryData as Medicao[];
    }
    
    console.error('Erro ao buscar medições:', error);
    throw error; // Lançar erro em vez de retornar array vazio
  }
  
  // ... resto do código de processamento
  return medicoesComOrdem as Medicao[];
}
```

### 4. Adicionar Timeout e Retry nas Páginas

**Exemplo para `src/app/medicoes/page.tsx`:**

```typescript
const carregarMedicoes = async () => {
  setLoading(true);
  try {
    // Verificar sessão antes de carregar
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('Sem sessão - redirecionando para login');
      router.push('/login');
      return;
    }

    // Timeout de 30 segundos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao carregar medições')), 30000);
    });

    const dataPromise = fetchMedicoes();
    const data = await Promise.race([dataPromise, timeoutPromise]) as Medicao[];
    
    setMedicoes(data);
    setMedicoesFiltradas(data);
  } catch (error: any) {
    console.error('Erro ao carregar medições:', error);
    
    // Verificar se é erro de autenticação
    if (error?.message?.includes('Sessão expirada') || error?.message?.includes('JWT')) {
      showNotification({
        title: "Sessão Expirada",
        message: "Sua sessão expirou. Por favor, faça login novamente.",
        type: "error"
      });
      router.push('/login');
      return;
    }
    
    showNotification({
      title: "Erro ao Carregar",
      message: "Não foi possível carregar as medições. Tente novamente.",
      type: "error"
    });
  } finally {
    setLoading(false); // ⚠️ IMPORTANTE: Sempre resetar loading
  }
};

// Adicionar listener de visibilitychange
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      // Verificar se está em estado de loading há muito tempo
      // Se sim, recarregar dados
      console.log('Aba voltou - verificando se precisa recarregar...');
      
      // Se loading está true há mais de 5 segundos, provavelmente travou
      // Recarregar dados
      if (loading) {
        console.log('Loading travado - recarregando dados...');
        await carregarMedicoes();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [loading]);
```

### 5. Melhorar Configuração do Supabase Client

**Adicionar configurações adicionais em `src/lib/supabaseClient.ts`:**

```typescript
export const supabase: SupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: dualStorage,
    debug: false,
    // Adicionar configurações de refresh
    storageKey: 'sb-qsjixccnxwzwdyvwcxkd-auth-token',
    // Configurar intervalo de refresh (padrão é 1 hora, mas podemos reduzir)
  },
  global: {
    headers: {
      'x-client-info': 'construtivo-web'
    },
    // Adicionar timeout nas requisições
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30 segundos de timeout
      });
    }
  },
  // Configurar retry automático
  db: {
    schema: 'public'
  }
});
```

### 6. Criar Utility para Verificar e Renovar Sessão

**Criar `src/lib/authUtils.ts`:**

```typescript
import { supabase } from './supabaseClient';

export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return false;
    }
    
    if (!session) {
      console.log('Nenhuma sessão encontrada');
      return false;
    }
    
    // Verificar se o token está expirado ou próximo de expirar (5 minutos de margem)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;
    
    if (expiresAt && expiresAt - now < fiveMinutes) {
      console.log('Token próximo de expirar - renovando...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Erro ao renovar sessão:', refreshError);
        return false;
      }
      
      if (!refreshData.session) {
        console.log('Sessão não renovada');
        return false;
      }
      
      console.log('Sessão renovada com sucesso');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return false;
  }
}

export async function executeWithAuth<T>(
  queryFn: () => Promise<T>,
  retries: number = 1
): Promise<T> {
  // Verificar sessão antes de executar
  const isValid = await ensureValidSession();
  
  if (!isValid) {
    throw new Error('Sessão inválida ou expirada');
  }
  
  try {
    return await queryFn();
  } catch (error: any) {
    // Se for erro de autenticação e ainda tiver tentativas
    if (
      (error?.message?.includes('JWT') || 
       error?.code === 'PGRST301' || 
       error?.status === 401) &&
      retries > 0
    ) {
      console.log('Erro de autenticação - tentando renovar sessão e repetir...');
      
      // Tentar renovar sessão
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        throw new Error('Não foi possível renovar a sessão');
      }
      
      // Tentar novamente
      return executeWithAuth(queryFn, retries - 1);
    }
    
    throw error;
  }
}
```

## Estratégia de Implementação Recomendada

### Fase 1: Correções Imediatas (Alta Prioridade)

1. ✅ Adicionar `finally { setLoading(false) }` em TODAS as funções de carregamento
2. ✅ Adicionar timeout de 30 segundos em todas as queries
3. ✅ Adicionar listener de `visibilitychange` no AuthContext para verificar sessão
4. ✅ Adicionar tratamento de erro de autenticação nas funções de fetch

### Fase 2: Melhorias de Arquitetura (Média Prioridade)

1. ✅ Criar hook `useSupabaseQuery` para padronizar carregamento
2. ✅ Criar utility `executeWithAuth` para garantir sessão válida
3. ✅ Atualizar todas as páginas para usar o novo hook ou utility

### Fase 3: Otimizações (Baixa Prioridade)

1. ✅ Implementar cache inteligente
2. ✅ Adicionar retry automático com backoff exponencial
3. ✅ Melhorar feedback visual durante recarregamento

## Checklist de Verificação

Para cada página que faz fetch de dados:

- [ ] Verifica sessão antes de fazer query?
- [ ] Tem timeout na query?
- [ ] Trata erro de autenticação especificamente?
- [ ] Reseta `loading` no `finally`?
- [ ] Tem listener de `visibilitychange`?
- [ ] Mostra mensagem de erro ao usuário?
- [ ] Redireciona para login se sessão expirada?

## Observações Importantes

1. **O problema não é do Supabase em si**, mas sim da falta de tratamento adequado de erros e renovação de sessão
2. **O `autoRefreshToken` funciona**, mas pode não ser acionado se a aba estiver inativa
3. **Queries sem timeout** podem ficar pendentes indefinidamente
4. **Estado de loading não resetado** causa a UI travada em "Carregando..."

## Conclusão

O problema está relacionado à **falta de tratamento adequado de sessão expirada e queries sem timeout**. A solução envolve:

1. Verificar e renovar sessão quando a aba volta
2. Adicionar timeouts em todas as queries
3. Tratar erros de autenticação especificamente
4. Sempre resetar estado de loading no `finally`
5. Implementar retry automático quando sessão é renovada

Com essas mudanças, o problema deve ser resolvido sem necessidade de F5.
