'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { XCircle, AlertTriangle } from 'lucide-react';

type ConfirmacaoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensagem: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
};

export default function ConfirmacaoModal({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  mensagem,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar'
}: ConfirmacaoModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-[100]"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition duration-300 ease-out data-[closed]:opacity-0 data-[enter]:ease-out data-[leave]:ease-in data-[leave]:duration-200"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className="relative mx-auto max-w-lg rounded-lg bg-white p-6 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:ease-out data-[leave]:ease-in data-[leave]:duration-200 data-[leave]:scale-95 data-[leave]:opacity-0"
        >
          <div className="absolute right-0 top-0 pt-4 pr-4">
            <button
              type="button"
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
              aria-label="Fechar"
            >
              <XCircle className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle as="h3" className="text-lg font-medium leading-6 text-gray-900">
                {titulo}
              </DialogTitle>
              <p className="mt-2 text-sm text-gray-500">
                {mensagem}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-row-reverse gap-3 sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
              onClick={onConfirm}
            >
              {confirmButtonText}
            </button>
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              {cancelButtonText}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
