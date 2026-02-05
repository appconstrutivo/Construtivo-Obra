'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XCircle } from 'lucide-react';
import { updateCentroCusto, CentroCusto } from '@/lib/supabase';

type EditarCentroCustoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  centroCusto: CentroCusto;
};

export default function EditarCentroCustoModal({
  isOpen,
  onClose,
  onSuccess,
  centroCusto
}: EditarCentroCustoModalProps) {
  const [descricao, setDescricao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (centroCusto) {
      setDescricao(centroCusto.descricao || '');
    }
  }, [centroCusto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descricao.trim()) {
      setErro('A descrição é obrigatória');
      return;
    }

    setErro('');
    setCarregando(true);

    try {
      await updateCentroCusto(centroCusto.id, descricao);
      onSuccess();
    } catch (error: any) {
      setErro('Erro ao atualizar etapa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setCarregando(false);
    }
  };

  const handleClose = () => {
    setErro('');
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={handleClose}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
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

          {/* Este elemento é para enganar o navegador para centralizar o modal */}
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
                      Editar Etapa
                    </Dialog.Title>

                    <div className="mt-4">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="codigo" className="block text-sm font-medium text-gray-700">
                            Código
                          </label>
                          <input
                            type="text"
                            name="codigo"
                            id="codigo"
                            value={centroCusto?.codigo || ''}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 focus:outline-none sm:text-sm"
                            disabled
                          />
                        </div>

                        <div>
                          <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                            Descrição
                          </label>
                          <input
                            type="text"
                            name="descricao"
                            id="descricao"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Ex: Infraestrutura"
                            disabled={carregando}
                          />
                        </div>

                        {erro && (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                            {erro}
                          </div>
                        )}

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={carregando}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                          >
                            {carregando ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={handleClose}
                            disabled={carregando}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 