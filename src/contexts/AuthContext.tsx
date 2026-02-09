'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para limpeza do storage - exportada para uso em redirecionamentos
export const clearAllAuthData = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Verificar se localStorage está disponível
    if (typeof localStorage === 'undefined') return;
    
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('sb-') ||
      key === 'lastRoute'
    );
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Storage de autenticação limpo');
  } catch (error) {
    console.warn('Erro ao limpar storage:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const initCompletedRef = useRef(false);
  const authListenerRef = useRef<any>(null);

  // Função para atualizar o último acesso do usuário
  const updateLastAccess = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Erro ao atualizar último acesso:', error);
    }
  }, []);

  // Hook para montar no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Inicialização e listener de autenticação
  useEffect(() => {
    if (initCompletedRef.current || !isMounted) return;

    const initAuth = async () => {
      try {
        // Verificar se há uma sessão ativa
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao obter sessão inicial:', error);
          setSession(null);
          setUser(null);
        } else if (session) {
          console.log('Sessão encontrada na inicialização:', session.user?.email);
          setSession(session);
          setUser(session.user);
          
          if (session.user) {
            updateLastAccess(session.user.id);
          }
        } else {
          console.log('Nenhuma sessão encontrada na inicialização');
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Erro na inicialização da auth:', error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
        initCompletedRef.current = true;
      }
    };

    initAuth();

    // Configurar listener para mudanças na autenticação (apenas uma vez)
    if (!authListenerRef.current) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, newSession: Session | null) => {
          console.log('Auth state changed:', event, newSession?.user?.email);
          
          setSession(newSession);
          setUser(newSession?.user || null);
          
          if (event === 'SIGNED_IN' && newSession?.user) {
            updateLastAccess(newSession.user.id);
            console.log('Usuário logado com sucesso no contexto');
          }
          
          if (event === 'SIGNED_OUT') {
            console.log('Usuário fez logout no contexto');
            // Não fazer redirecionamento automático - deixar para o componente decidir
          }
          
          // Marcar inicialização como completa se ainda não foi
          if (!initCompletedRef.current) {
            setIsLoading(false);
            initCompletedRef.current = true;
          }
        }
      );
      
      authListenerRef.current = authListener;
    }

    // Cleanup - remover listener apenas quando o componente for desmontado
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.subscription.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, [updateLastAccess, isMounted]);

  // Função de login
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 [AuthContext] Tentando fazer login com:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ [AuthContext] Erro no login:', error);
        return { error };
      }

      console.log('✅ [AuthContext] Login realizado com sucesso:', data.user?.email);
      console.log('📋 [AuthContext] Dados da sessão:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        userId: data.user?.id,
        userEmail: data.user?.email
      });
      
      // Forçar atualização do estado local imediatamente
      if (data.session && data.user) {
        console.log('🔄 [AuthContext] Atualizando estado local...');
        setSession(data.session);
        setUser(data.user);
        
        // Atualizar último acesso
        updateLastAccess(data.user.id);
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ [AuthContext] Exceção no login:', error);
      return { error };
    }
  };

  // Função de logout
  const signOut = async () => {
    const userId = user?.id;
    try {
      console.log('Fazendo logout...');

      // 1) Primeiro: limpar sessão no servidor e expirar cookies (resposta com Set-Cookie)
      //    Assim, ao redirecionar para /login, o middleware já não verá sessão válida.
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (error) {
        console.warn('Falha ao chamar /api/logout (seguindo com logout local):', error);
      }

      // 2) Limpar estado local e sessão no cliente
      setSession(null);
      setUser(null);
      await supabase.auth.signOut();

      // 3) Limpar storage (localStorage e cookies no cliente)
      clearAllAuthData();

      console.log('Logout realizado com sucesso');

      // 4) Redirecionar só após garantir que a API já enviou os cookies expirados
      window.location.href = '/login';
    } catch (error) {
      console.warn('Erro no logout do servidor, executando logout local:', error);
      setSession(null);
      setUser(null);
      clearAllAuthData();
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 