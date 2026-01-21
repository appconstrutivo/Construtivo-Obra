'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchObras } from '@/lib/supabase';
import type { Obra } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type ObraContextType = {
  obraSelecionada: Obra | null;
  obras: Obra[];
  isLoading: boolean;
  selecionarObra: (obra: Obra | null) => void;
  recarregarObras: () => Promise<void>;
};

const ObraContext = createContext<ObraContextType | undefined>(undefined);

export function ObraProvider({ children }: { children: ReactNode }) {
  const [obraSelecionada, setObraSelecionada] = useState<Obra | null>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: isAuthLoading } = useAuth();

  // Carregar obras do usuário
  const carregarObras = async () => {
    if (!user) {
      setObras([]);
      setObraSelecionada(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const obrasData = await fetchObras();
      setObras(obrasData);

      // Sempre tentar restaurar obra do localStorage quando as obras forem carregadas
      if (obrasData.length > 0) {
        const obraSalvaId = localStorage.getItem('obraSelecionadaId');
        if (obraSalvaId) {
          const obraSalva = obrasData.find(o => o.id.toString() === obraSalvaId);
          if (obraSalva) {
            // Restaurar obra salva do localStorage
            setObraSelecionada(obraSalva);
            setIsLoading(false);
            return;
          }
        }
        // Se não encontrou obra salva, verificar se já há uma obra selecionada
        // Se não houver, selecionar a primeira
        setObraSelecionada(prevObra => {
          if (!prevObra) {
            const primeiraObra = obrasData[0];
            localStorage.setItem('obraSelecionadaId', primeiraObra.id.toString());
            return primeiraObra;
          }
          // Se já há uma obra selecionada, verificar se ela ainda existe na lista
          const obraExiste = obrasData.find(o => o.id === prevObra.id);
          if (!obraExiste) {
            // Se a obra selecionada não existe mais, selecionar a primeira
            const primeiraObra = obrasData[0];
            localStorage.setItem('obraSelecionadaId', primeiraObra.id.toString());
            return primeiraObra;
          }
          return prevObra;
        });
      } else if (obrasData.length === 0) {
        setObraSelecionada(null);
        localStorage.removeItem('obraSelecionadaId');
      }
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      setObras([]);
      setObraSelecionada(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Selecionar obra
  const selecionarObra = (obra: Obra | null) => {
    setObraSelecionada(obra);
    if (obra) {
      localStorage.setItem('obraSelecionadaId', obra.id.toString());
    } else {
      localStorage.removeItem('obraSelecionadaId');
    }
  };

  // Recarregar obras
  const recarregarObras = async () => {
    await carregarObras();
  };

  // Carregar obras quando o usuário estiver autenticado
  useEffect(() => {
    // Importante: durante o boot da autenticação, o `user` pode ser `null` temporariamente.
    // Se removermos `obraSelecionadaId` nesse intervalo, a seleção "volta" após F5.
    if (isAuthLoading) return;

    if (user) {
      carregarObras();
      return;
    }

    // Aqui já é um estado estável: auth finalizou e não existe usuário.
    setObras([]);
    setObraSelecionada(null);
    localStorage.removeItem('obraSelecionadaId');
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]);

  return (
    <ObraContext.Provider
      value={{
        obraSelecionada,
        obras,
        isLoading,
        selecionarObra,
        recarregarObras,
      }}
    >
      {children}
    </ObraContext.Provider>
  );
}

export function useObra() {
  const context = useContext(ObraContext);
  if (context === undefined) {
    throw new Error('useObra must be used within an ObraProvider');
  }
  return context;
}
