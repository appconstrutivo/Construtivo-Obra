"use client";

import { useRouter as useNextRouter, usePathname } from 'next/navigation';

export function useRouter() {
  const router = useNextRouter();
  const pathname = usePathname();
  
  const customRouter = {
    ...router,
    push: (href: string) => {
      // Se o href for igual ao pathname atual, não faz nada para evitar recarregamento desnecessário
      if (href === pathname) {
        console.log(`Já estamos na rota ${href}, ignorando navegação`);
        return;
      }
      
      // Utiliza o router nativo do Next.js para navegação client-side
      router.push(href);
    },
    replace: (href: string) => {
      // Se o href for igual ao pathname atual, não faz nada para evitar recarregamento desnecessário
      if (href === pathname) {
        console.log(`Já estamos na rota ${href}, ignorando navegação`);
        return;
      }
      
      // Utiliza o router nativo do Next.js para navegação client-side
      router.replace(href);
    }
  };
  
  return customRouter;
} 