"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, FileText, Trash2, Edit, Search, X } from 'lucide-react';
import { fetchPedidosCompra, deletePedidoCompra, fetchItensPedidoCompra, PedidoCompra, fetchFornecedores, fetchParcelasPedidoCompraByPedido, fetchObras, ItemPedidoCompra, ParcelaPedidoCompra } from '@/lib/supabase';
import { useObra } from '@/contexts/ObraContext';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import PDFModal from '@/components/ui/PDFModal';
import PDFCompra from '@/components/compras/PDFCompra';
import { useNotification } from '@/components/ui/notification';

export default function ComprasPage() {
  const { obraSelecionada } = useObra();
  const { showNotification } = useNotification();
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState<PedidoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoCompra | null>(null);
  
  // Estados para PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [modalPDFAberto, setModalPDFAberto] = useState(false);
  const [urlPDF, setUrlPDF] = useState<string>('');
  const [itensPDF, setItensPDF] = useState<ItemPedidoCompra[]>([]);
  const [parcelasPDF, setParcelasPDF] = useState<ParcelaPedidoCompra[]>([]);
  const [obraInfo, setObraInfo] = useState<{nome: string, endereco: string, responsavel_tecnico: string} | null>(null);

  
  // Estados para os filtros
  const [numeroOrdemFiltro, setNumeroOrdemFiltro] = useState("");
  const [fornecedorFiltro, setFornecedorFiltro] = useState("");
  const [dataCompraInicioFiltro, setDataCompraInicioFiltro] = useState("");
  const [dataCompraFimFiltro, setDataCompraFimFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      const data = await fetchPedidosCompra(obraSelecionada?.id);
      setPedidos(data);
      setPedidosFiltrados(data);
    } catch (error) {
      console.error('Erro ao carregar pedidos de compra:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const carregarFornecedores = async () => {
    try {
      const data = await fetchFornecedores(obraSelecionada?.id);
      setFornecedores(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  useEffect(() => {
    carregarPedidos();
    carregarFornecedores();
    carregarObraInfo();
  }, [obraSelecionada]);
  
  const carregarObraInfo = async () => {
    if (!obraSelecionada) {
      setObraInfo(null);
      return;
    }
    setObraInfo({
      nome: obraSelecionada.nome,
      endereco: obraSelecionada.endereco || '',
      responsavel_tecnico: obraSelecionada.responsavel_tecnico || ''
    });
  };
  
  useEffect(() => {
    aplicarFiltros();
  }, [numeroOrdemFiltro, fornecedorFiltro, dataCompraInicioFiltro, dataCompraFimFiltro, statusFiltro, pedidos]);
  
  const aplicarFiltros = () => {
    let resultados = [...pedidos];
    
    if (numeroOrdemFiltro) {
      resultados = resultados.filter(p => 
        p.numero_ordem?.toString().includes(numeroOrdemFiltro)
      );
    }
    
    if (fornecedorFiltro) {
      resultados = resultados.filter(p => 
        p.fornecedor?.nome?.toLowerCase().includes(fornecedorFiltro.toLowerCase()) ||
        p.fornecedor_id.toString() === fornecedorFiltro
      );
    }
    
    if (statusFiltro) {
      resultados = resultados.filter(p => 
        p.status === statusFiltro
      );
    }
    
    if (dataCompraInicioFiltro) {
      resultados = resultados.filter(p => {
        if (!p.data_compra) return false;
        return new Date(p.data_compra) >= new Date(dataCompraInicioFiltro);
      });
    }
    
    if (dataCompraFimFiltro) {
      resultados = resultados.filter(p => {
        if (!p.data_compra) return false;
        return new Date(p.data_compra) <= new Date(dataCompraFimFiltro);
      });
    }
    
    setPedidosFiltrados(resultados);
  };
  
  const limparFiltros = () => {
    setNumeroOrdemFiltro("");
    setFornecedorFiltro("");
    setDataCompraInicioFiltro("");
    setDataCompraFimFiltro("");
    setStatusFiltro("");
  };

  const abrirModalExcluir = (pedido: PedidoCompra) => {
    setPedidoSelecionado(pedido);
    setModalExcluirAberto(true);
  };

  const handleDelete = async () => {
    if (!pedidoSelecionado) return;
    
    // Otimização UX: Remover da lista imediatamente
    const pedidosBackup = [...pedidos];
    const pedidosAtualizados = pedidos.filter(p => p.id !== pedidoSelecionado.id);
    setPedidos(pedidosAtualizados);
    setModalExcluirAberto(false);
    
    try {
      console.log('🗑️ Iniciando exclusão do pedido...');
      await deletePedidoCompra(pedidoSelecionado.id);
      
      showNotification({
        title: "Pedido excluído com sucesso!",
        message: `O pedido #${pedidoSelecionado.numero_ordem} foi removido do sistema.`,
        type: "success",
        duration: 3000
      });
      
      console.log('✅ Exclusão concluída com sucesso!');
    } catch (error) {
      console.error('💥 Erro ao excluir pedido de compra:', error);
      
      // Reverter mudança local em caso de erro
      setPedidos(pedidosBackup);
      
      showNotification({
        title: "Erro ao excluir pedido",
        message: "Ocorreu um erro ao excluir o pedido. Tente novamente.",
        type: "error",
        duration: 5000
      });
    }
  };

  const handlePDFReady = (url: string) => {
    console.log('PDF pronto, URL:', url);
    setUrlPDF(url);
    setModalPDFAberto(true);
    setGerandoPDF(false);
  };

  const fecharModalPDF = () => {
    setModalPDFAberto(false);
    setUrlPDF('');
    setPedidoSelecionado(null);
    setItensPDF([]);
    setParcelasPDF([]);
  };

  const handleGerarPDF = async (pedido: PedidoCompra) => {
    try {
      console.log('Iniciando geração de PDF para pedido:', pedido.id);
      
      // Carregar itens do pedido
      const itens = await fetchItensPedidoCompra(pedido.id);
      console.log('Itens carregados:', itens.length);
      
      // Carregar parcelas (previsão de desembolso)
      const parcelas = await fetchParcelasPedidoCompraByPedido(pedido.id);
      console.log('Parcelas carregadas:', parcelas.length);
      
      // Definir os dados primeiro
      setItensPDF(itens);
      setParcelasPDF(parcelas);
      setPedidoSelecionado(pedido);
      
      // Aguardar um pouco para garantir que o estado foi atualizado
      setTimeout(() => {
        setGerandoPDF(true);
      }, 100);
      
    } catch (error) {
      console.error('Erro ao carregar dados para PDF:', error);
      setGerandoPDF(false);
      alert('Erro ao carregar dados para geração do PDF.');
    }
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (data: string | null) => {
    if (!data) return '-';
    
    // Se a string está no formato YYYY-MM-DD (apenas data), cria a data corretamente para evitar problemas de timezone
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [ano, mes, dia] = data.split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, dia);
      return dataObj.toLocaleDateString('pt-BR');
    }
    
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Função para calcular o total das compras aprovadas (CORRIGIDA - aplica todos os filtros)
  const calcularTotalComprasAprovadas = () => {
    // Aplicar TODOS os filtros manualmente aos dados completos
    let pedidosParaCalcular = [...pedidos];
    
    // Filtro por número de ordem
    if (numeroOrdemFiltro) {
      pedidosParaCalcular = pedidosParaCalcular.filter(p => 
        p.numero_ordem?.toString().includes(numeroOrdemFiltro)
      );
    }
    
    // Filtro por fornecedor
    if (fornecedorFiltro) {
      pedidosParaCalcular = pedidosParaCalcular.filter(p => 
        p.fornecedor?.nome?.toLowerCase().includes(fornecedorFiltro.toLowerCase()) ||
        p.fornecedor_id.toString() === fornecedorFiltro
      );
    }
    
    // Filtro por status
    if (statusFiltro) {
      pedidosParaCalcular = pedidosParaCalcular.filter(p => p.status === statusFiltro);
    } else {
      // Se não há filtro de status, considerar apenas aprovadas
      pedidosParaCalcular = pedidosParaCalcular.filter(p => p.status === 'Aprovado');
    }
    
    // Filtro por data de início
    if (dataCompraInicioFiltro) {
      pedidosParaCalcular = pedidosParaCalcular.filter(p => {
        if (!p.data_compra) return false;
        return new Date(p.data_compra) >= new Date(dataCompraInicioFiltro);
      });
    }
    
    // Filtro por data de fim
    if (dataCompraFimFiltro) {
      pedidosParaCalcular = pedidosParaCalcular.filter(p => {
        if (!p.data_compra) return false;
        return new Date(p.data_compra) <= new Date(dataCompraFimFiltro);
      });
    }
    
    const total = pedidosParaCalcular.reduce((total, pedido) => total + pedido.valor_total, 0);
    
    return total;
  };

  const renderStatusBadge = (status: string) => {
    const bgColor = status === 'Aprovado' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${bgColor} font-medium`}>
        {status}
      </span>
    );
  };

  const getMensagemExclusao = () => {
    if (!pedidoSelecionado) return '';
    
    return pedidoSelecionado.status === 'Aprovado'
      ? `Tem certeza que deseja excluir este pedido de compra?\n\nValor: ${formatarValor(pedidoSelecionado.valor_total)}\nFornecedor: ${pedidoSelecionado.fornecedor?.nome}\nData: ${formatarData(pedidoSelecionado.data_compra)}\n\nEsta ação irá estornar os valores consumidos dos itens de custo.`
      : `Tem certeza que deseja excluir este pedido de compra?\n\nValor: ${formatarValor(pedidoSelecionado.valor_total)}\nFornecedor: ${pedidoSelecionado.fornecedor?.nome}\nData: ${formatarData(pedidoSelecionado.data_compra)}`;
  };

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex justify-between items-center mb-6">
        {/* Painel "Total em compras" no lugar do título */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-blue-800">Total em compras aprovadas:</h2>
            <span className="text-xl font-bold text-blue-900">
              {formatarValor(calcularTotalComprasAprovadas())}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Search size={18} />
            <span>Filtros</span>
          </button>
          <Link 
            href="/compras/novo" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>NOVO PEDIDO</span>
          </Link>
        </div>
      </div>
      
      {mostrarFiltros && (
        <div className="bg-white shadow-sm rounded-lg mb-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Filtros</h2>
            <button
              onClick={limparFiltros}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
            >
              <X size={16} />
              Limpar filtros
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº Ordem</label>
              <input
                type="text"
                value={numeroOrdemFiltro}
                onChange={(e) => setNumeroOrdemFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por número de ordem"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <select
                value={fornecedorFiltro}
                onChange={(e) => setFornecedorFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos os fornecedores</option>
                {fornecedores.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos os status</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da compra (início)</label>
              <input
                type="date"
                value={dataCompraInicioFiltro}
                onChange={(e) => setDataCompraInicioFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da compra (fim)</label>
              <input
                type="date"
                value={dataCompraFimFiltro}
                onChange={(e) => setDataCompraFimFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nº ORDEM</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">FORNECEDOR</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">DATA DA COMPRA</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Carregando pedidos de compra...</td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Nenhum pedido de compra encontrado</td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{pedido.numero_ordem}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pedido.fornecedor?.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatarData(pedido.data_compra)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatarValor(pedido.valor_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(pedido.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/compras/visualizar/${pedido.id}`}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        title="Visualizar"
                      >
                        <Eye size={18} />
                      </Link>
                      <Link
                        href={`/compras/editar/${pedido.id}`}
                        className="text-yellow-600 hover:text-yellow-900 inline-flex items-center"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleGerarPDF(pedido)}
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                        title="Gerar PDF"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => abrirModalExcluir(pedido)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de visualização do PDF */}
      <PDFModal
        isOpen={modalPDFAberto}
        onClose={fecharModalPDF}
        pdfUrl={urlPDF}
        fileName={`pedido_compra_${pedidoSelecionado?.numero_ordem || 'N/A'}.pdf`}
      />

      {/* Componente de PDF oculto - só renderiza quando solicitado */}
      {gerandoPDF && pedidoSelecionado && (
        <div style={{ display: 'none' }}>
          <PDFCompra 
            pedido={pedidoSelecionado} 
            itens={itensPDF}
            parcelas={parcelasPDF}
            obraInfo={obraInfo}
            onPDFReady={handlePDFReady}
          >
            <span>Download PDF</span>
          </PDFCompra>
        </div>
      )}

      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleDelete}
        titulo="Excluir Pedido de Compra"
        mensagem={getMensagemExclusao()}
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />

    </main>
  );
} 