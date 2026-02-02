"use client";

import { useEffect, useState } from 'react';
import { Calendar, Building, DollarSign, Clock, CheckCircle, AlertTriangle, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useObra } from '@/contexts/ObraContext';

interface ParcelaComPedido {
  id: number;
  data_prevista: string;
  valor: number;
  descricao: string | null;
  status: string;
  pedido_compra: {
    id: number;
    numero_ordem: number;
    valor_total: number;
    data_compra: string;
    status: string;
    obra_id: string;
    observacao: string | null;
    fornecedor: {
      id: number;
      nome: string;
      email: string | null;
      telefone: string | null;
    };
  };
}

interface ContasPagarComprasProps {
  onDataChange?: () => void;
}

export default function ContasPagarCompras({ onDataChange }: ContasPagarComprasProps) {
  const { obraSelecionada } = useObra();
  const [parcelas, setParcelas] = useState<ParcelaComPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    carregarParcelas();
  }, [obraSelecionada?.id]);

  const carregarParcelas = async () => {
    if (!obraSelecionada) {
      setParcelas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parcelas_pedido_compra')
        .select(`
          *,
          pedido_compra:pedido_compra_id(
            *,
            fornecedor:fornecedor_id(*)
          )
        `)
        .not('data_prevista', 'is', null)
        .order('data_prevista', { ascending: true });

      if (error) throw error;
      
      // Filtrar apenas parcelas da obra selecionada e de pedidos aprovados
      const parcelasDaObra = (data || []).filter(
        parcela =>
          parcela.pedido_compra?.status === 'Aprovado' &&
          parcela.pedido_compra?.obra_id === obraSelecionada.id
      );
      
      setParcelas(parcelasDaObra);
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPago = async (parcelaId: number) => {
    try {
      const { error } = await supabase
        .from('parcelas_pedido_compra')
        .update({ status: 'Pago' })
        .eq('id', parcelaId);

      if (error) throw error;

      // Atualizar a lista localmente
      setParcelas(parcelas.map(parcela => 
        parcela.id === parcelaId 
          ? { ...parcela, status: 'Pago' }
          : parcela
      ));

      // Notificar mudança para atualizar estatísticas
      if (onDataChange) {
        onDataChange();
      }

      console.log('Parcela marcada como paga:', parcelaId);
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      alert('Erro ao marcar como pago. Tente novamente.');
    }
  };

  const aplicarFiltros = () => {
    let parcelasFiltradas = [...parcelas];

    if (filtroStatus !== 'todas') {
      parcelasFiltradas = parcelasFiltradas.filter(p => p.status === filtroStatus);
    }

    if (filtroFornecedor) {
      parcelasFiltradas = parcelasFiltradas.filter(p => 
        p.pedido_compra?.fornecedor?.nome?.toLowerCase().includes(filtroFornecedor.toLowerCase())
      );
    }

    if (dataInicio) {
      parcelasFiltradas = parcelasFiltradas.filter(p => 
        new Date(p.data_prevista) >= new Date(dataInicio)
      );
    }

    if (dataFim) {
      parcelasFiltradas = parcelasFiltradas.filter(p => 
        new Date(p.data_prevista) <= new Date(dataFim)
      );
    }

    return parcelasFiltradas;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pago':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pago':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'vencido':
        return <AlertTriangle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getDiasParaVencimento = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const limparFiltros = () => {
    setFiltroStatus('todas');
    setFiltroFornecedor('');
    setDataInicio('');
    setDataFim('');
  };

  const parcelasFiltradas = aplicarFiltros();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Carregando contas a pagar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="todas">Todas</option>
            <option value="Pendente">Pendente</option>
            <option value="Pago">Pago</option>
            <option value="Vencido">Vencido</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
          <input
            type="text"
            placeholder="Buscar por fornecedor..."
            value={filtroFornecedor}
            onChange={(e) => setFiltroFornecedor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Data Início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Data Fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex flex-col justify-end">
          <button
            onClick={limparFiltros}
            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Lista de Parcelas */}
      {parcelasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
          <p className="text-gray-600">Não há contas a pagar que correspondam aos filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {parcelasFiltradas.map((parcela) => {
            const diasParaVencimento = getDiasParaVencimento(parcela.data_prevista);
            
            return (
              <div
                key={parcela.id}
                className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Building className="text-gray-600" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {parcela.pedido_compra.fornecedor.nome}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Pedido #{parcela.pedido_compra.numero_ordem}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-gray-500" size={16} />
                        <div>
                          <p className="text-xs text-gray-500">Vencimento</p>
                          <p className="text-sm font-medium">
                            {formatarData(parcela.data_prevista)}
                          </p>
                          {diasParaVencimento <= 0 && (
                            <p className="text-xs text-red-600">
                              {diasParaVencimento === 0 ? 'Vence hoje' : `Venceu há ${Math.abs(diasParaVencimento)} dias`}
                            </p>
                          )}
                          {diasParaVencimento > 0 && diasParaVencimento <= 7 && (
                            <p className="text-xs text-yellow-600">
                              Vence em {diasParaVencimento} dia(s)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="text-gray-500" size={16} />
                        <div>
                          <p className="text-xs text-gray-500">Valor</p>
                          <p className="text-sm font-medium">{formatarValor(parcela.valor)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusIcon(parcela.status)}
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(parcela.status)}`}>
                            {parcela.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {parcela.descricao && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Descrição</p>
                        <p className="text-sm text-gray-700">{parcela.descricao}</p>
                      </div>
                    )}

                    {parcela.pedido_compra.observacao && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Observações do Pedido</p>
                        <p className="text-sm text-gray-700">{parcela.pedido_compra.observacao}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {parcela.status === 'Pago' ? (
                      <span className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-md font-medium">
                        ✓ Pago
                      </span>
                    ) : (
                      <button 
                        className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                        onClick={() => marcarComoPago(parcela.id)}
                      >
                        Marcar como Pago
                      </button>
                    )}
                    
                    <p className="text-xs text-gray-500 text-right">
                      Pedido total: {formatarValor(parcela.pedido_compra.valor_total)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumo no final */}
      {parcelasFiltradas.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total de {parcelasFiltradas.length} conta(s) a pagar:
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatarValor(
                parcelasFiltradas.reduce((total, parcela) => total + parcela.valor, 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
