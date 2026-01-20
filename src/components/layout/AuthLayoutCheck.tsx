'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '../ui/LoadingSpinner';

// Rotas de autenticação que não devem mostrar o sidebar e header
const authRoutes = ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/cadastro/confirmacao'];

export function AuthLayoutCheck({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  
  // Verificar se a rota atual é uma rota de autenticação
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  
  // Para rotas de autenticação, sempre renderizar sem layout
  if (isAuthRoute) {
    return <>{children}</>;
  }
  
  // Para rotas protegidas, mostrar loading enquanto carrega ou não há usuário
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  // Para usuários autenticados em rotas protegidas, mostrar layout completo
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
} 