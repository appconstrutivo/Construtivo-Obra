'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Rotas que contêm formulários e não devem ser recarregadas
const formRoutes = ['/novo', '/editar', '/medicoes/novo', '/compras/novo', '/financeiro/novo'];

// Rotas de autenticação que não devem ter persistência
const authRoutes = ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/cadastro/confirmacao'];

export default function RoutePersistenceManager() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const handledRef = useRef(false);
  const lastHandledPathRef = useRef<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Verificar se a rota atual contém um formulário que não deve ser recarregado
  const isFormRoute = formRoutes.some(route => pathname.includes(route));
  
  // Verificar se estamos em uma rota de autenticação
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Não fazer nada até estar montado no cliente
    if (!isMounted) return;

    // DESABILITAR COMPLETAMENTE para rotas de autenticação
    if (isAuthRoute) {
      console.log('RoutePersistenceManager: Desabilitado para rota de auth:', pathname);
      return;
    }

    // Não fazer nada se alguma dessas condições for verdadeira:
    if (
      isLoading || 
      isFormRoute || 
      !user || 
      handledRef.current ||
      pathname === lastHandledPathRef.current
    ) {
      return;
    }

    // Função para salvar a rota atual no localStorage
    const saveCurrentRoute = () => {
      try {
        // Apenas salvar rotas que não sejam dashboard, login ou raiz
        if (pathname !== '/dashboard' && pathname !== '/' && !isAuthRoute) {
          localStorage.setItem('lastRoute', pathname);
          lastHandledPathRef.current = pathname;
          console.log('RoutePersistenceManager: Rota salva:', pathname);
        }
      } catch (error) {
        console.warn('Erro ao salvar rota:', error);
      }
    };

    // Função para restaurar a rota salva
    const restoreLastRoute = () => {
      try {
        const lastRoute = localStorage.getItem('lastRoute');
        
        // Se estamos na rota raiz e temos uma rota salva, restaurar
        if (pathname === '/' && lastRoute) {
          // Verificar se a rota salva é válida e diferente da atual
          if (
            lastRoute !== pathname && 
            !formRoutes.some(route => lastRoute.includes(route)) &&
            !authRoutes.some(route => lastRoute.startsWith(route))
          ) {
            handledRef.current = true;
            console.log('RoutePersistenceManager: Restaurando rota:', lastRoute);
            
            // Usar um único timeout para evitar problemas de sincronização
            setTimeout(() => {
              router.push(lastRoute);
              
              // Resetar depois de um intervalo para permitir mudanças futuras
              setTimeout(() => {
                handledRef.current = false;
              }, 1000);
            }, 500);
          }
        }
      } catch (error) {
        console.warn('Erro ao restaurar rota:', error);
      }
    };

    // Lógica principal: salvar ou restaurar rota dependendo do contexto
    if (pathname === '/') {
      restoreLastRoute();
    } else if (pathname !== '/dashboard') {
      // Continuamos salvando a rota atual se não for dashboard ou auth
      saveCurrentRoute();
    }

  }, [pathname, router, user, isLoading, isFormRoute, isAuthRoute, isMounted]);

  // Este componente não renderiza nada visualmente
  return null;
} 