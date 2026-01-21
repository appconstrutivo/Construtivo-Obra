'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface PedidoRelacionado {
  id: number;
  data_compra: string;
  valor_total: number;
  status: string;
  fornecedor_nome: string;
  item_valor: number;
}

interface MedicaoRelacionada {
  id: number;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: string;
  contrato: string;
  fornecedor_nome: string;
  item_valor: number;
}

interface NegociacaoRelacionada {
  item_negociacao_id: number;
  negociacao_id: number;
  numero: string;
  descricao: string;
  fornecedor_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface RelacionamentosItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  itemCodigo: string;
  itemDescricao: string;
}

export function RelacionamentosItemModal({
  isOpen,
  onClose,
  itemId,
  itemCodigo,
  itemDescricao
}: RelacionamentosItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoRelacionado[]>([]);
  const [medicoes, setMedicoes] = useState<MedicaoRelacionada[]>([]);
  const [negociacoes, setNegociacoes] = useState<NegociacaoRelacionada[]>([]);
  const [removendoVinculoId, setRemovendoVinculoId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && itemId) {
      fetchRelacionamentos();
    }
  }, [isOpen, itemId]);

  const fetchRelacionamentos = async () => {
    setLoading(true);
    try {
      // Buscar negociações/contratos vinculados diretamente (itens_negociacao)
      const { data: negociacoesData } = await supabase
        .from('itens_negociacao')
        .select(`
          id,
          negociacao_id,
          quantidade,
          valor_unitario,
          valor_total,
          negociacoes:negociacao_id (
            numero,
            descricao,
            fornecedores:fornecedor_id (nome)
          )
        `)
        .eq('item_custo_id', itemId);

      // Buscar pedidos de compra relacionados
      const { data: pedidosData } = await supabase
        .from('itens_pedido_compra')
        .select(`
          valor_total,
          pedidos_compra (
            id,
            data_compra,
            valor_total,
            status,
            fornecedores (nome)
          )
        `)
        .eq('item_custo_id', itemId);

      // Buscar medições relacionadas diretamente via itens_medicao
      const { data: medicoesData } = await supabase
        .from('itens_medicao')
        .select(`
          valor_total,
          medicoes!inner (
            id,
            data_inicio,
            data_fim,
            valor_total,
            status,
            negociacoes (
              numero,
              fornecedores (nome)
            )
          ),
          itens_negociacao!inner (
            item_custo_id
          )
        `)
        .eq('itens_negociacao.item_custo_id', itemId)
        .eq('medicoes.status', 'Aprovado');

      // Processar negociações
      const negociacoesProcessadas: NegociacaoRelacionada[] = negociacoesData?.map((row: any) => ({
        item_negociacao_id: row.id,
        negociacao_id: row.negociacao_id,
        numero: row.negociacoes?.numero || `#${row.negociacao_id}`,
        descricao: row.negociacoes?.descricao || 'Sem descrição',
        fornecedor_nome: row.negociacoes?.fornecedores?.nome || 'Não especificado',
        quantidade: Number(row.quantidade || 0),
        valor_unitario: Number(row.valor_unitario || 0),
        valor_total: Number(row.valor_total || 0),
      })) || [];

      // Processar pedidos
      const pedidosProcessados: PedidoRelacionado[] = pedidosData?.map((item: any) => ({
        id: item.pedidos_compra.id,
        data_compra: item.pedidos_compra.data_compra,
        valor_total: item.pedidos_compra.valor_total,
        status: item.pedidos_compra.status,
        fornecedor_nome: item.pedidos_compra.fornecedores?.nome || 'Não especificado',
        item_valor: item.valor_total
      })) || [];

      // Processar medições
      const medicoesProcessadas: MedicaoRelacionada[] = medicoesData?.map((item: any) => ({
        id: item.medicoes.id,
        data_inicio: item.medicoes.data_inicio,
        data_fim: item.medicoes.data_fim,
        valor_total: item.medicoes.valor_total,
        status: item.medicoes.status,
        contrato: item.medicoes.negociacoes.numero,
        fornecedor_nome: item.medicoes.negociacoes.fornecedores?.nome || 'Não especificado',
        item_valor: item.valor_total
      })) || [];

      setNegociacoes(negociacoesProcessadas);
      setPedidos(pedidosProcessados);
      setMedicoes(medicoesProcessadas);
    } catch (error) {
      console.error('Erro ao buscar relacionamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const removerVinculoNegociacao = async (itemNegociacaoId: number) => {
    setRemovendoVinculoId(itemNegociacaoId);
    try {
      const { error } = await supabase
        .from('itens_negociacao')
        .delete()
        .eq('id', itemNegociacaoId);

      if (error) throw error;

      await fetchRelacionamentos();
    } catch (error) {
      console.error('Erro ao remover vínculo do item na negociação:', error);
    } finally {
      setRemovendoVinculoId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Relacionamentos do Item
            </h2>
            <p className="text-gray-600 mt-1">
              {itemCodigo} - {itemDescricao}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Negociações / Contratos */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Negociações/Contratos ({negociacoes.length})
              </h3>
              
              {negociacoes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma negociação/contrato encontrado para este item.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contrato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fornecedor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qtde
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          V. Unit.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {negociacoes.map((n) => (
                        <tr key={n.item_negociacao_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <Link
                              href={`/negociacoes/editar/${n.negociacao_id}`}
                              className="text-blue-600 hover:text-blue-800"
                              title="Abrir contrato para revisão"
                            >
                              {n.numero}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {n.fornecedor_nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {n.descricao}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {n.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(n.valor_unitario)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                            {formatCurrency(n.valor_total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              onClick={() => removerVinculoNegociacao(n.item_negociacao_id)}
                              disabled={removendoVinculoId === n.item_negociacao_id}
                              title="Remove o vínculo (remove o item do contrato)"
                            >
                              {removendoVinculoId === n.item_negociacao_id ? 'Removendo...' : 'Remover vínculo'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pedidos de Compra */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Pedidos de Compra ({pedidos.length})
              </h3>
              
              {pedidos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum pedido de compra encontrado para este item.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Compra
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fornecedor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Pedido
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pedidos.map((pedido) => (
                        <tr key={pedido.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {pedido.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(pedido.data_compra)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pedido.fornecedor_nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pedido.status === 'Aprovado' 
                                ? 'bg-green-100 text-green-800'
                                : pedido.status === 'Pendente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {pedido.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {formatCurrency(pedido.item_valor)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(pedido.valor_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Medições */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Medições ({medicoes.length})
              </h3>
              
              {medicoes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma medição encontrada para este item.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contrato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fornecedor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Medição
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {medicoes.map((medicao) => (
                        <tr key={medicao.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {medicao.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {medicao.contrato}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(medicao.data_inicio)} a {formatDate(medicao.data_fim)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {medicao.fornecedor_nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              medicao.status === 'Aprovado' 
                                ? 'bg-green-100 text-green-800'
                                : medicao.status === 'Pendente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {medicao.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {formatCurrency(medicao.item_valor)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(medicao.valor_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Resumo */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Resumo</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total em Pedidos Aprovados</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(pedidos.filter(p => p.status === 'Aprovado').reduce((acc, p) => acc + p.item_valor, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total em Medições Aprovadas</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(medicoes.filter(m => m.status === 'Aprovado').reduce((acc, m) => acc + m.item_valor, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Realizado</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(
                      pedidos.filter(p => p.status === 'Aprovado').reduce((acc, p) => acc + p.item_valor, 0) +
                      medicoes.filter(m => m.status === 'Aprovado').reduce((acc, m) => acc + m.item_valor, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
} 