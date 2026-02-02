"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from '@/app/navigation';
import { cn } from '@/lib/utils';
import {
  Landmark,
  Ruler,
  ClipboardList,
  Building2,
  Settings,
  HelpCircle,
  Crown,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  LogOut,
  Users,
  ShoppingCart,
  Brain,
  Receipt,
  TrendingUp,
  FileBarChart,
  Calculator,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

// Define o tipo para o item de menu
interface MenuItem {
  href: string;
  icon: React.ElementType;
  title: string;
  iconColor?: string;
}

// Define o tipo para a seção de menu
interface MenuSection {
  title?: string;
  items: MenuItem[];
}

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  title: string;
  isCollapsed: boolean;
  iconColor?: string;
}

// Criar contexto para gerenciar o estado do sidebar
interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = React.createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => { }
});

const menuItems: MenuSection[] = [
  {
    items: [
      {
        href: '/dashboard',
        icon: Home,
        title: 'Dashboard',
      },
      {
        href: '/financeiro',
        icon: Landmark,
        title: 'Controle Financeiro',
      },
      {
        href: '/medicoes',
        icon: Ruler,
        title: 'Medições',
      },
      {
        href: '/compras',
        icon: ShoppingCart,
        title: 'Compras',
      },
      {
        href: '/contas-a-pagar',
        icon: Receipt,
        title: 'Contas a Pagar',
      },
      {
        href: '/contas-a-receber',
        icon: TrendingUp,
        title: 'Contas a Receber',
      },
      {
        href: '/orcamento',
        icon: Calculator,
        title: 'Orçamento',
      },
      {
        href: '/negociacoes',
        icon: ClipboardList,
        title: 'Contratos',
      },
      {
        href: '/fornecedores',
        icon: Users,
        title: 'Fornecedores',
      },
      {
        href: '/inteligencia-artificial',
        icon: Brain,
        title: 'Inteligência Artificial',
      },
      {
        href: '/relatorios',
        icon: FileBarChart,
        title: 'Relatórios',
      },
    ],
  },
  {
    title: 'SUPORTE',
    items: [
      {
        href: '/configuracoes',
        icon: Settings,
        title: 'Configurações',
      },
      {
        href: '/ajuda',
        icon: HelpCircle,
        title: 'Ajuda',
      },
      {
        href: '/plano',
        icon: Crown,
        title: 'Atualizar plano',
        iconColor: '#FFD700',
      },
    ],
  },
];

function NavItem({ href, icon: Icon, title, isCollapsed, iconColor }: NavItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === href;
  const { setIsCollapsed } = React.useContext(SidebarContext);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Fechar o sidebar quando o usuário clicar em um item, independentemente do tamanho da tela
    setIsCollapsed(true);

    // Se já estamos na página clicada e clicamos novamente, 
    // podemos simplesmente ignorar para evitar recargas desnecessárias
    if (pathname === href) {
      return;
    }

    // Usar o router para todas as navegações, de forma consistente
    router.push(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        isCollapsed ? "justify-center w-10 mx-auto" : "w-full"
      )}
    >
      <div className={cn(
        "flex items-center justify-center rounded-md",
        isActive ? "text-primary" : iconColor ? "" : "text-muted-foreground group-hover:text-foreground"
      )}>
        <Icon
          size={isCollapsed ? 20 : 18}
          strokeWidth={isActive ? 2.5 : 2}
          style={iconColor ? { color: iconColor } : {}}
        />
      </div>

      {!isCollapsed && (
        <span className="truncate">{title}</span>
      )}

      {isActive && !isCollapsed && (
        <motion.div
          className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
          layoutId="activeIndicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </a>
  );
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();

  // Verificar o tamanho da tela quando o componente montar
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    // Verificar o tamanho inicial da tela
    checkScreenSize();

    // Adicionar event listener para verificar quando a tela for redimensionada
    window.addEventListener('resize', checkScreenSize);

    // Limpar o event listener
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleProfileClick = () => {
    router.push('/perfil');

    // Fechar o sidebar independentemente do tamanho da tela
    setIsCollapsed(true);
  };

  const handleLogoutClick = () => {
    // Implementar lógica de logout
    void signOut();

    // Fechar o sidebar independentemente do tamanho da tela
    setIsCollapsed(true);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out relative",
          isCollapsed ? "w-16 overflow-hidden" : "w-56"
        )}
      >
        <div className={cn(
          "flex h-16 items-center px-3 border-b transition-all",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <Building2 size={24} className="text-primary" />
              <span className="text-xl font-bold text-primary">Construtivo</span>
            </div>
          ) : (
            <Building2 size={24} className="text-primary" />
          )}
          <button
            onClick={toggleSidebar}
            className="rounded-full p-2 hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <nav className="flex flex-col gap-6">
            {menuItems.map((section, i) => (
              <div key={i} className="flex flex-col gap-2">
                {section.title && !isCollapsed && (
                  <div className="mb-1 px-3 text-xs font-semibold tracking-wider text-muted-foreground">
                    {section.title}
                  </div>
                )}
                {section.title && isCollapsed && (
                  <div className="mb-2 h-px w-full bg-border" />
                )}

                {section.items.map((item, j) => (
                  <NavItem
                    key={j}
                    href={item.href}
                    icon={item.icon}
                    title={item.title}
                    isCollapsed={isCollapsed}
                    iconColor={item.iconColor}
                  />
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className={cn(
          "border-t pt-4 pb-4 px-3",
          isCollapsed ? "items-center flex flex-col" : ""
        )}>
          <div
            onClick={handleProfileClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer",
              isCollapsed ? "justify-center w-10 mx-auto" : "w-full"
            )}
          >
            <User size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Perfil</span>}
          </div>

          <div
            onClick={handleLogoutClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer mt-1",
              isCollapsed ? "justify-center w-10 mx-auto" : "w-full"
            )}
          >
            <LogOut size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Sair</span>}
          </div>

          {!isCollapsed && (
            <div className="mt-6 text-xs text-center text-muted-foreground">
              <div>v1.0.0 • Sistema de Obras</div>
              <div className="mt-1">© 2024 Construtivo</div>
            </div>
          )}
        </div>
      </aside>
    </SidebarContext.Provider>
  );
} 