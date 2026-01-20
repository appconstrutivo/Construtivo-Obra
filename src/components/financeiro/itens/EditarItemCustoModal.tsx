'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XCircle } from 'lucide-react';
import { updateItemCusto, ItemCusto } from '@/lib/supabase';

type EditarItemCustoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: ItemCusto;
  grupoNome: string;
};

export default function EditarItemCustoModal({
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

  const unidadesDeMedida = [
    { valor: 'm²', nome: 'm² - Metro Quadrado' },
    { valor: 'm³', nome: 'm³ - Metro Cúbico' },
    { valor: 'm', nome: 'm - Metro Linear' },
    { valor: 'mês', nome: 'mês - Mês' },
    { valor: 'un', nome: 'un - Unidade' },
    { valor: 'kg', nome: 'kg - Quilo' },
    { valor: 'cj', nome: 'cj - Conjunto' },
    { valor: 'h', nome: 'h - Hora' },
    { valor: 'vb', nome: 'vb - Verba' },
  ];

  // Carregar dados do item quando o modal abrir
  useEffect(() => {
    if (isOpen && item) {
      setDescricao(item.descricao);
      setUnidade(item.unidade);
      setQuantidade(item.quantidade.toString());
      setPrecoUnitario(item.preco_unitario.toString());
      setErro('');
    }
  }, [isOpen, item]);

  // Reset form
  function handleClose() {
    setErro('');
    onClose();
  }

  async function handleSubmit() {
    if (!descricao.trim()) {
      setErro('Descrição é obrigatória');
      return;
    }

    if (!quantidade || parseFloat(quantidade) <= 0) {
      setErro('Quantidade deve ser maior que zero');
      return;
    }

    if (!precoUnitario || parseFloat(precoUnitario) <= 0) {
      setErro('Preço unitário deve ser maior que zero');
      return;
    }

    try {
      setSalvando(true);
      
      // Manter os valores atuais de realizado e realizado_percentual
      await updateItemCusto(
        item.id,
        descricao,
        unidade,
        parseFloat(quantidade),
        parseFloat(precoUnitario),
        item.realizado,
        item.realizado_percentual
      );

      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar item de custo:', error);
      setErro('Erro ao atualizar item de custo. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={handleClose}>
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* Centraliza o modal */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>
          
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={handleClose}
                >
                  <span className="sr-only">Fechar</span>
                  <XCircle className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      Editar Item de Custo
                    </Dialog.Title>
                    
                    <div className="mt-1 text-sm text-gray-500">
                      <p>ID: {item?.codigo}</p>
                      <p>Grupo: {grupoNome}</p>
                      {item?.item_orcamento_id && (
                        <p>Vinculado ao Item Orçamento ID: {item.item_orcamento_id}</p>
                      )}
                    </div>
                    
                    {erro && (
                      <div className="mt-2 p-2 bg-red-50 text-red-500 text-sm rounded">
                        {erro}
                      </div>
                    )}
                    
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                          Descrição
                        </label>
                        <input
                          type="text"
                          id="descricao"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={descricao}
                          onChange={(e) => setDescricao(e.target.value)}
                          placeholder="Descrição do item"
                        />
                      </div>

                      <div>
                        <label htmlFor="unidade" className="block text-sm font-medium text-gray-700">
                          Unidade de Medida
                        </label>
                        <select
                          id="unidade"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={unidade}
                          onChange={(e) => setUnidade(e.target.value)}
                        >
                          {unidadesDeMedida.map((und) => (
                            <option key={und.valor} value={und.valor}>
                              {und.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          id="quantidade"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value)}
                          placeholder="0,00"
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div>
                        <label htmlFor="precoUnitario" className="block text-sm font-medium text-gray-700">
                          Preço Unitário (R$)
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            id="precoUnitario"
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={precoUnitario}
                            onChange={(e) => setPrecoUnitario(e.target.value)}
                            placeholder="0,00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleSubmit}
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleClose}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 