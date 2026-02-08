'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface LayoutContextType {
  /** Aberto apenas em viewport mobile; usado para drawer da sidebar */
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** true quando viewport < 768px (md) */
  isMobile: boolean;
  /** Fecha o menu mobile (ex.: ao navegar ou clicar no overlay) */
  closeMobileMenu: () => void;
}

const LayoutContext = React.createContext<LayoutContextType>({
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  isMobile: false,
  closeMobileMenu: () => {},
});

const MOBILE_BREAKPOINT = 768;

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const check = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <LayoutContext.Provider
      value={{ mobileMenuOpen, setMobileMenuOpen, isMobile, closeMobileMenu }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextType {
  const ctx = useContext(LayoutContext);
  return ctx ?? {
    mobileMenuOpen: false,
    setMobileMenuOpen: () => {},
    isMobile: false,
    closeMobileMenu: () => {},
  };
}
