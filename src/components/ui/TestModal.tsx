'use client';

import React from 'react';

type TestModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function TestModal({ isOpen, onClose }: TestModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Modal de Teste</h2>
        <p className="mb-4">Este é um modal simples sem dependências externas.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Fechar
        </button>
      </div>
    </div>
  );
} 