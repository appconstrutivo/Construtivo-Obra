"use client";

import React, { useState } from 'react';
import Link from 'next/link';

const menuItems = [
  { href: '/', title: 'Dashboard' },
  { href: '/financeiro', title: 'Controle Financeiro' },
  { href: '/medicoes', title: 'Medições' },
  { href: '/negociacoes', title: 'Negociações' },
  { href: '/fornecedores', title: 'Fornecedores' },
];

const supportItems = [
  { href: '/configuracoes', title: 'Configurações' },
  { href: '/ajuda', title: 'Ajuda' },
  { href: '/plano', title: 'Atualizar plano' },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`flex h-screen flex-col border-r bg-white px-3 py-4 ${isCollapsed ? "w-16" : "w-64"}`}>
      <div className="flex items-center justify-between h-14">
        {!isCollapsed && <span className="text-lg font-bold text-blue-600">Construtivo</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="flex flex-col gap-4">
          <div>
            {menuItems.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                {!isCollapsed && item.title}
              </Link>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            {!isCollapsed && <div className="px-3 text-xs font-semibold text-gray-500 mb-2">SUPORTE</div>}
            {supportItems.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                {!isCollapsed && item.title}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <div className="flex flex-col items-center border-t pt-4">
        {!isCollapsed && (
          <div className="mb-2 text-xs text-gray-500">
            <span>v1.0.0 • Sistema de Controle de Obras</span>
            <br />
            <span>© 2024</span>
          </div>
        )}
      </div>
    </aside>
  );
} 