"use client";
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import { 
  fetchPedidoCompraById, 
  fetchItensPedidoCompra, 
  PedidoCompra, 
  ItemPedidoCompra,
  aprovarPedidoCompra,
  fetchObras,
  fetchParcelasPedidoCompraByPedido,
  ParcelaPedidoCompra
} from '@/lib/supabase';


import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import { useNotification } from '@/components/ui/notification';
import PDFModal from '@/components/ui/PDFModal';
import PDFCompra from '@/components/compras/PDFCompra';

// Definindo a interface para os parâmetros da rota
interface PageParams {
  id: string;
}

export default function VisualizarPedidoCompraPage({ params }: any) {
  // Usando React.use() para acessar os parâmetros, conforme exigido pelo Next.js 15
  const resolvedParams = React.use(params) as PageParams;
  const id = parseInt(resolvedParams.id);
  
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const [pedido, setPedido] = useState<PedidoCompra | null>(null);
  const [itens, setItens] = useState<ItemPedidoCompra[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaPedidoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(false);

  const [modalConfirmacaoAprovacao, setModalConfirmacaoAprovacao] = useState(false);
  const [obraInfo, setObraInfo] = useState<{nome: string, endereco: string, responsavel_tecnico: string} | null>(null);
  
  // Estados para PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [modalPDFAberto, setModalPDFAberto] = useState(false);
  const [urlPDF, setUrlPDF] = useState<string>('');

  useEffect(() => {
    const carregarPedido = async () => {
      setLoading(true);
      try {
        const pedidoData = await fetchPedidoCompraById(id);
        setPedido(pedidoData);
        
        const itensData = await fetchItensPedidoCompra(id);
        setItens(itensData);
        
        // Carregar parcelas de previsão de desembolso
        const parcelasData = await fetchParcelasPedidoCompraByPedido(id);
        setParcelas(parcelasData);
        
        // Carregar informações da obra cadastrada (primeira obra encontrada)
        const obras = await fetchObras();
        if (obras && obras.length > 0) {
          const obra = obras[0];
          setObraInfo({
            nome: obra.nome,
            endereco: obra.endereco || '',
            responsavel_tecnico: obra.responsavel_tecnico || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar pedido de compra:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      carregarPedido();
    }
  }, [id]);

  const handleAprovar = async () => {
    if (!pedido) return;
    
    if (pedido.status === 'Aprovado') {
      showNotification({
        title: "Aviso",
        message: "Este pedido já está aprovado.",
        type: "warning"
      });
      return;
    }
    
    setModalConfirmacaoAprovacao(true);
  };
  
  const confirmarAprovacao = async () => {
    if (!pedido) return;
    
    setAprovando(true);
    setModalConfirmacaoAprovacao(false);
    
    // Otimização UX: Atualizar status local imediatamente
    const pedidoAnterior = { ...pedido };
    setPedido({ ...pedido, status: 'Aprovado' });
    
    try {
      console.log('🚀 Iniciando aprovação do pedido...');
      await aprovarPedidoCompra(id);
      
      // Recarregar apenas se necessário (verificação de consistência)
      const pedidoAtualizado = await fetchPedidoCompraById(id);
      setPedido(pedidoAtualizado);
      
      showNotification({
        title: "Pedido aprovado com sucesso!",
        message: "O pedido foi aprovado e os valores foram consumidos dos itens de custo associados.",
        type: "success",
        duration: 3000
      });
      
      console.log('✅ Aprovação concluída com sucesso!');
    } catch (error) {
      console.error('💥 Erro ao aprovar pedido:', error);
      
      // Reverter mudança local em caso de erro
      setPedido(pedidoAnterior);
      
      showNotification({
        title: "Erro ao aprovar pedido",
        message: "Ocorreu um erro ao aprovar o pedido. Tente novamente.",
        type: "error",
        duration: 5000
      });
    } finally {
      setAprovando(false);
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
  };

  const handleGerarPDF = async () => {
    if (!pedido) return;

    console.log('Iniciando geração de PDF...');
    setGerandoPDF(true);
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

  if (loading) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center mb-6">
          <Link 
            href="/compras" 
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">CARREGANDO PEDIDO...</h1>
        </div>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center mb-6">
          <Link 
            href="/compras" 
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
        </div>
        <p>Não foi possível encontrar o pedido solicitado.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link 
            href="/compras" 
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">PEDIDO DE COMPRA #{pedido.id}</h1>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleAprovar}
            disabled={pedido.status === 'Aprovado' || aprovando}
          >
            <CheckCircle size={18} />
            <span>{aprovando ? 'APROVANDO...' : 'APROVAR'}</span>
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            onClick={handleGerarPDF}
          >
            <FileText size={18} />
            <span>GERAR PDF</span>
          </button>
        </div>
      </div>

      <div id="conteudo-pedido">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 p-6">
          <h2 className="text-lg font-medium mb-4">Informações do Pedido</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Fornecedor</p>
              <p className="font-medium">{pedido.fornecedor?.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Data da Compra</p>
              <p className="font-medium">{formatarData(pedido.data_compra)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Valor Total</p>
              <p className="font-medium">{formatarValor(pedido.valor_total)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <p className="font-medium">{renderStatusBadge(pedido.status)}</p>
            </div>
            {pedido.observacoes && (
              <div className="col-span-1 md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Observações</p>
                <p className="font-medium whitespace-pre-line">{pedido.observacoes}</p>
              </div>
            )}
          </div>
        </div>

        {obraInfo && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 p-6">
            <h2 className="text-lg font-medium mb-4">Informações da Obra</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Nome da Obra</p>
                <p className="font-medium">{obraInfo.nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Responsável Técnico</p>
                <p className="font-medium">{obraInfo.responsavel_tecnico || 'Não informado'}</p>
              </div>
              <div className="col-span-1 md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Endereço</p>
                <p className="font-medium">{obraInfo.endereco || 'Não informado'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
          <h2 className="text-lg font-medium p-6 pb-2">Itens do Pedido</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Unitário</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      Nenhum item encontrado para este pedido
                    </td>
                  </tr>
                ) : (
                  <>
                    {itens.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{item.item_custo?.codigo || '-'}</td>
                        <td className="px-6 py-4">{item.descricao}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.unidade}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.quantidade}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatarValor(item.valor_unitario)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatarValor(item.valor_total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-bold text-lg border-t-2 border-blue-200">
                      <td colSpan={5} className="px-6 py-4 text-right text-blue-900">
                        Total do Pedido:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-blue-900 text-lg font-bold">
                        {formatarValor(pedido.valor_total)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção de Previsão de Desembolso */}
        {parcelas.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
            <h2 className="text-lg font-medium p-6 pb-2">Previsão de Desembolso</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Data Prevista</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parcelas.map((parcela) => (
                    <tr key={parcela.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{formatarData(parcela.data_prevista)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatarValor(parcela.valor)}</td>
                      <td className="px-6 py-4">{parcela.descricao || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          parcela.status === 'Pago' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {parcela.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 text-right font-bold">
                      Total Previsto:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">
                      {formatarValor(parcelas.reduce((total, parcela) => total + parcela.valor, 0))}
                    </td>
                    <td colSpan={2} className="px-6 py-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de visualização do PDF */}
      <PDFModal
        isOpen={modalPDFAberto}
        onClose={fecharModalPDF}
        pdfUrl={urlPDF}
        fileName={`pedido_compra_${pedido?.numero_ordem || 'N/A'}.pdf`}
      />

      {/* Componente de PDF oculto - só renderiza quando solicitado */}
      {gerandoPDF && pedido && itens.length >= 0 && (
        <div style={{ display: 'none' }}>
          <PDFCompra 
            pedido={pedido} 
            itens={itens}
            parcelas={parcelas}
            obraInfo={obraInfo}
            onPDFReady={handlePDFReady}
          >
            <span>Download PDF</span>
          </PDFCompra>
        </div>
      )}

      {/* Modal de confirmação para aprovação de pedido */}
      <ConfirmacaoModal
        isOpen={modalConfirmacaoAprovacao}
        onClose={() => setModalConfirmacaoAprovacao(false)}
        onConfirm={confirmarAprovacao}
        titulo="Aprovar Pedido de Compra"
        mensagem="Tem certeza que deseja aprovar este pedido de compra? Esta ação irá consumir os valores dos itens de custo associados."
        confirmButtonText="Aprovar"
        cancelButtonText="Cancelar"
      />

      {/* Indicador de aprovação em andamento - otimizado */}
      {aprovando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center max-w-sm mx-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 border-3 border-green-500 border-t-transparent rounded-full animate-spin mr-3"></div>
              <p className="text-center font-medium text-gray-800">Processando aprovação...</p>
            </div>
            <p className="text-sm text-gray-600 text-center">
              O status foi atualizado e os cálculos estão sendo finalizados em segundo plano.
            </p>
          </div>
        </div>
      )}
    </main>
  );
} 