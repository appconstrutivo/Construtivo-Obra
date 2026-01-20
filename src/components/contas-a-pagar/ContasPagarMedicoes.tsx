"use client";

import { useEffect, useState } from 'react';
import { Calendar, Building, DollarSign, Clock, CheckCircle, AlertTriangle, Ruler } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface ParcelaComMedicao {
  id: number;
  data_prevista: string;
  valor: number;
  descricao: string | null;
  status: string;
  medicao: {
    id: number;
    numero_ordem: number;
    valor_total: number;
    data_inicio: string;
    data_fim: string;
    status: string;
    observacao: string | null;
    negociacao: {
      id: number;
      numero: string;
      valor_total: number;
      descricao: string;
      fornecedor: {
        id: number;
        nome: string;
        email: string | null;
        telefone: string | null;
      };
    };
  };
}

interface ContasPagarMedicoesProps {
  onDataChange?: () => void;
}

export default function ContasPagarMedicoes({ onDataChange }: ContasPagarMedicoesProps) {
  const [parcelas, setParcelas] = useState<ParcelaComMedicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    carregarParcelas();
  }, []);

  const carregarParcelas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parcelas_medicao')
        .select(`
          *,
          medicao:medicao_id(
            *,
            negociacao:negociacao_id(
              *,
              fornecedor:fornecedor_id(*)
            )
          )
        `)
        .not('data_prevista', 'is', null)
        .order('data_prevista', { ascending: true });

      if (error) throw error;
      
      console.log('Parcelas de medição carregadas:', data?.length || 0);
      
      // Filtrar apenas parcelas de medições aprovadas
      const parcelasAprovadas = (data || []).filter(
        parcela => parcela.medicao?.status === 'Aprovado'
      );
      
      console.log('Parcelas de medições aprovadas:', parcelasAprovadas.length);
      
      setParcelas(parcelasAprovadas);
    } catch (error) {
      console.error('Erro ao carregar parcelas de medição:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPago = async (parcelaId: number) => {
    try {
      const { error } = await supabase
        .from('parcelas_medicao')
        .update({ status: 'Pago' })
        .eq('id', parcelaId);

      if (error) throw error;

      // Recarregar parcelas
      await carregarParcelas();
      
      // Notificar mudança
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      alert('Erro ao marcar parcela como paga. Tente novamente.');
    }
  };

  const aplicarFiltros = () => {
    let parcelasFiltradas = [...parcelas];

    if (filtroStatus !== 'todas') {
      if (filtroStatus === 'pago') {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.status === 'Pago');
      } else if (filtroStatus === 'pendente') {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.status !== 'Pago');
      }
    }

    if (filtroFornecedor) {
      parcelasFiltradas = parcelasFiltradas.filter(p => 
        p.medicao?.negociacao?.fornecedor?.nome?.toLowerCase().includes(filtroFornecedor.toLowerCase())
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

  const getStatusColor = (diasParaVencimento: number, status: string) => {
    if (status === 'Pago') return 'bg-green-100 text-green-800';
    if (diasParaVencimento < 0) return 'bg-red-100 text-red-800';
    if (diasParaVencimento <= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusIcon = (diasParaVencimento: number, status: string) => {
    if (status === 'Pago') return <CheckCircle size={16} className="text-green-600" />;
    if (diasParaVencimento < 0) return <AlertTriangle size={16} className="text-red-600" />;
    if (diasParaVencimento <= 7) return <Clock size={16} className="text-yellow-600" />;
    return <Calendar size={16} className="text-blue-600" />;
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

  const getDiasParaVencimento = (dataPrevista: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataPrevista);
    vencimento.setHours(0, 0, 0, 0);
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
        <span className="ml-3 text-gray-600">Carregando contas de medições...</span>
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
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
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
          <Ruler className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
          <p className="text-gray-600">Não há parcelas de medições que correspondam aos filtros aplicados.</p>
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
                          {parcela.medicao.negociacao.fornecedor.nome}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Contrato {parcela.medicao.negociacao.numero} - Medição #{parcela.medicao.numero_ordem}
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
                          {parcela.status !== 'Pago' && (
                            <p className={`text-xs font-medium ${
                              diasParaVencimento < 0 
                                ? 'text-red-600' 
                                : diasParaVencimento <= 7 
                                  ? 'text-yellow-600' 
                                  : 'text-blue-600'
                            }`}>
                              {diasParaVencimento < 0 
                                ? `Vencida há ${Math.abs(diasParaVencimento)} dia(s)` 
                                : diasParaVencimento === 0
                                  ? 'Vence hoje'
                                  : `Vence em ${diasParaVencimento} dia(s)`
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="text-gray-500" size={16} />
                        <div>
                          <p className="text-xs text-gray-500">Valor da Parcela</p>
                          <p className="text-sm font-medium">{formatarValor(parcela.valor)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusIcon(diasParaVencimento, parcela.status)}
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(diasParaVencimento, parcela.status)}`}>
                            {parcela.status === 'Pago' 
                              ? 'Pago' 
                              : diasParaVencimento < 0 
                                ? 'Vencida' 
                                : diasParaVencimento <= 7 
                                  ? 'Vence em breve' 
                                  : 'Pendente'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {parcela.descricao && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Descrição da Parcela</p>
                        <p className="text-sm text-gray-700">{parcela.descricao}</p>
                      </div>
                    )}

                    {parcela.medicao.negociacao.descricao && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Descrição do Contrato</p>
                        <p className="text-sm text-gray-700">{parcela.medicao.negociacao.descricao}</p>
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
                      Medição total: {formatarValor(parcela.medicao.valor_total)}
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
