'use client';

import Link from 'next/link';

export default function ConfirmacaoCadastro() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-800">
      <div className="bg-white p-10 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-green-100 p-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Verifique seu email</h2>
          <p className="text-gray-600 mb-6 text-center">
            Enviamos um link de confirmação para o seu email. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
          </p>
          <div className="bg-blue-50 p-4 rounded-md mb-6 w-full">
            <p className="text-blue-700 text-sm">
              <strong>Dica:</strong> Se não encontrar o email na caixa de entrada, verifique também a pasta de spam ou lixo eletrônico.
            </p>
          </div>
          <Link href="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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