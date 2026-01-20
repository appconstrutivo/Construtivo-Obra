'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        throw error;
      }

      setSucesso(true);
    } catch (error: any) {
      setErro(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setCarregando(false);
    }
  };

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
              <h2 className="text-2xl font-bold text-gray-800 ml-2">Recuperar senha</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Digite seu email e enviaremos um link para você redefinir sua senha.
            </p>

            {erro && (
              <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
                {erro}
              </div>
            )}

            <form onSubmit={handleRecuperarSenha}>
              <div className="mb-6">
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
                  className="block w-full rounded-md border border-gray-300 py-3 px-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="seu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
              >
                {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Email enviado</h2>
            <p className="text-gray-600 mb-6 text-center">
              Enviamos um link de recuperação para {email}. Por favor, verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
            <div className="bg-blue-50 p-4 rounded-md mb-6 w-full">
              <p className="text-blue-700 text-sm">
                <strong>Dica:</strong> Se não encontrar o email na caixa de entrada, verifique também a pasta de spam ou lixo eletrônico.
              </p>
            </div>
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