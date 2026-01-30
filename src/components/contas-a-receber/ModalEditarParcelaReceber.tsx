"use client";

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import { updateParcelaReceber } from '@/lib/supabase-clientes';
import { Cliente, ParcelaReceber } from '@/lib/supabase';

interface ParcelaComCliente extends ParcelaReceber {
  cliente?: Cliente | null;
}

interface ModalEditarParcelaReceberProps {
  parcela: ParcelaComCliente;
  clientes: Cliente[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalEditarParcelaReceber({
  parcela,
  clientes,
  onClose,
  onSuccess
}: ModalEditarParcelaReceberProps) {
  const [clienteId, setClienteId] = useState<number | ''>(parcela.cliente_id);
  const [descricao, setDescricao] = useState(parcela.descricao || '');
  const [valor, setValor] = useState(
    parcela.valor != null
      ? Number(parcela.valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      : ''
  );
  const [dataVencimento, setDataVencimento] = useState(
    parcela.data_vencimento ? parcela.data_vencimento.split('T')[0] : ''
  );
  const [categoria, setCategoria] = useState(parcela.categoria || '');
  const [numeroDocumento, setNumeroDocumento] = useState(
    parcela.numero_documento || ''
  );
  const [observacoes, setObservacoes] = useState(parcela.observacoes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setClienteId(parcela.cliente_id);
    setDescricao(parcela.descricao || '');
    setValor(
      parcela.valor != null
        ? Number(parcela.valor).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        : ''
    );
    setDataVencimento(
      parcela.data_vencimento ? parcela.data_vencimento.split('T')[0] : ''
    );
    setCategoria(parcela.categoria || '');
    setNumeroDocumento(parcela.numero_documento || '');
    setObservacoes(parcela.observacoes || '');
  }, [parcela]);

  const categoriasPredefinidas = [
    'Medição',
    'Adiantamento',
    'Reembolso',
    'Investimento',
    'Aporte',
    'Receita Operacional',
    'Receita Financeira',
    'Outros'
  ];

  const formatarValor = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    const numero = Number(numeros) / 100;
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarValor(e.target.value);
    setValor(valorFormatado);
  };

  const converterValorParaNumero = (valorFormatado: string): number => {
    const numeros = valorFormatado.replace(/\D/g, '');
    return Number(numeros) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !descricao || !valor || !dataVencimento) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const valorNumerico = converterValorParaNumero(valor);

    if (valorNumerico <= 0) {
      alert('O valor deve ser maior que zero');
      return;
    }

    setLoading(true);

    try {
      await updateParcelaReceber(
        parcela.id,
        Number(clienteId),
        descricao,
        valorNumerico,
        dataVencimento,
        categoria || undefined,
        numeroDocumento || undefined,
        observacoes || undefined
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      alert('Erro ao atualizar lançamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Editar Lançamento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cliente */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Cliente / Investidor *
            </label>
            <select
              value={clienteId}
              onChange={(e) =>
                setClienteId(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome} - {cliente.tipo} ({cliente.documento})
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Descrição *
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Medição 01 - Fundação e Estrutura"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <DollarSign size={16} />
                Valor *
              </label>
              <input
                type="text"
                value={valor}
                onChange={handleValorChange}
                placeholder="0,00"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar size={16} />
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Tag size={16} />
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Selecione uma categoria...</option>
              {categoriasPredefinidas.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Número do Documento */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <FileText size={16} />
              Número do Documento
            </label>
            <input
              type="text"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="Ex: NF-001, Contrato-123, etc."
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre este lançamento"
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Resumo */}
          {valor && clienteId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Resumo do Lançamento
              </h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p>
                  <span className="font-medium">Cliente:</span>{' '}
                  {clientes.find((c) => c.id === Number(clienteId))?.nome}
                </p>
                <p>
                  <span className="font-medium">Valor:</span> R$ {valor}
                </p>
                {dataVencimento && (
                  <p>
                    <span className="font-medium">Vencimento:</span>{' '}
                    {dataVencimento.split('-').reverse().join('/')}
                  </p>
                )}
                {categoria && (
                  <p>
                    <span className="font-medium">Categoria:</span> {categoria}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
