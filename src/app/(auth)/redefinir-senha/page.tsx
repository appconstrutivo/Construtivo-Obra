'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function RedefinirSenha() {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoToken, setProcessandoToken] = useState(true);
  const router = useRouter();

  // Estado para controlar se há sessão válida
  const [temSessao, setTemSessao] = useState(false);

  // Processar token da URL e verificar sessão
  useEffect(() => {
    let mounted = true;
    let subscription: any = null;
    
    const processarTokenECriarSessao = async () => {
      try {
        setProcessandoToken(true);
        
        // Verificar se há hash na URL (token do Supabase)
        const hash = window.location.hash;
        
        if (hash) {
          // Parse do hash da URL
          const hashParams = new URLSearchParams(hash.substring(1));
          
          // Verificar se há erro no hash (link expirado ou inválido)
          const hashError = hashParams.get('error');
          const errorCode = hashParams.get('error_code');
          const errorDescription = hashParams.get('error_description');
          
          if (hashError || errorCode) {
            console.error('❌ Erro no hash da URL:', { error: hashError, errorCode, errorDescription });
            if (mounted) {
              // Mensagens específicas baseadas no tipo de erro
              if (errorCode === 'otp_expired' || hashError === 'access_denied') {
                setErro('Link expirado ou inválido. Por favor, solicite um novo link de redefinição de senha.');
              } else {
                setErro(errorDescription?.replace(/\+/g, ' ') || 'Erro ao processar o link. Por favor, solicite um novo link de redefinição de senha.');
              }
              setProcessandoToken(false);
            }
            return;
          }
          
          console.log('🔐 Token encontrado na URL, processando...');
          
          // Extrair tokens do hash manualmente
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          // Configurar listener ANTES de processar o token
          subscription = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event, session ? 'com sessão' : 'sem sessão');
            
            if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && mounted) {
              console.log('✅ Sessão criada via onAuthStateChange:', event);
              setTemSessao(true);
              setProcessandoToken(false);
            }
          });
          
          // Se temos os tokens, tentar criar sessão manualmente
          if (accessToken && refreshToken) {
            console.log('🔑 Tokens encontrados no hash, criando sessão manualmente...');
            console.log('📋 Access token (primeiros 50 chars):', accessToken.substring(0, 50));
            console.log('📋 Refresh token (primeiros 50 chars):', refreshToken.substring(0, 50));
            
            try {
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (sessionError) {
                console.error('❌ Erro ao criar sessão manualmente:', sessionError);
                console.error('📋 Detalhes do erro:', {
                  message: sessionError.message,
                  status: sessionError.status
                });
              } else if (sessionData?.session) {
                console.log('✅ Sessão criada manualmente com sucesso');
                console.log('📋 Detalhes da sessão:', {
                  userId: sessionData.session.user?.id,
                  email: sessionData.session.user?.email
                });
                if (mounted) {
                  setTemSessao(true);
                  setProcessandoToken(false);
                }
                return;
              } else {
                console.warn('⚠️ setSession retornou sem sessão');
              }
            } catch (setSessionError: any) {
              console.error('❌ Erro ao tentar setSession:', setSessionError);
              console.error('📋 Stack trace:', setSessionError.stack);
            }
          } else {
            console.warn('⚠️ Tokens não encontrados no hash:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              hashLength: hash.length
            });
          }
          
          // Fallback: aguardar processamento automático do Supabase
          console.log('⏳ Aguardando processamento automático do token...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Verificar sessão após aguardar
          let { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && !error) {
            console.log('✅ Sessão criada após processamento automático');
            if (mounted) {
              setTemSessao(true);
              setProcessandoToken(false);
            }
            return;
          }
          
          // Se ainda não tem sessão, aguardar mais um pouco
          console.log('⏳ Aguardando mais um pouco...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: { session: sessionRetry }, error: errorRetry } = await supabase.auth.getSession();
          
          if (errorRetry) {
            console.error('❌ Erro ao processar token:', errorRetry);
            if (mounted) {
              setErro('Erro ao processar o link. Por favor, solicite um novo link de redefinição de senha.');
              setProcessandoToken(false);
            }
            return;
          }
          
          if (sessionRetry && mounted) {
            console.log('✅ Sessão criada após retry');
            setTemSessao(true);
            setProcessandoToken(false);
            return;
          }
          
          // Última tentativa - aguardar mais um pouco
          console.warn('⚠️ Última tentativa de processar token...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: { session: sessionFinal } } = await supabase.auth.getSession();
          
          if (sessionFinal && mounted) {
            console.log('✅ Sessão criada após última tentativa');
            setTemSessao(true);
            setProcessandoToken(false);
          } else if (mounted) {
            console.error('❌ Não foi possível criar sessão após processar token');
            setErro('Link inválido ou expirado. Por favor, solicite um novo link de redefinição de senha.');
            setProcessandoToken(false);
          }
        } else {
          // Sem hash na URL, verificar se já existe sessão (usuário já autenticado)
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session && mounted) {
            console.log('✅ Sessão existente encontrada');
            setTemSessao(true);
            setProcessandoToken(false);
          } else if (mounted) {
            // Sem token e sem sessão, não pode redefinir senha
            setErro('Link inválido. Por favor, use o link enviado por email ou solicite um novo.');
            setProcessandoToken(false);
          }
        }
        
      } catch (error: any) {
        console.error('❌ Erro ao processar token:', error);
        if (mounted) {
          setErro('Erro ao processar o link. Tente novamente.');
          setProcessandoToken(false);
        }
      }
    };
    
    processarTokenECriarSessao();
    
    return () => {
      mounted = false;
      if (subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  const handleRedefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    // Verificar se há sessão antes de tentar atualizar
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setErro('Sessão não encontrada. Por favor, use o link enviado por email novamente.');
      setCarregando(false);
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      setCarregando(false);
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres');
      setCarregando(false);
      return;
    }

    try {
      console.log('🔐 Tentando atualizar senha...');
      const { error } = await supabase.auth.updateUser({
        password: senha
      });

      if (error) {
        console.error('❌ Erro ao atualizar senha:', error);
        throw error;
      }

      console.log('✅ Senha atualizada com sucesso');
      setSucesso(true);

      // Após 3 segundos, redirecionar para o login
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      console.error('❌ Erro ao redefinir senha:', error);
      setErro(error.message || 'Erro ao redefinir senha');
    } finally {
      setCarregando(false);
    }
  };

  // Mostrar loading enquanto processa token
  if (processandoToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800">
        <div className="bg-white p-10 rounded-lg shadow-xl max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processando link de confirmação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800">
      <div className="bg-white p-10 rounded-lg shadow-xl max-w-md w-full">
        {!sucesso ? (
          <>
            <div className="flex items-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 ml-2">Redefinir senha</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Digite sua nova senha para redefinir o acesso à sua conta.
            </p>

            {erro && (
              <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
                {erro}
              </div>
            )}

            <form onSubmit={handleRedefinirSenha}>
              <div className="mb-4">
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-3 px-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nova senha
                </label>
                <input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-3 px-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={carregando || !temSessao}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
              >
                {carregando ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
              
              {!temSessao && !processandoToken && (
                <p className="text-sm text-yellow-600 mt-2 text-center">
                  Aguardando processamento do link...
                </p>
              )}
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Senha redefinida</h2>
            <p className="text-gray-600 mb-6 text-center">
              Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em instantes.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Voltar para o login
          </Link>
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          Desenvolvido por Eng. Civil Thiago Wendley
        </div>
      </div>
    </div>
  );
} 