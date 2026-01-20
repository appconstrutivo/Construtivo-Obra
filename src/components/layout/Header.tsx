'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserCircle, Bell, Search, LogOut, Settings, User, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useObra } from '@/contexts/ObraContext';
import Link from 'next/link';

// Mapeamento de rotas para títulos
const routeTitles: Record<string, string> = {
  '/': 'Construtivo - Sistema de Controle de Obras',
  '/dashboard': 'Construtivo - Sistema de Controle de Obras',
  '/financeiro': 'Sistema de Controle de Obras',
  '/financeiro/grupos': 'Grupos',
  '/financeiro/itens': 'Itens',
  '/medicoes': 'BOLETINS DE MEDIÇÃO',
  '/compras': 'BOLETINS DE COMPRA',
  '/contas-a-pagar': 'CONTAS A PAGAR',
  '/negociacoes': 'Contratos',
  '/fornecedores': 'Fornecedores',
  '/plano': 'Planos de Assinatura'
};

export default function Header() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [obraMenuOpen, setObraMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { obraSelecionada, obras, selecionarObra, isLoading: isLoadingObras } = useObra();
  const menuRef = useRef<HTMLDivElement>(null);
  const obraMenuRef = useRef<HTMLDivElement>(null);
  
  // Verifica a rota atual e suas partes para determinar o título
  const basePathname = pathname.split('?')[0]; // Remove query parameters
  const pageTitle = routeTitles[basePathname] || 'Sistema de Controle de Obras';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar lógica de busca
    console.log('Buscar:', searchQuery);
  };

  // Fechar os menus quando clicar fora deles
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (obraMenuRef.current && !obraMenuRef.current.contains(event.target as Node)) {
        setObraMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef, obraMenuRef]);

  // Obter o nome de usuário para exibição
  const displayName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário';

  // Verificar se está na página de configurações (não mostrar seletor)
  const isConfiguracoesPage = pathname === '/configuracoes';

  return (
    <header className="bg-blue-600 text-white py-3 px-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold">{pageTitle}</h1>
      
      <div className="flex items-center space-x-4">
        {/* Seletor de Obras - não exibir na página de configurações */}
        {!isConfiguracoesPage && (
          <div className="relative" ref={obraMenuRef}>
            <button
              onClick={() => setObraMenuOpen(!obraMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors text-sm font-medium min-w-[200px] justify-between"
              disabled={isLoadingObras || obras.length === 0}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Building2 size={18} className="flex-shrink-0" />
                <span className="truncate">
                  {isLoadingObras 
                    ? 'Carregando...' 
                    : obraSelecionada 
                      ? obraSelecionada.nome 
                      : obras.length === 0 
                        ? 'Nenhuma obra' 
                        : 'Selecionar obra'}
                </span>
              </div>
              <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${obraMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {obraMenuOpen && obras.length > 0 && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-20 max-h-96 overflow-y-auto">
                {obras.map((obra) => (
                  <button
                    key={obra.id}
                    onClick={() => {
                      selecionarObra(obra);
                      setObraMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      obraSelecionada?.id === obra.id 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="font-medium truncate">{obra.nome}</div>
                    {obra.endereco && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{obra.endereco}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-blue-700 text-white placeholder-blue-300 border border-blue-500 rounded-full py-1.5 pl-10 pr-4 w-64 focus:outline-none focus:ring-2 focus:ring-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
        </form>
        
        <button className="p-1.5 rounded-full hover:bg-blue-700 transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="flex items-center gap-2 p-1 rounded-full hover:bg-blue-700 transition-colors"
          >
            <UserCircle size={28} />
            <span className="hidden md:inline text-sm font-medium truncate max-w-[120px]">
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              
              <Link 
                href="/perfil" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                <User size={16} className="mr-2" />
                Meu Perfil
              </Link>
              
              <Link 
                href="/configuracoes" 
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                <Settings size={16} className="mr-2" />
                Configurações
              </Link>
              
              <button 
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }} 
                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <LogOut size={16} className="mr-2" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 