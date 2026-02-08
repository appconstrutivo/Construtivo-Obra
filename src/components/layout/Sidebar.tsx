"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from '@/app/navigation';
import { cn } from '@/lib/utils';
import {
  Package,
  Ruler,
  ClipboardList,
  Building2,
  Settings,
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
import { useLayout } from '@/contexts/LayoutContext';

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
  isMobile?: boolean;
  closeMobileMenu?: () => void;
}

const SidebarContext = React.createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  isMobile: false,
  closeMobileMenu: () => {},
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
        icon: Package,
        title: 'Controle de Insumo',
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
        href: '/relatorios',
        icon: FileBarChart,
        title: 'Relatórios',
      },
      {
        href: '/orcamento',
        icon: Calculator,
        title: 'Orçamento',
      },
      {
        href: '/inteligencia-artificial',
        icon: Brain,
        title: 'Inteligência Artificial',
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
  const { setIsCollapsed, isMobile, closeMobileMenu } = React.useContext(SidebarContext);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    setIsCollapsed(true);
    if (isMobile && closeMobileMenu) closeMobileMenu();

    if (pathname === href) {
      return;
    }

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
  const { mobileMenuOpen, setMobileMenuOpen, isMobile, closeMobileMenu } = useLayout();

  // Em desktop (< 1024) manter recolhido; em mobile o drawer controla a visibilidade
  useEffect(() => {
    if (isMobile) return;
    const checkScreenSize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
      return;
    }
    setIsCollapsed(prev => !prev);
  };

  const handleProfileClick = () => {
    router.push('/perfil');
    setIsCollapsed(true);
    if (isMobile) closeMobileMenu();
  };

  const handleLogoutClick = () => {
    void signOut();
    setIsCollapsed(true);
    if (isMobile) closeMobileMenu();
  };

  // No mobile sempre exibir só ícones (layout compacto)
  const displayCollapsed = isCollapsed || isMobile;

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isMobile, closeMobileMenu }}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out",
          isMobile
            ? "fixed inset-y-0 left-0 z-50 w-[56px] shadow-xl md:relative md:z-auto md:shadow-none"
            : "relative",
          isMobile && (mobileMenuOpen ? "translate-x-0" : "-translate-x-full"),
          !isMobile && (isCollapsed ? "w-16 overflow-hidden" : "w-56")
        )}
      >
        {/* Cabeçalho (logo + botão recolher): só em desktop; no mobile não exibe para ganhar largura */}
        {!isMobile && (
          <div className={cn(
            "flex h-14 md:h-16 items-center border-b transition-all",
            displayCollapsed ? "justify-center px-2" : "justify-between px-3"
          )}>
            {!displayCollapsed ? (
              <div className="flex items-center gap-2">
                <Building2 size={24} className="text-primary" />
                <span className="text-xl font-bold text-primary">Construtivo</span>
              </div>
            ) : (
              <Building2 size={24} className="text-primary" />
            )}
            <button
              onClick={toggleSidebar}
              className="rounded-full p-2 hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
              aria-label={displayCollapsed ? "Fechar menu" : "Recolher menu"}
            >
              {displayCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto px-2 md:px-3", isMobile ? "py-3 pt-4" : "py-4 md:py-6")}>
          <nav className="flex flex-col gap-1 md:gap-6">
            {menuItems.map((section, i) => (
              <div key={i} className="flex flex-col gap-1 md:gap-2">
                {section.title && !displayCollapsed && (
                  <div className="mb-1 px-3 text-xs font-semibold tracking-wider text-muted-foreground">
                    {section.title}
                  </div>
                )}
                {section.title && displayCollapsed && (
                  <div className="mb-2 h-px w-full bg-border" />
                )}

                {section.items.map((item, j) => (
                  <NavItem
                    key={j}
                    href={item.href}
                    icon={item.icon}
                    title={item.title}
                    isCollapsed={displayCollapsed}
                    iconColor={item.iconColor}
                  />
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className={cn(
          "border-t pt-3 pb-3 md:pt-4 md:pb-4 px-2 md:px-3",
          displayCollapsed ? "items-center flex flex-col" : ""
        )}>
          <div
            onClick={handleProfileClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 md:px-3 py-2.5 text-sm font-medium transition-all hover:bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer touch-manipulation",
              displayCollapsed ? "justify-center w-10 mx-auto" : "w-full"
            )}
          >
            <User size={displayCollapsed ? 20 : 18} />
            {!displayCollapsed && <span>Perfil</span>}
          </div>

          <div
            onClick={handleLogoutClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 md:px-3 py-2.5 text-sm font-medium transition-all hover:bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer mt-1 touch-manipulation",
              displayCollapsed ? "justify-center w-10 mx-auto" : "w-full"
            )}
          >
            <LogOut size={displayCollapsed ? 20 : 18} />
            {!displayCollapsed && <span>Sair</span>}
          </div>

          {!displayCollapsed && (
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