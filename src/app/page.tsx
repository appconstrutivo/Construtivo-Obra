"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth, clearAllAuthData } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    // Aguardar o carregamento da autenticação
    if (isLoading) return;
    
    // Se não tiver usuário, limpar sessão e redirecionar para login
    // (evita loop com middleware por cookies stale)
    if (!user) {
      const redirectToLogin = async () => {
        await supabase.auth.signOut();
        clearAllAuthData();
        router.replace('/login');
      };
      redirectToLogin();
      return;
    }
    
    // Se tiver usuário, verificar última rota ou ir para dashboard
    const lastRoute = localStorage.getItem('lastRoute');
    const targetRoute = lastRoute && lastRoute !== '/' ? lastRoute : '/dashboard';
    router.replace(targetRoute);
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <LoadingSpinner size="large" />
    </div>
  );
} 