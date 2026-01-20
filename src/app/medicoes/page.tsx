"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, FileText, Trash2, Edit, Search, X } from 'lucide-react';
import { fetchMedicoes, deleteMedicao, fetchItensMedicao, Medicao, fetchNegociacoes, fetchFornecedores } from '@/lib/supabase';
import { useObra } from '@/contexts/ObraContext';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import PDFMedicao from '@/components/medicoes/PDFMedicao';


import PDFDebug from '@/components/medicoes/PDFDebug';
import PDFModal from '@/components/ui/PDFModal';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';
import { useNotification } from '@/components/ui/notification';

export default function MedicoesPage() {
  const { obraSelecionada } = useObra();
  const { showNotification } = useNotification();
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [medicoesFiltradas, setMedicoesFiltradas] = useState<Medicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [medicaoSelecionada, setMedicaoSelecionada] = useState<Medicao | null>(null);
  const [medicaoParaPDF, setMedicaoParaPDF] = useState<{ medicao: Medicao; itens: any[] } | null>(null);

  
  // Estados para os filtros
  const [numeroOrdemFiltro, setNumeroOrdemFiltro] = useState("");
  const [contratoFiltro, setContratoFiltro] = useState("");
  const [fornecedorFiltro, setFornecedorFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataInicioFiltro, setDataInicioFiltro] = useState("");
  const [dataFimFiltro, setDataFimFiltro] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [contratos, setContratos] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  // Estados para o modal PDF
  const [modalPDF, setModalPDF] = useState<{
    isOpen: boolean;
    url: string;
    fileName: string;
  }>({
    isOpen: false,
    url: '',
    fileName: ''
  });

  const { isGenerating: gerandoPDF, error: erroPDF, generatePDF, reset: resetPDF } = usePDFGeneration();

  const carregarMedicoes = async () => {
    setLoading(true);
    try {
      const data = await fetchMedicoes(obraSelecionada?.id);
      setMedicoes(data);
      setMedicoesFiltradas(data);
    } catch (error) {
      console.error('Erro ao carregar medições:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const carregarContratos = async () => {
    try {
      const data = await fetchNegociacoes(obraSelecionada?.id);
      setContratos(data);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
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
    carregarMedicoes();
    carregarContratos();
    carregarFornecedores();
  }, [obraSelecionada]);
  
  useEffect(() => {
    aplicarFiltros();
  }, [numeroOrdemFiltro, contratoFiltro, fornecedorFiltro, statusFiltro, dataInicioFiltro, dataFimFiltro, medicoes]);

  const aplicarFiltros = () => {
    let resultados = [...medicoes];
    
    if (numeroOrdemFiltro) {
      resultados = resultados.filter(m => 
        m.numero_ordem?.toString().includes(numeroOrdemFiltro)
      );
    }
    
    if (contratoFiltro) {
      resultados = resultados.filter(m => 
        m.negociacao_id.toString() === contratoFiltro
      );
    }
    
    if (fornecedorFiltro) {
      resultados = resultados.filter(m => 
        m.negociacao?.fornecedor?.nome?.toLowerCase().includes(fornecedorFiltro.toLowerCase()) ||
        m.negociacao?.fornecedor_id.toString() === fornecedorFiltro
      );
    }
    
    if (statusFiltro) {
      resultados = resultados.filter(m => 
        m.status === statusFiltro
      );
    }
    
    if (dataInicioFiltro) {
      resultados = resultados.filter(m => {
        if (!m.data_inicio) return false;
        return new Date(m.data_inicio) >= new Date(dataInicioFiltro);
      });
    }
    
    if (dataFimFiltro) {
      resultados = resultados.filter(m => {
        if (!m.data_fim) return false;
        return new Date(m.data_fim) <= new Date(dataFimFiltro);
      });
    }
    
    setMedicoesFiltradas(resultados);
  };
  
  const limparFiltros = () => {
    setNumeroOrdemFiltro("");
    setContratoFiltro("");
    setFornecedorFiltro("");
    setStatusFiltro("");
    setDataInicioFiltro("");
    setDataFimFiltro("");
  };

  const abrirModalExcluir = (medicao: Medicao) => {
    setMedicaoSelecionada(medicao);
    setModalExcluirAberto(true);
  };

  const handleDelete = async () => {
    if (!medicaoSelecionada) return;
    
    // Otimização UX: Remover da lista imediatamente
    const medicoesBackup = [...medicoes];
    const medicoesAtualizadas = medicoes.filter(m => m.id !== medicaoSelecionada.id);
    setMedicoes(medicoesAtualizadas);
    setModalExcluirAberto(false);
    
    try {
      console.log('🗑️ Iniciando exclusão da medição...');
      await deleteMedicao(medicaoSelecionada.id);
      
      showNotification({
        title: "Medição excluída com sucesso!",
        message: `A medição #${medicaoSelecionada.numero_ordem} foi removida e os valores estão sendo recalculados.`,
        type: "success",
        duration: 3000
      });
      
      console.log('✅ Exclusão da medição concluída!');
    } catch (error) {
      console.error('💥 Erro ao excluir medição:', error);
      
      // Reverter mudança local em caso de erro
      setMedicoes(medicoesBackup);
      
      showNotification({
        title: "Erro ao excluir medição",
        message: "Ocorreu um erro ao excluir a medição. Tente novamente.",
        type: "error",
        duration: 5000
      });
    }
  };

  // Função chamada quando o PDF fica pronto
  const handlePDFReady = (url: string) => {
    console.log('🎉 PDF COMPLETO pronto! Abrindo modal com URL:', url);
    
    if (medicaoParaPDF) {
      // Usar o mesmo formato de nome do PDFMedicao
      const contratoNumero = medicaoParaPDF.medicao?.negociacao?.numero?.replace(/\//g, '_') || 'sem_contrato';
      const numeroOrdem = medicaoParaPDF.medicao?.numero_ordem || 1;
      const fileName = `medicao_${contratoNumero}_${numeroOrdem}.pdf`;
      
      setModalPDF({
        isOpen: true,
        url: url,
        fileName: fileName
      });
      
      // Limpar dados do PDF após abrir modal
      setTimeout(() => {
        console.log('🧹 Limpando dados do PDF após abrir modal');
        setMedicaoParaPDF(null);
      }, 500);
    }
  };

  const fecharModalPDF = () => {
    setModalPDF({
      isOpen: false,
      url: '',
      fileName: ''
    });
  };

  const handleGerarPDF = async (medicao: Medicao) => {
    try {
      console.log('🎯 INICIANDO handleGerarPDF:', { medicaoId: medicao.id });
      
      resetPDF(); // Limpar erros anteriores
      
      // Buscar os itens da medição para gerar o PDF
      console.log('🔍 Buscando itens da medição...');
      const itensMedicao = await fetchItensMedicao(medicao.id);
      console.log('✅ Itens carregados:', { quantidade: itensMedicao.length });
      
      // Definir os dados para gerar o PDF
      console.log('📊 Definindo dados para o PDF...');
      setMedicaoParaPDF({ medicao, itens: itensMedicao });
      
      console.log('🎉 PDF será gerado e modal será aberto automaticamente!');
    } catch (error) {
      console.error('💥 Erro ao gerar PDF:', error);
      alert('Erro ao carregar dados para PDF. Verifique o console para mais detalhes.');
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

  // Função para calcular o total das medições aprovadas (CORRIGIDA - aplica todos os filtros)
  const calcularTotalMedicoesAprovadas = () => {
    // Aplicar TODOS os filtros manualmente aos dados completos
    let medicoesParaCalcular = [...medicoes];
    
    // Filtro por número de ordem
    if (numeroOrdemFiltro) {
      medicoesParaCalcular = medicoesParaCalcular.filter(m => 
        m.numero_ordem?.toString().includes(numeroOrdemFiltro)
      );
    }
    
    // Filtro por contrato
    if (contratoFiltro) {
      medicoesParaCalcular = medicoesParaCalcular.filter(m => 
        m.negociacao_id.toString() === contratoFiltro
      );
    }
    
    // Filtro por fornecedor
    if (fornecedorFiltro) {
      medicoesParaCalcular = medicoesParaCalcular.filter(m => 
        m.negociacao?.fornecedor?.nome?.toLowerCase().includes(fornecedorFiltro.toLowerCase()) ||
        m.negociacao?.fornecedor_id.toString() === fornecedorFiltro
      );
    }
    
    // Filtro por status
    if (statusFiltro) {
      medicoesParaCalcular = medicoesParaCalcular.filter(m => m.status === statusFiltro);
    } else {
      // Se não há filtro de status, considerar apenas aprovadas
      medicoesParaCalcular = medicoesParaCalcular.filter(m => m.status === 'Aprovado');
    }
    
    // Filtro por data de início
    if (dataInicioFiltro) {
      medicoesParaCalcular = medicoesParaCalcular.filter(m => {
        if (!m.data_inicio) return false;
        return new Date(m.data_inicio) >= new Date(dataInicioFiltro);
      });
    }
    
    // Filtro por data de fim
    if (dataFimFiltro) {
      medicoesParaCalcular = medicoesParaCalcular.filter(m => {
        if (!m.data_fim) return false;
        return new Date(m.data_fim) <= new Date(dataFimFiltro);
      });
    }
    
    const total = medicoesParaCalcular.reduce((total, medicao) => total + medicao.valor_total, 0);
    
    return total;
  };

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex justify-between items-center mb-6">
        {/* Painel "Total em medições aprovadas" no lugar do título */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-blue-800">Total em medições aprovadas:</h2>
            <span className="text-xl font-bold text-blue-900">
              {formatarValor(calcularTotalMedicoesAprovadas())}
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
            href="/medicoes/novo" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>NOVA MEDIÇÃO</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
              <select
                value={contratoFiltro}
                onChange={(e) => setContratoFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos os contratos</option>
                {contratos.map((contrato) => (
                  <option key={contrato.id} value={contrato.id}>
                    {contrato.numero} - {contrato.descricao}
                  </option>
                ))}
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
              <input
                type="date"
                value={dataInicioFiltro}
                onChange={(e) => setDataInicioFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de fim</label>
              <input
                type="date"
                value={dataFimFiltro}
                onChange={(e) => setDataFimFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Nº ORDEM</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-3/12">CONTRATO</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">FORNECEDOR</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">PERÍODO</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">VALOR</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">STATUS</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">Carregando medições...</td>
                </tr>
              ) : medicoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">Nenhum boletim de medição encontrado</td>
                </tr>
              ) : (
                medicoesFiltradas.map((medicao) => (
                  <tr key={medicao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{medicao.numero_ordem}</td>
                    <td className="px-6 py-4 truncate">
                      {medicao.negociacao?.numero} - {medicao.negociacao?.descricao}
                    </td>
                    <td className="px-6 py-4 truncate">
                      {medicao.negociacao?.fornecedor?.nome}
                    </td>
                    <td className="px-6 py-4">
                      {formatarData(medicao.data_inicio)} a {formatarData(medicao.data_fim)}
                    </td>
                    <td className="px-6 py-4">
                      {formatarValor(medicao.valor_total)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(medicao.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <Link
                          href={`/medicoes/visualizar/${medicao.id}`}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/medicoes/editar/${medicao.id}`}
                          className="text-yellow-600 hover:text-yellow-900 inline-flex items-center"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleGerarPDF(medicao)}
                          disabled={gerandoPDF}
                          className={`inline-flex items-center ${
                            gerandoPDF 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={gerandoPDF ? 'Gerando PDF...' : 'Gerar PDF'}
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => abrirModalExcluir(medicao)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleDelete}
        titulo="Excluir Medição"
        mensagem={medicaoSelecionada ? `Tem certeza que deseja excluir esta medição?\n\nNº: ${medicaoSelecionada.numero_ordem}\nValor: ${formatarValor(medicaoSelecionada.valor_total)}\nPeríodo: ${formatarData(medicaoSelecionada.data_inicio)} a ${formatarData(medicaoSelecionada.data_fim)}` : ''}
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />

      {/* Componente de PDF oculto */}
      {medicaoParaPDF && (
        <div style={{ display: 'none' }}>
          {(() => {
            console.log('🔄 RENDERIZANDO PDFDebug com dados:', {
              medicao: !!medicaoParaPDF.medicao,
              medicaoId: medicaoParaPDF.medicao?.id,
              itens: !!medicaoParaPDF.itens,
              quantidadeItens: medicaoParaPDF.itens?.length
            });
            return (
              <PDFMedicao
                medicao={medicaoParaPDF.medicao}
                itens={medicaoParaPDF.itens}
                onPDFReady={handlePDFReady}
              >
                <span id={`pdf-link-${medicaoParaPDF.medicao.id}`}>Download PDF</span>
              </PDFMedicao>
            );
          })()}
        </div>
      )}

      {/* Modal de visualização do PDF */}
      <PDFModal
        isOpen={modalPDF.isOpen}
        onClose={fecharModalPDF}
        pdfUrl={modalPDF.url}
        fileName={modalPDF.fileName}
      />

    </main>
  );
} 