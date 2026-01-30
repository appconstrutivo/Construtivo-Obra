"use client";

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Calendar, DollarSign, AlertCircle, Plus, Users, Filter, X, CheckCircle, Clock, Ban, Pencil } from 'lucide-react';
import { fetchParcelasReceber, fetchClientes, marcarParcelaComoRecebida, cancelarParcelaReceber, deleteParcelaReceber, atualizarParcelasAtrasadas } from '@/lib/supabase-clientes';
import { useObra } from '@/contexts/ObraContext';
import { Cliente, ParcelaReceber } from '@/lib/supabase';
import ModalNovoCliente from '@/components/contas-a-receber/ModalNovoCliente';
import ModalNovaParcelaReceber from '@/components/contas-a-receber/ModalNovaParcelaReceber';
import ModalEditarParcelaReceber from '@/components/contas-a-receber/ModalEditarParcelaReceber';

interface ParcelaComCliente extends ParcelaReceber {
  cliente: Cliente;
}

interface EstatisticasReceber {
  vencidas: number;
  proximos7Dias: number;
  proximos30Dias: number;
  totalReceber: number;
  totalRecebido: number;
}

export default function ContasReceberPage() {
  const { obraSelecionada } = useObra();
  const [parcelas, setParcelas] = useState<ParcelaComCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [estatisticas, setEstatisticas] = useState<EstatisticasReceber>({
    vencidas: 0,
    proximos7Dias: 0,
    proximos30Dias: 0,
    totalReceber: 0,
    totalRecebido: 0
  });

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Modais
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [modalParcelaAberto, setModalParcelaAberto] = useState(false);
  const [modalRecebimentoAberto, setModalRecebimentoAberto] = useState(false);
  const [modalEditarParcelaAberto, setModalEditarParcelaAberto] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<ParcelaComCliente | null>(null);
  const [parcelaParaEditar, setParcelaParaEditar] = useState<ParcelaComCliente | null>(null);

  // Dados do recebimento
  const [dataRecebimento, setDataRecebimento] = useState('');
  const [formaRecebimento, setFormaRecebimento] = useState('');

  useEffect(() => {
    carregarDados();
  }, [obraSelecionada?.id]);

  const carregarDados = async () => {
    const isInitial = !hasLoadedOnceRef.current;
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      await atualizarParcelasAtrasadas();
      const [parcelasData, clientesData] = await Promise.all([
        fetchParcelasReceber(obraSelecionada?.id),
        fetchClientes()
      ]);
      setParcelas(parcelasData as ParcelaComCliente[]);
      setClientes(clientesData);
      calcularEstatisticas(parcelasData as ParcelaComCliente[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      if (isInitial) {
        hasLoadedOnceRef.current = true;
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const calcularEstatisticas = (parcelasData: ParcelaComCliente[]) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let vencidas = 0;
    let proximos7Dias = 0;
    let proximos30Dias = 0;
    let totalReceber = 0;
    let totalRecebido = 0;

    parcelasData.forEach(parcela => {
      const valor = Number(parcela.valor) || 0;

      if (parcela.status === 'Recebido') {
        totalRecebido += valor;
      } else if (parcela.status !== 'Cancelado') {
        // Extrai a data sem considerar fuso horário
        const [ano, mes, dia] = parcela.data_vencimento.split('T')[0].split('-');
        const dataVencimento = new Date(Number(ano), Number(mes) - 1, Number(dia));
        dataVencimento.setHours(0, 0, 0, 0);
        const diasAteVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if (parcela.status === 'Atrasado' || diasAteVencimento < 0) {
          vencidas += valor;
        } else if (diasAteVencimento <= 7) {
          proximos7Dias += valor;
        } else if (diasAteVencimento <= 30) {
          proximos30Dias += valor;
        }

        totalReceber += valor;
      }
    });

    setEstatisticas({
      vencidas,
      proximos7Dias,
      proximos30Dias,
      totalReceber,
      totalRecebido
    });
  };

  const aplicarFiltros = () => {
    let parcelasFiltradas = [...parcelas];

    if (filtroStatus !== 'todas') {
      if (filtroStatus === 'recebido') {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.status === 'Recebido');
      } else if (filtroStatus === 'pendente') {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.status === 'Pendente');
      } else if (filtroStatus === 'atrasado') {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.status === 'Atrasado');
      }
    }

    if (filtroCliente) {
      parcelasFiltradas = parcelasFiltradas.filter(p =>
        p.cliente?.nome?.toLowerCase().includes(filtroCliente.toLowerCase())
      );
    }

    if (filtroCategoria) {
      parcelasFiltradas = parcelasFiltradas.filter(p =>
        p.categoria?.toLowerCase().includes(filtroCategoria.toLowerCase())
      );
    }

    if (dataInicio) {
      parcelasFiltradas = parcelasFiltradas.filter(p => {
        const [ano, mes, dia] = p.data_vencimento.split('T')[0].split('-');
        const dataVenc = new Date(Number(ano), Number(mes) - 1, Number(dia));
        const [anoIni, mesIni, diaIni] = dataInicio.split('-');
        const dataIni = new Date(Number(anoIni), Number(mesIni) - 1, Number(diaIni));
        return dataVenc >= dataIni;
      });
    }

    if (dataFim) {
      parcelasFiltradas = parcelasFiltradas.filter(p => {
        const [ano, mes, dia] = p.data_vencimento.split('T')[0].split('-');
        const dataVenc = new Date(Number(ano), Number(mes) - 1, Number(dia));
        const [anoFim, mesFim, diaFim] = dataFim.split('-');
        const dataF = new Date(Number(anoFim), Number(mesFim) - 1, Number(diaFim));
        return dataVenc <= dataF;
      });
    }

    return parcelasFiltradas;
  };

  const handleMarcarComoRecebido = async () => {
    if (!parcelaSelecionada || !dataRecebimento || !formaRecebimento) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await marcarParcelaComoRecebida(parcelaSelecionada.id, dataRecebimento, formaRecebimento);
      setModalRecebimentoAberto(false);
      setParcelaSelecionada(null);
      setDataRecebimento('');
      setFormaRecebimento('');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao marcar como recebido:', error);
      alert('Erro ao marcar parcela como recebida');
    }
  };

  const handleCancelar = async (id: number) => {
    if (!confirm('Deseja realmente cancelar esta parcela?')) return;

    try {
      await cancelarParcelaReceber(id);
      await carregarDados();
    } catch (error) {
      console.error('Erro ao cancelar parcela:', error);
      alert('Erro ao cancelar parcela');
    }
  };

  const handleExcluir = async (id: number) => {
    const parcela = parcelas.find(p => p.id === id);

    let mensagemConfirmacao = 'Deseja realmente excluir esta conta a receber?\n\n';

    if (parcela?.status === 'Recebido') {
      mensagemConfirmacao += `⚠️ ATENÇÃO: Esta conta está marcada como RECEBIDA.\n`;
      mensagemConfirmacao += `O valor de ${formatarValor(parcela.valor)} será removido do sistema e do dashboard.\n\n`;
    } else {
      mensagemConfirmacao += `Esta conta ainda não foi recebida, então não afetará os valores do dashboard.\n\n`;
    }

    mensagemConfirmacao += 'Esta ação não pode ser desfeita.';

    if (!confirm(mensagemConfirmacao)) return;

    try {
      await deleteParcelaReceber(id);
      await carregarDados();

      if (parcela?.status === 'Recebido') {
        alert('Conta excluída com sucesso! O dashboard será atualizado automaticamente.');
      }
    } catch (error) {
      console.error('Erro ao excluir parcela:', error);
      alert('Erro ao excluir parcela. Tente novamente.');
    }
  };

  const limparFiltros = () => {
    setFiltroStatus('todas');
    setFiltroCliente('');
    setFiltroCategoria('');
    setDataInicio('');
    setDataFim('');
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (data: string) => {
    // Adiciona o horário para evitar problemas de fuso horário
    const [ano, mes, dia] = data.split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const getDiasParaVencimento = (dataVencimento: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Extrai a data sem considerar fuso horário
    const [ano, mes, dia] = dataVencimento.split('T')[0].split('-');
    const vencimento = new Date(Number(ano), Number(mes) - 1, Number(dia));
    vencimento.setHours(0, 0, 0, 0);

    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string, diasParaVencimento: number) => {
    if (status === 'Recebido') return 'bg-green-100 text-green-800';
    if (status === 'Cancelado') return 'bg-gray-100 text-gray-800';
    if (status === 'Atrasado' || diasParaVencimento < 0) return 'bg-red-100 text-red-800';
    if (diasParaVencimento <= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusIcon = (status: string, diasParaVencimento: number) => {
    if (status === 'Recebido') return <CheckCircle size={16} className="text-green-600" />;
    if (status === 'Cancelado') return <Ban size={16} className="text-gray-600" />;
    if (status === 'Atrasado' || diasParaVencimento < 0) return <AlertCircle size={16} className="text-red-600" />;
    if (diasParaVencimento <= 7) return <Clock size={16} className="text-yellow-600" />;
    return <Calendar size={16} className="text-blue-600" />;
  };

  const getStatusLabel = (status: string, diasParaVencimento: number) => {
    if (status === 'Recebido') return 'Recebido';
    if (status === 'Cancelado') return 'Cancelado';
    if (status === 'Atrasado' || diasParaVencimento < 0) return 'Vencida';
    if (diasParaVencimento <= 7) return 'Vence em breve';
    return 'Pendente';
  };

  const parcelasFiltradas = aplicarFiltros();

  if (loading) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Carregando contas a receber...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-primary" size={28} />
            <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModalClienteAberto(true)}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-gray-900 rounded-md flex items-center gap-2 transition-colors"
            >
              <Users size={18} />
              Novo Cliente
            </button>
            <button
              onClick={() => setModalParcelaAberto(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Novo Lançamento
            </button>
            <button
              onClick={carregarDados}
              disabled={loading || refreshing}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          Controle financeiro de receitas, recebimentos de clientes e investidores
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Vencidas</p>
              <p className="text-xl font-bold text-red-600">
                {formatarValor(estatisticas.vencidas)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Próximos 7 dias</p>
              <p className="text-xl font-bold text-yellow-600">
                {formatarValor(estatisticas.proximos7Dias)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Próximos 30 dias</p>
              <p className="text-xl font-bold text-blue-600">
                {formatarValor(estatisticas.proximos30Dias)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total a receber</p>
              <p className="text-xl font-bold text-orange-600">
                {formatarValor(estatisticas.totalReceber)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total recebido</p>
              <p className="text-xl font-bold text-green-600">
                {formatarValor(estatisticas.totalRecebido)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <h3 className="font-medium text-gray-900">Filtros</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="todas">Todas</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
                <option value="recebido">Recebido</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Cliente</label>
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Categoria</label>
              <input
                type="text"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                placeholder="Buscar categoria..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {(filtroStatus !== 'todas' || filtroCliente || filtroCategoria || dataInicio || dataFim) && (
            <div className="mt-4">
              <button
                onClick={limparFiltros}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md flex items-center gap-2 transition-colors"
              >
                <X size={16} />
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Parcelas */}
      {parcelasFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
          <p className="text-gray-600 mb-4">Não há contas a receber que correspondam aos filtros aplicados.</p>
          <button
            onClick={() => setModalParcelaAberto(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Novo Lançamento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {parcelasFiltradas.map((parcela) => {
            const diasParaVencimento = getDiasParaVencimento(parcela.data_vencimento);

            return (
              <div
                key={parcela.id}
                className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Users className="text-gray-600" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {parcela.cliente?.nome || 'Cliente não encontrado'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {parcela.cliente?.tipo} - {parcela.cliente?.documento}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-gray-500" size={16} />
                        <div>
                          <p className="text-xs text-gray-500">Vencimento</p>
                          <p className="text-sm font-medium">
                            {formatarData(parcela.data_vencimento)}
                          </p>
                          {parcela.status !== 'Recebido' && parcela.status !== 'Cancelado' && (
                            <p className={`text-xs font-medium ${diasParaVencimento < 0
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
                          <p className="text-xs text-gray-500">Valor</p>
                          <p className="text-sm font-medium">{formatarValor(parcela.valor)}</p>
                        </div>
                      </div>

                      {parcela.categoria && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Categoria</p>
                            <p className="text-sm font-medium">{parcela.categoria}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {getStatusIcon(parcela.status, diasParaVencimento)}
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(parcela.status, diasParaVencimento)}`}>
                            {getStatusLabel(parcela.status, diasParaVencimento)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Descrição</p>
                      <p className="text-sm text-gray-700">{parcela.descricao}</p>
                    </div>

                    {parcela.observacoes && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Observações</p>
                        <p className="text-sm text-gray-700">{parcela.observacoes}</p>
                      </div>
                    )}

                    {parcela.status === 'Recebido' && parcela.data_recebimento && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={16} className="text-green-600" />
                          <p className="text-sm font-medium text-green-900">Recebido</p>
                        </div>
                        <p className="text-xs text-green-700">
                          Data: {formatarData(parcela.data_recebimento)}
                          {parcela.forma_recebimento && ` • Forma: ${parcela.forma_recebimento}`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                      onClick={() => {
                        setParcelaParaEditar(parcela);
                        setModalEditarParcelaAberto(true);
                      }}
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                    {parcela.status === 'Recebido' ? (
                      <>
                        <span className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-md font-medium">
                          ✓ Recebido
                        </span>
                        <button
                          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-2"
                          onClick={() => handleExcluir(parcela.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                          </svg>
                          Excluir
                        </button>
                      </>
                    ) : parcela.status === 'Cancelado' ? (
                      <>
                        <span className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-md font-medium">
                          Cancelado
                        </span>
                        <button
                          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-2"
                          onClick={() => handleExcluir(parcela.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                          </svg>
                          Excluir
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                          onClick={() => {
                            setParcelaSelecionada(parcela);
                            setDataRecebimento(new Date().toISOString().split('T')[0]);
                            setModalRecebimentoAberto(true);
                          }}
                        >
                          Marcar como Recebido
                        </button>
                        <button
                          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                          onClick={() => handleCancelar(parcela.id)}
                        >
                          Cancelar
                        </button>
                        <button
                          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-2"
                          onClick={() => handleExcluir(parcela.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                          </svg>
                          Excluir
                        </button>
                      </>
                    )}

                    {parcela.numero_documento && (
                      <p className="text-xs text-gray-500 text-right">
                        Doc: {parcela.numero_documento}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {parcelasFiltradas.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total de {parcelasFiltradas.length} conta(s) exibida(s):
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatarValor(
                parcelasFiltradas.reduce((total, parcela) => {
                  if (parcela.status !== 'Cancelado') {
                    return total + parcela.valor;
                  }
                  return total;
                }, 0)
              )}
            </span>
          </div>
        </div>
      )}

      {/* Modais */}
      {modalClienteAberto && (
        <ModalNovoCliente
          onClose={() => setModalClienteAberto(false)}
          onSuccess={() => carregarDados()}
        />
      )}

      {modalParcelaAberto && (
        <ModalNovaParcelaReceber
          clientes={clientes}
          obraId={obraSelecionada?.id ?? null}
          onClose={() => setModalParcelaAberto(false)}
          onSuccess={carregarDados}
        />
      )}

      {modalEditarParcelaAberto && parcelaParaEditar && (
        <ModalEditarParcelaReceber
          parcela={parcelaParaEditar}
          clientes={clientes}
          onClose={() => {
            setModalEditarParcelaAberto(false);
            setParcelaParaEditar(null);
          }}
          onSuccess={() => {
            carregarDados();
            setModalEditarParcelaAberto(false);
            setParcelaParaEditar(null);
          }}
        />
      )}

      {/* Modal de Recebimento */}
      {modalRecebimentoAberto && parcelaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Confirmar Recebimento</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Cliente</p>
                <p className="font-medium">{parcelaSelecionada.cliente?.nome}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Valor</p>
                <p className="font-medium text-lg text-green-600">{formatarValor(parcelaSelecionada.valor)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Data de Recebimento *
                </label>
                <input
                  type="date"
                  value={dataRecebimento}
                  onChange={(e) => setDataRecebimento(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Forma de Recebimento *
                </label>
                <select
                  value={formaRecebimento}
                  onChange={(e) => setFormaRecebimento(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => {
                  setModalRecebimentoAberto(false);
                  setParcelaSelecionada(null);
                  setDataRecebimento('');
                  setFormaRecebimento('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarcarComoRecebido}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
