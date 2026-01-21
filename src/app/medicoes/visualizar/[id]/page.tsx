"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Check, Trash2 } from 'lucide-react';
import { 
  fetchMedicaoById, 
  fetchItensMedicao,
  updateMedicao,
  deleteMedicao,
  atualizarRealizadoItemCusto,
  atualizarTodosTotais,
  fetchParcelasMedicaoByMedicao,
  Medicao, 
  ItemMedicao,
  ParcelaMedicao
} from '@/lib/supabase';

import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import { useNotification } from '@/components/ui/notification';
import PDFMedicao from '@/components/medicoes/PDFMedicao';
import PDFModal from '@/components/ui/PDFModal';

// Definindo a interface para os parâmetros da rota
interface PageParams {
  id: string;
}

export default function VisualizarMedicaoPage({ params }: any) {
  const router = useRouter();
  const resolvedParams = React.use(params) as PageParams;
  const id = Number(resolvedParams.id);
  const { showNotification } = useNotification();
  
  const [medicao, setMedicao] = useState<Medicao | null>(null);
  const [itens, setItens] = useState<ItemMedicao[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaMedicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [alterandoStatus, setAlterandoStatus] = useState(false);

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [modalAprovarAberto, setModalAprovarAberto] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [modalPDFAberto, setModalPDFAberto] = useState(false);
  const [urlPDF, setUrlPDF] = useState<string>('');
  
  const carregarDados = async () => {
    setLoading(true);
    try {
      const dadosMedicao = await fetchMedicaoById(id);
      setMedicao(dadosMedicao);
      
      const itensMedicao = await fetchItensMedicao(id);
      setItens(itensMedicao);
      
      // Carregar parcelas de previsão de desembolso
      const parcelasData = await fetchParcelasMedicaoByMedicao(id);
      setParcelas(parcelasData);
    } catch (error) {
      console.error('Erro ao carregar dados da medição:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);
  
  const formatarValor = (valor: number | null | undefined) => {
    if (valor === null || valor === undefined) return 'R$ 0,00';
    if (typeof valor !== 'number' || isNaN(valor)) return 'R$ 0,00';
    
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  
  const formatarData = (data: string | null) => {
    if (!data) return '-';
    
    // Se a string está no formato YYYY-MM-DD (apenas data), converte diretamente sem problemas de timezone
    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    // Para outros formatos, tenta usar Date (pode ter problemas de timezone, mas é melhor que nada)
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
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
  
  const aprovarMedicao = async () => {
    if (!medicao) return;
    
    setAlterandoStatus(true);
    setModalAprovarAberto(false);
    
    // Otimização UX: Atualizar status local imediatamente
    const medicaoAnterior = { ...medicao };
    setMedicao({ ...medicao, status: 'Aprovado' });
    
    try {
      console.log('🚀 Iniciando aprovação da medição...');
      
      // Ao aprovar a medição, a função updateMedicao já processa tudo em background
      await updateMedicao(id, medicao.data_inicio, medicao.data_fim, 'Aprovado');
      
      // Recarregar apenas se necessário (verificação de consistência)
      const medicaoAtualizada = await fetchMedicaoById(id);
      setMedicao(medicaoAtualizada);
      
      // Exibir mensagem de sucesso
      showNotification({
        title: 'Medição aprovada com sucesso!',
        message: 'Os valores estão sendo atualizados nos itens de custo em segundo plano.',
        type: 'success',
        duration: 3000
      });
      
      console.log('✅ Aprovação da medição concluída!');
    } catch (error) {
      console.error('💥 Erro ao aprovar medição:', error);
      
      // Reverter mudança local em caso de erro
      setMedicao(medicaoAnterior);
      
      showNotification({
        title: 'Erro ao aprovar medição',
        message: 'Ocorreu um erro ao aprovar a medição. Tente novamente.',
        type: 'error',
        duration: 5000
      });
    } finally {
      setAlterandoStatus(false);
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
    if (!medicao) return;

    console.log('Iniciando geração de PDF...');
    setGerandoPDF(true);
  };
  
  const handleDelete = async () => {
    setModalExcluirAberto(false);
    
    try {
      console.log('🗑️ Iniciando exclusão da medição...');
      
      // Mostrar feedback imediato
      showNotification({
        title: 'Excluindo medição...',
        message: 'A medição está sendo removida do sistema.',
        type: 'info',
        duration: 2000
      });
      
      await deleteMedicao(id);
      
      showNotification({
        title: 'Medição excluída com sucesso!',
        message: 'A medição foi removida e os valores estão sendo recalculados em segundo plano.',
        type: 'success',
        duration: 3000
      });
      
      console.log('✅ Exclusão da medição concluída!');
      router.push('/medicoes');
    } catch (error) {
      console.error('💥 Erro ao excluir medição:', error);
      showNotification({
        title: 'Erro ao excluir medição',
        message: 'Ocorreu um erro ao excluir a medição. Tente novamente.',
        type: 'error',
        duration: 5000
      });
    }
  };
  
  if (loading) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-center items-center h-full">
          <p>Carregando dados da medição...</p>
        </div>
      </main>
    );
  }
  
  if (!medicao) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-center items-center h-full">
          <p>Medição não encontrada.</p>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link 
            href="/medicoes" 
            className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">DETALHES DA MEDIÇÃO</h1>
        </div>
        <div className="flex gap-2">
          {medicao?.status !== 'Aprovado' && (
            <button
              onClick={() => setModalAprovarAberto(true)}
              disabled={alterandoStatus}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Check size={18} />
              <span>{alterandoStatus ? 'Aprovando...' : 'Aprovar'}</span>
            </button>
          )}
          <button
            onClick={handleGerarPDF}
            disabled={gerandoPDF}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <FileText size={18} />
            <span>{gerandoPDF ? 'Gerando PDF...' : 'Gerar PDF'}</span>
          </button>
          {medicao?.status !== 'Aprovado' && (
            <button
              onClick={() => setModalExcluirAberto(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Trash2 size={18} />
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>
      
      <div id="conteudo-medicao">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium mb-4">Informações Gerais</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Observação</p>
                  <p className="font-medium">{medicao.observacao || 'Nenhuma observação informada'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{renderStatusBadge(medicao.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Período</p>
                  <p className="font-medium">
                    {formatarData(medicao.data_inicio)} a {formatarData(medicao.data_fim)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-medium text-lg text-green-700">
                    {formatarValor(medicao.valor_total)}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-medium mb-4">Informações do Contrato</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Número do Contrato</p>
                  <p className="font-medium">{medicao.negociacao?.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{medicao.negociacao?.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fornecedor</p>
                  <p className="font-medium">{medicao.negociacao?.fornecedor?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Descrição</p>
                  <p className="font-medium">{medicao.negociacao?.descricao}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6">
          <h2 className="text-lg font-medium mb-4">Itens da Medição</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">DESCRIÇÃO</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">UNID.</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">QUANTIDADE TOTAL</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">QUANTIDADE MEDIDA</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">% EXECUTADO</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR UNIT.</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itens.length > 0 ? (
                  itens.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{item.descricao}</td>
                      <td className="px-6 py-4">{item.unidade}</td>
                      <td className="px-6 py-4">{item.quantidade_total || 0}</td>
                      <td className="px-6 py-4">{item.quantidade_medida || 0}</td>
                      <td className="px-6 py-4">{(item.percentual_executado || 0).toFixed(2)}%</td>
                      <td className="px-6 py-4">{formatarValor(item.valor_unitario)}</td>
                      <td className="px-6 py-4">{formatarValor(item.valor_total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Nenhum item encontrado para esta medição
                    </td>
                  </tr>
                )}
              </tbody>
              {medicao && typeof medicao.valor_total === 'number' && !isNaN(medicao.valor_total) && medicao.valor_total >= 0 ? (
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={6} className="px-6 py-3 text-right">
                      Total da Medição:
                    </td>
                    <td className="px-6 py-3">
                      {formatarValor(medicao.valor_total)}
                    </td>
                  </tr>
                  {medicao.desconto && medicao.desconto > 0 ? (
                    <>
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={6} className="px-6 py-3 text-right text-red-600">
                          Desconto:
                        </td>
                        <td className="px-6 py-3 text-red-600">
                          -{formatarValor(medicao.desconto)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={6} className="px-6 py-3 text-right">
                          Total com Desconto:
                        </td>
                        <td className="px-6 py-3">
                          {formatarValor(medicao.valor_total - (medicao.desconto || 0))}
                        </td>
                      </tr>
                    </>
                  ) : null}
                </tfoot>
              ) : null}
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
      
      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleDelete}
        titulo="Excluir Medição"
        mensagem={medicao ? `Tem certeza que deseja excluir esta medição?\n\nNº: ${medicao.numero_ordem}\nValor: ${formatarValor(medicao.valor_total)}\nPeríodo: ${formatarData(medicao.data_inicio)} a ${formatarData(medicao.data_fim)}` : ''}
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />
      
      {/* Modal de confirmação para aprovar */}
      <ConfirmacaoModal
        isOpen={modalAprovarAberto}
        onClose={() => setModalAprovarAberto(false)}
        onConfirm={aprovarMedicao}
        titulo="Aprovar Medição"
        mensagem="Tem certeza que deseja aprovar esta medição? Isso irá atualizar os valores realizados nos itens de custo."
        confirmButtonText="Aprovar"
        cancelButtonText="Cancelar"
      />

      {/* Modal de visualização do PDF */}
      <PDFModal
        isOpen={modalPDFAberto}
        onClose={fecharModalPDF}
        pdfUrl={urlPDF}
        fileName={`medicao_${medicao?.negociacao?.numero || 'N/A'}_${medicao?.numero_ordem || 1}.pdf`}
      />

      {/* Componente de PDF oculto - só renderiza quando solicitado */}
      {gerandoPDF && medicao && itens.length > 0 && (
        <div style={{ display: 'none' }}>
          <PDFMedicao 
            medicao={medicao} 
            itens={itens}
            onPDFReady={handlePDFReady}
          >
            <span>Download PDF</span>
          </PDFMedicao>
        </div>
      )}

    </main>
  );
} 