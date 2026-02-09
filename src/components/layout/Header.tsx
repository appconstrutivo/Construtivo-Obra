'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserCircle, Search, LogOut, Settings, User, Building2, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useObra } from '@/contexts/ObraContext';
import { useLayout } from '@/contexts/LayoutContext';
import Link from 'next/link';

// Mapeamento de rotas para títulos
const routeTitles: Record<string, string> = {
  '/': 'Construtivo - Sistema de Controle de Obras',
  '/dashboard': 'Construtivo - Sistema de Controle de Obras',
  '/financeiro': 'ETAPA',
  '/financeiro/grupos': 'Composição',
  '/financeiro/itens': 'Itens',
  '/medicoes': 'BOLETINS DE MEDIÇÃO',
  '/compras': 'BOLETINS DE COMPRA',
  '/contas-a-pagar': 'CONTAS A PAGAR',
  '/negociacoes': 'Contratos',
  '/fornecedores': 'Fornecedores',
  '/relatorios': 'Relatórios',
  '/plano': 'Planos de Assinatura',
  '/configuracoes': 'Configurações'
};

export default function Header() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [obraMenuOpen, setObraMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { obraSelecionada, obras, selecionarObra, isLoading: isLoadingObras } = useObra();
  const { isMobile, setMobileMenuOpen } = useLayout();
  const menuRef = useRef<HTMLDivElement>(null);
  const obraMenuRef = useRef<HTMLDivElement>(null);

  // Verifica a rota atual e suas partes para determinar o título
  const basePathname = pathname.split('?')[0]; // Remove query parameters
  const pageTitle = routeTitles[basePathname] || 'Sistema de Controle de Obras';

  // Verificar se está na página de configurações (não mostrar seletor)
  const isConfiguracoesPage = pathname === '/configuracoes';

  // Verificar se está na página de dashboard (seletor habilitado apenas no dashboard)
  const isDashboardPage = basePathname === '/dashboard' || basePathname === '/';

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

  // Fechar menu de obras quando sair do dashboard
  useEffect(() => {
    if (!isDashboardPage) {
      setObraMenuOpen(false);
    }
  }, [isDashboardPage]);

  // Obter o nome de usuário para exibição
  const displayName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário';

  return (
    <header className="bg-blue-600 text-white py-2.5 px-3 md:py-3 md:px-6 flex items-center justify-between gap-2 min-h-[52px] md:min-h-0">
      {/* Esquerda: hamburger (só mobile) + título */}
      <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-blue-700 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        )}
        <h1 className="text-base md:text-xl font-semibold truncate">
          {isMobile && (basePathname === '/dashboard' || basePathname === '/')
            ? 'Construtivo'
            : pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {/* Seletor de Obras - não exibir na página de configurações */}
        {!isConfiguracoesPage && (
          <div className="relative" ref={obraMenuRef}>
            <button
              onClick={() => {
                if (isDashboardPage) {
                  setObraMenuOpen(!obraMenuOpen);
                }
              }}
              className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-colors text-sm font-medium min-w-0 max-w-[140px] md:max-w-none md:min-w-[200px] justify-between ${isDashboardPage
                ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                : 'bg-blue-700/50 cursor-not-allowed opacity-75'
                }`}
              disabled={isLoadingObras || obras.length === 0 || !isDashboardPage}
              title={!isDashboardPage ? 'Alterar obra apenas disponível no Dashboard' : (obraSelecionada?.nome ?? 'Selecionar obra')}
            >
              <Building2 size={16} className="flex-shrink-0 md:w-[18px] md:h-[18px]" />
              <span className="truncate max-w-[90px] md:max-w-none">
                {isLoadingObras
                  ? '...'
                  : obraSelecionada
                    ? obraSelecionada.nome
                    : obras.length === 0
                      ? 'Nenhuma'
                      : 'Obra'}
              </span>
              <ChevronDown
                size={14}
                className={`flex-shrink-0 transition-transform ${obraMenuOpen ? 'rotate-180' : ''} ${!isDashboardPage ? 'opacity-50' : ''}`}
              />
            </button>

            {obraMenuOpen && obras.length > 0 && isDashboardPage && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-20 max-h-96 overflow-y-auto">
                {obras.map((obra) => (
                  <button
                    key={obra.id}
                    onClick={() => {
                      selecionarObra(obra);
                      setObraMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${obraSelecionada?.id === obra.id
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
                  void signOut();
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