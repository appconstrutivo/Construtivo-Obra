'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const QUANTIDADES_OBRAS_VALIDAS = [1, 2, 3, 4, 5, 10, 15];

function CadastroContent() {
  const searchParams = useSearchParams();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cargo, setCargo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const paramsCakto = useMemo(() => {
    // Cakto pode enviar o ID da transação com nomes diferentes no redirect
    const transaction_id =
      searchParams.get('transaction_id') ??
      searchParams.get('order_id') ??
      searchParams.get('payment_id') ??
      undefined;
    const plan_id = searchParams.get('plan_id') ?? undefined;
    let quantidade_obras: number | undefined =
      searchParams.get('quantidade_obras') != null
        ? parseInt(searchParams.get('quantidade_obras')!, 10)
        : undefined;
    if (
      quantidade_obras == null &&
      plan_id &&
      /^obra-\d+$/.test(plan_id)
    ) {
      const n = parseInt(plan_id.replace('obra-', ''), 10);
      if (QUANTIDADES_OBRAS_VALIDAS.includes(n)) quantidade_obras = n;
    }
    const emailParam = searchParams.get('email') ?? undefined;
    const test_mode = searchParams.get('test_mode') ?? undefined;
    const isValidQtd =
      quantidade_obras != null &&
      Number.isInteger(quantidade_obras) &&
      QUANTIDADES_OBRAS_VALIDAS.includes(quantidade_obras);
    return {
      transaction_id,
      plan_id,
      quantidade_obras: isValidQtd ? quantidade_obras : undefined,
      email: emailParam && emailParam.trim() ? emailParam.trim() : undefined,
      test_mode: test_mode === 'true',
      isFluxoCakto:
        (Boolean(transaction_id) || Boolean(plan_id)) && isValidQtd,
    };
  }, [searchParams]);

  const emailPreenchidoRef = useRef(false);
  useEffect(() => {
    if (paramsCakto.email && !emailPreenchidoRef.current) {
      setEmail(paramsCakto.email);
      emailPreenchidoRef.current = true;
    }
  }, [paramsCakto.email]);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            empresa,
            cargo,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (
        paramsCakto.isFluxoCakto &&
        data?.user?.id &&
        paramsCakto.quantidade_obras != null
      ) {
        const res = await fetch('/api/cadastro-cakto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            nome: nome.trim() || undefined,
            email,
            empresa: empresa.trim() || undefined,
            transaction_id: paramsCakto.transaction_id,
            quantidade_obras: paramsCakto.quantidade_obras,
            test_mode: paramsCakto.test_mode ? 'true' : undefined,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErro(
            json?.error ||
              'Erro ao ativar plano. Sua conta foi criada; entre em contato com o suporte.'
          );
          setCarregando(false);
          return;
        }
      }

      router.push('/cadastro/confirmacao');
    } catch (error: any) {
      setErro(error.message || 'Erro ao criar conta');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex flex-col md:flex-row md:items-center md:justify-center bg-gradient-to-br from-blue-900 to-blue-800 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col md:flex-row w-full max-w-4xl flex-1 md:flex-initial">
        {/* Seção de branding - compacta no mobile */}
        <div className="flex-shrink-0 px-6 pt-8 pb-6 md:flex-1 md:p-10 md:flex md:flex-col md:justify-between">
          <div>
            <div className="flex items-center mb-4 md:mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20" />
                <path d="M5 20v-4a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v4" />
                <circle cx="12" cy="7" r="3" />
              </svg>
              <h1 className="text-2xl md:text-4xl font-bold text-white ml-2 md:ml-3">Construtivo</h1>
            </div>
            <h2 className="text-lg md:text-2xl font-medium text-white mb-1 md:mb-2">Gerencie seus projetos com eficiência</h2>
            <p className="text-sm md:text-base text-blue-200 mb-0 md:mb-8">Acompanhe orçamentos, gastos e progresso em tempo real</p>
          </div>
          <div className="hidden md:block text-white text-sm">
            Desenvolvido por Eng. Civil Thiago Wendley
          </div>
        </div>

        {/* Card do formulário - estilo bottom sheet no mobile */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white px-5 pt-6 pb-8 rounded-t-3xl md:overflow-visible md:rounded-lg md:rounded-t-lg shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-xl md:p-10 md:w-[450px] md:flex-initial md:flex-none">
          <div className="mx-auto w-12 h-1 rounded-full bg-gray-200 mb-6 md:hidden" aria-hidden />
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">Criar uma conta</h2>
          <p className="text-gray-600 mb-6 md:mb-8">Preencha os dados para se cadastrar</p>

          {paramsCakto.isFluxoCakto && paramsCakto.quantidade_obras != null && (
            <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-4">
              Plano com <strong>{paramsCakto.quantidade_obras} {paramsCakto.quantidade_obras === 1 ? 'obra' : 'obras'}</strong> será ativado após a confirmação do seu email.
            </div>
          )}

          {erro && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
              {erro}
            </div>
          )}

          <form onSubmit={handleCadastro}>
            <div className="mb-4">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="block w-full min-h-[48px] md:min-h-0 rounded-lg md:rounded-md border border-gray-300 py-3 px-4 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full min-h-[48px] md:min-h-0 rounded-lg md:rounded-md border border-gray-300 py-3 px-4 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa <span className="text-gray-500">(Não obrigatório)</span>
                </label>
                <input
                  id="empresa"
                  name="empresa"
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="block w-full min-h-[48px] md:min-h-0 rounded-lg md:rounded-md border border-gray-300 py-3 px-4 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo <span className="text-gray-500">(Não obrigatório)</span>
                </label>
                <input
                  id="cargo"
                  name="cargo"
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="block w-full min-h-[48px] md:min-h-0 rounded-lg md:rounded-md border border-gray-300 py-3 px-4 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete="new-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="block w-full min-h-[48px] md:min-h-0 rounded-lg md:rounded-md border border-gray-300 py-3 px-4 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar senha
              </label>
              <input
                id="confirmarSenha"
                name="confirmarSenha"
                type="password"
                autoComplete="new-password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="block w-full min-h-[48px] md:min-h-0 rounded-lg md:rounded-md border border-gray-300 py-3 px-4 text-base text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex justify-center min-h-[48px] py-3 px-4 border border-transparent rounded-lg md:rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 active:bg-blue-800"
            >
              {carregando ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Fazer login
              </Link>
            </p>
          </div>

          <p className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center md:hidden">
            Desenvolvido por Eng. Civil Thiago Wendley
          </p>
        </div>
      </div>
    </div>
  );
}

function CadastroFallback() {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col md:flex-row md:items-center md:justify-center bg-gradient-to-br from-blue-900 to-blue-800 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col md:flex-row w-full max-w-4xl flex-1 md:flex-initial items-center justify-center p-8">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    </div>
  );
}

export default function Cadastro() {
  return (
    <Suspense fallback={<CadastroFallback />}>
      <CadastroContent />
    </Suspense>
  );
} 