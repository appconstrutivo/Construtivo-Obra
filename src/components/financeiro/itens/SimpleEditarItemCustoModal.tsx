'use client';

import React, { useState, useEffect } from 'react';
import { updateItemCusto, ItemCusto } from '@/lib/supabase';

type EditarItemCustoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: ItemCusto;
  grupoNome: string;
};

export default function SimpleEditarItemCustoModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  grupoNome
}: EditarItemCustoModalProps) {
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('');
  const [quantidade, setQuantidade] = useState<string>('');
  const [precoUnitario, setPrecoUnitario] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Se o modal não estiver aberto, não renderizar nada
  if (!isOpen) return null;

  const handleClose = () => {
    setErro('');
    onClose();
  };

  // Usar useEffect para carregar dados ao abrir o modal
  useEffect(() => {
    if (isOpen && item) {
      setDescricao(item.descricao);
      setUnidade(item.unidade);
      setQuantidade(item.quantidade.toString());
      setPrecoUnitario(item.preco_unitario.toString());
      setErro('');
    }
  }, [isOpen, item]);

  const handleSubmit = async () => {
    if (!descricao.trim()) {
      setErro('Descrição é obrigatória');
      return;
    }

    try {
      setSalvando(true);
      
      await updateItemCusto(
        item.id,
        descricao,
        unidade,
        parseFloat(quantidade),
        parseFloat(precoUnitario),
        item.realizado,
        item.realizado_percentual
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar item de custo:', error);
      setErro('Erro ao atualizar item de custo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Editar Item de Custo</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            X
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-500">ID: {item?.codigo}</p>
          <p className="text-sm text-gray-500">Grupo: {grupoNome}</p>
        </div>
        
        {erro && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {erro}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium mb-1">Quantidade</label>
              <input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-full p-2 border rounded"
                step="0.01"
              />
            </div>
            
            <div className="w-1/2">
              <label className="block text-sm font-medium mb-1">Preço Unitário</label>
              <input
                type="number"
                value={precoUnitario}
                onChange={(e) => setPrecoUnitario(e.target.value)}
                className="w-full p-2 border rounded"
                step="0.01"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={salvando}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
} 