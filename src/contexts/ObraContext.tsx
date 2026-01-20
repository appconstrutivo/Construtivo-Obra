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
  const { user } = useAuth();

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

      // Se não há obra selecionada e existem obras, selecionar a primeira
      if (!obraSelecionada && obrasData.length > 0) {
        // Tentar recuperar obra selecionada do localStorage
        const obraSalvaId = localStorage.getItem('obraSelecionadaId');
        if (obraSalvaId) {
          const obraSalva = obrasData.find(o => o.id.toString() === obraSalvaId);
          if (obraSalva) {
            setObraSelecionada(obraSalva);
            setIsLoading(false);
            return;
          }
        }
        // Se não encontrou obra salva, selecionar a primeira
        setObraSelecionada(obrasData[0]);
        localStorage.setItem('obraSelecionadaId', obrasData[0].id.toString());
      } else if (obrasData.length === 0) {
        setObraSelecionada(null);
        localStorage.removeItem('obraSelecionadaId');
      }
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      setObras([]);
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
    if (user) {
      carregarObras();
    } else {
      setObras([]);
      setObraSelecionada(null);
      setIsLoading(false);
    }
  }, [user]);

  // Atualizar obra selecionada quando a lista de obras mudar
  useEffect(() => {
    if (obras.length > 0 && !obraSelecionada) {
      const obraSalvaId = localStorage.getItem('obraSelecionadaId');
      if (obraSalvaId) {
        const obraSalva = obras.find(o => o.id.toString() === obraSalvaId);
        if (obraSalva) {
          setObraSelecionada(obraSalva);
          return;
        }
      }
      // Se não encontrou obra salva, selecionar a primeira
      setObraSelecionada(obras[0]);
      localStorage.setItem('obraSelecionadaId', obras[0].id.toString());
    } else if (obras.length === 0) {
      setObraSelecionada(null);
      localStorage.removeItem('obraSelecionadaId');
    }
  }, [obras]);

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
