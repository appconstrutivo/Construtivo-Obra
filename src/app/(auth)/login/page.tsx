'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const router = useRouter();
  const { user, session, signIn } = useAuth();

  // Verificação de sessão existente ao carregar a página
  useEffect(() => {
    const verificarSessaoExistente = async () => {
      console.log('🚪 RoutePersistenceManager: Desabilitado para rota de auth: /login');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('🚪 Verificando sessão existente...');
        console.log('🚪 Sessão encontrada:', !!session);
        console.log('🚪 Usuário encontrado:', !!session?.user);
        console.log('🚪 Email do usuário:', session?.user?.email || 'Nenhum');
        
        if (session && session.user) {
          console.log('✅ 🚪 Sessão válida encontrada! Redirecionando para dashboard...');
          router.replace('/dashboard');
          return;
        }
        
        console.log('❌ 🚪 Nenhuma sessão válida encontrada');
      } catch (error) {
        console.error('❌ 🚪 Erro ao verificar sessão:', error);
      }
    };

    verificarSessaoExistente();
  }, [router]);

  // Monitorar mudanças no contexto de autenticação
  useEffect(() => {
    if (user && session) {
      console.log('✅ 🚪 Contexto atualizado - usuário logado, redirecionando...');
      console.log('🚪 Dados do contexto:', { 
        hasUser: !!user, 
        hasSession: !!session,
        userEmail: user?.email 
      });
      
      setTimeout(() => {
        router.replace('/dashboard');
      }, 1000); // Pequeno delay para garantir que tudo está sincronizado
    }
  }, [user, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setSucesso(false);

    try {
      console.log('=== INÍCIO DO LOGIN ===');
      console.log('📧 Email:', email);
      console.log('🔒 Senha:', senha ? '****** (fornecida)' : '(vazia)');
      
      if (!email || !senha) {
        throw new Error('Por favor, preencha todos os campos');
      }

      console.log('🚪 Tentando fazer login com:', { email });
      
      const { error } = await signIn(email, senha);

      if (error) {
        console.error('❌ 🚪 Erro de autenticação:', error);
        if (error.message === 'Invalid login credentials') {
          throw new Error('Email ou senha incorretos');
        } else {
          throw error;
        }
      }

      console.log('✅ 🚪 Login bem-sucedido - Aguardando sessão...');
      
      // Mostrar mensagem de sucesso
      setSucesso(true);
      
      // Limpar para garantir que vamos para o dashboard
      localStorage.removeItem('lastRoute');
      
      // Aguardar mais tempo para a sessão ser estabelecida
      console.log('⏳ 🚪 Aguardando 3 segundos para estabelecer sessão...');
      setTimeout(async () => {
        // Verificar se a sessão foi estabelecida antes de redirecionar
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          console.log('🔍 🚪 Verificando sessão antes do redirect:', session ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
          
          // Verificar storage também
          const storageKeys = Object.keys(localStorage).filter(key => 
            key.includes('supabase') || key.includes('auth') || key.includes('sb-')
          );
          console.log('💾 Chaves no localStorage:', storageKeys);
          
          if (session) {
            console.log('✅ 🚪 Sessão confirmada - Redirecionando para dashboard...');
            console.log('📋 Detalhes da sessão:', {
              userId: session.user?.id,
              email: session.user?.email,
              expiresAt: session.expires_at
            });
            window.location.href = '/dashboard';
          } else {
            console.error('❌ 🚪 Sessão não encontrada após login - verificando storage...');
            
            // Tentar obter do storage diretamente
            const storageData = storageKeys.map(key => ({
              key,
              value: localStorage.getItem(key)?.substring(0, 100) + '...'
            }));
            console.log('🔍 Dados no storage:', storageData);
            
            // Tentar novamente após mais um segundo
            setTimeout(() => {
              console.log('🔄 Tentando redirecionar mesmo sem sessão confirmada...');
              window.location.href = '/dashboard';
            }, 1000);
          }
        } catch (sessionError) {
          console.error('❌ 🚪 Erro ao verificar sessão:', sessionError);
          // Forçar redirecionamento mesmo com erro
          console.log('🔄 Forçando redirecionamento apesar do erro...');
          window.location.href = '/dashboard';
        }
      }, 3000); // Aumentar para 3 segundos
      
    } catch (error: any) {
      console.error('❌ 🚪 Erro ao processar login:', error);
      setErro(error.message || 'Erro ao fazer login');
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800">
      <div className="flex w-full max-w-4xl">
        <div className="flex-1 p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20" />
                <path d="M5 20v-4a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v4" />
                <circle cx="12" cy="7" r="3" />
              </svg>
              <h1 className="text-4xl font-bold text-white ml-3">Construtivo</h1>
            </div>
            <h2 className="text-2xl font-medium text-white mb-2">Gerencie seus projetos com eficiência</h2>
            <p className="text-blue-200 mb-8">Acompanhe orçamentos, gastos e progresso em tempo real</p>
          </div>
          <div className="text-white text-sm">
            Desenvolvido por Eng. Civil <strong>Thiago Wendley</strong>
          </div>
        </div>

        <div className="bg-white p-10 rounded-lg shadow-xl w-[450px]">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo</h2>
          <p className="text-gray-600 mb-8">Faça login para acessar o sistema</p>

          {erro && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
              Login realizado com sucesso! Estabelecendo sessão e redirecionando...
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-md border border-gray-300 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <Link href="/recuperar-senha" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Esqueceu sua senha?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-10 block w-full rounded-md border border-gray-300 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
            >
              {carregando ? (
                <div className="flex items-center">
                  <LoadingSpinner size="small" color="border-white" />
                  <span className="ml-2">Entrando...</span>
                </div>
              ) : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link href="/cadastro" className="font-medium text-blue-600 hover:text-blue-500">
                Criar uma conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 