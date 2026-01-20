'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function RoutePreserver() {
  const pathname = usePathname();

  useEffect(() => {
    // Função para salvar a rota atual no localStorage
    const saveCurrentRoute = () => {
      if (pathname !== '/dashboard' && pathname !== '/') {
        console.log('Salvando rota atual:', pathname);
        localStorage.setItem('lastRoute', pathname);
      }
    };

    // Monitorar quando o documento se torna visível/invisível
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentRoute();
        console.log('Documento invisível, salvando rota:', pathname);
      } else if (document.visibilityState === 'visible') {
        console.log('Documento visível novamente, rota atual:', pathname);
        const lastRoute = localStorage.getItem('lastRoute');
        console.log('Última rota salva:', lastRoute);
      }
    };

    // Salvar rota quando a janela perde foco
    const handleBlur = () => {
      saveCurrentRoute();
      console.log('Janela perdeu foco, salvando rota:', pathname);
    };

    // Verificar se deve restaurar a rota quando a janela ganha foco
    const handleFocus = () => {
      console.log('Janela ganhou foco, rota atual:', pathname);
      const lastRoute = localStorage.getItem('lastRoute');
      console.log('Última rota salva:', lastRoute);
    };

    // Registrar os event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname]);

  // Este componente não renderiza nada visualmente
  return null;
} 