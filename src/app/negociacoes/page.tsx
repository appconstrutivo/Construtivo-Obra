"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, FileText, Trash2, Search, X, BarChart3 } from 'lucide-react';
import { fetchNegociacoes, deleteNegociacao, fetchItensNegociacao, fetchParcelasPagamentoByNegociacao, Negociacao, ItemNegociacao, ParcelaPagamento, fetchObras, fetchFornecedores } from '@/lib/supabase';
import { useObra } from '@/contexts/ObraContext';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import PDFModal from '@/components/ui/PDFModal';
import PDFContrato from '@/components/negociacoes/PDFContrato';
import RelatorioContratoModal from '@/components/negociacoes/RelatorioContratoModal';

export default function NegociacoesPage() {
  const { obraSelecionada } = useObra();
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
  const [negociacoesFiltradas, setNegociacoesFiltradas] = useState<Negociacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [negociacaoSelecionada, setNegociacaoSelecionada] = useState<Negociacao | null>(null);

  // Estados para PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [modalPDFAberto, setModalPDFAberto] = useState(false);
  const [urlPDF, setUrlPDF] = useState('');
  const [itensPDF, setItensPDF] = useState<ItemNegociacao[]>([]);
  const [parcelasPDF, setParcelasPDF] = useState<ParcelaPagamento[]>([]);
  const [obraInfo, setObraInfo] = useState<{ nome: string; endereco: string; responsavel_tecnico: string } | null>(null);

  
  // Estados para os filtros
  const [numeroFiltro, setNumeroFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [fornecedorFiltro, setFornecedorFiltro] = useState("");
  const [descricaoFiltro, setDescricaoFiltro] = useState("");
  const [dataInicioFiltro, setDataInicioFiltro] = useState("");
  const [dataFimFiltro, setDataFimFiltro] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [tiposNegociacoes, setTiposNegociacoes] = useState<string[]>([]);

  // Estados para o modal de relatório
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [contratoRelatorio, setContratoRelatorio] = useState<Negociacao | null>(null);

  const carregarNegociacoes = async () => {
    setLoading(true);
    try {
      const data = await fetchNegociacoes(obraSelecionada?.id);
      setNegociacoes(data);
      setNegociacoesFiltradas(data);
      
      // Extrair todos os tipos de negociações únicos
      const tiposUnicos = Array.from(new Set(data.map(n => n.tipo)));
      setTiposNegociacoes(tiposUnicos);
    } catch (error) {
      console.error('Erro ao carregar negociações:', error);
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

  const carregarObraInfo = async () => {
    try {
      if (!obraSelecionada) {
        setObraInfo(null);
        return;
      }
      setObraInfo({
        nome: obraSelecionada.nome,
        endereco: obraSelecionada.endereco || '',
        responsavel_tecnico: obraSelecionada.responsavel_tecnico || ''
      });
    } catch (error) {
      console.error('Erro ao carregar informações da obra:', error);
    }
  };

  const handlePDFReady = (url: string) => {
    console.log('PDF pronto, abrindo modal com URL:', url);
    setUrlPDF(url);
    setModalPDFAberto(true);
    setGerandoPDF(false);
  };

  useEffect(() => {
    carregarNegociacoes();
    carregarFornecedores();
    carregarObraInfo();
  }, [obraSelecionada]);
  
  useEffect(() => {
    aplicarFiltros();
  }, [numeroFiltro, tipoFiltro, fornecedorFiltro, descricaoFiltro, dataInicioFiltro, dataFimFiltro, negociacoes]);

  const aplicarFiltros = () => {
    let resultados = [...negociacoes];
    
    if (numeroFiltro) {
      resultados = resultados.filter(n => 
        n.numero?.toLowerCase().includes(numeroFiltro.toLowerCase())
      );
    }
    
    if (tipoFiltro) {
      resultados = resultados.filter(n => n.tipo === tipoFiltro);
    }
    
    if (fornecedorFiltro) {
      resultados = resultados.filter(n => 
        n.fornecedor?.nome?.toLowerCase().includes(fornecedorFiltro.toLowerCase()) ||
        n.fornecedor_id.toString() === fornecedorFiltro
      );
    }
    
    if (descricaoFiltro) {
      resultados = resultados.filter(n => 
        n.descricao?.toLowerCase().includes(descricaoFiltro.toLowerCase())
      );
    }
    
    if (dataInicioFiltro) {
      resultados = resultados.filter(n => {
        if (!n.data_inicio) return false;
        return new Date(n.data_inicio) >= new Date(dataInicioFiltro);
      });
    }
    
    if (dataFimFiltro) {
      resultados = resultados.filter(n => {
        if (!n.data_fim) return false;
        return new Date(n.data_fim) <= new Date(dataFimFiltro);
      });
    }
    
    setNegociacoesFiltradas(resultados);
  };
  
  const limparFiltros = () => {
    setNumeroFiltro("");
    setTipoFiltro("");
    setFornecedorFiltro("");
    setDescricaoFiltro("");
    setDataInicioFiltro("");
    setDataFimFiltro("");
  };

  const abrirModalExcluir = (negociacao: Negociacao) => {
    setNegociacaoSelecionada(negociacao);
    setModalExcluirAberto(true);
  };

  const abrirModalRelatorio = (negociacao: Negociacao) => {
    setContratoRelatorio(negociacao);
    setModalRelatorioAberto(true);
  };

  const handleDelete = async () => {
    if (!negociacaoSelecionada) return;
    
    try {
      await deleteNegociacao(negociacaoSelecionada.id);
      setModalExcluirAberto(false);
      carregarNegociacoes();
    } catch (error) {
      console.error('Erro ao excluir negociação:', error);
    }
  };

  const handleGerarPDF = async (negociacao: Negociacao) => {
    try {
      setGerandoPDF(true);
      
      console.log('Iniciando geração de PDF para contrato:', negociacao.numero);
      
      // Carregar dados completos incluindo fornecedor
      const [itens, parcelas, fornecedor] = await Promise.all([
        fetchItensNegociacao(negociacao.id),
        fetchParcelasPagamentoByNegociacao(negociacao.id),
        negociacao.fornecedor_id ? fetchFornecedores().then(fornecedores => 
          fornecedores.find(f => f.id === negociacao.fornecedor_id)
        ) : Promise.resolve(null)
      ]);
      
      // Criar objeto contrato com todos os dados necessários
      const contratoCompleto = {
        ...negociacao,
        fornecedor: fornecedor || negociacao.fornecedor || undefined
      };
      
      console.log('Dados carregados:', {
        contrato: negociacao.numero,
        fornecedor: fornecedor?.nome || 'N/A',
        itensCount: itens.length,
        parcelasCount: parcelas.length
      });
      
      setNegociacaoSelecionada(contratoCompleto);
      setItensPDF(itens);
      setParcelasPDF(parcelas);
      
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        console.log('Estados atualizados, PDF deve gerar automaticamente');
      }, 100);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setGerandoPDF(false);
      alert('Erro ao gerar PDF. Tente novamente.');
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

  // Função para calcular o total dos contratos
  const calcularTotalContratos = () => {
    return negociacoesFiltradas.reduce((total, negociacao) => total + negociacao.valor_total, 0);
  };

  const renderTipoBadge = (tipo: string) => {
    let bgColor = 'bg-blue-100 text-blue-800';
    
    if (tipo === 'Pedido de Compra') {
      bgColor = 'bg-green-100 text-green-800';
    } else if (tipo === 'Locação de Equipamento') {
      bgColor = 'bg-purple-100 text-purple-800';
    }
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${bgColor} font-medium`}>
        {tipo}
      </span>
    );
  };

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
        {/* Painel "Total em contratos" */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1 md:flex-initial">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
            <h2 className="text-base md:text-lg font-semibold text-blue-800">Total em contratos:</h2>
            <span className="text-lg md:text-xl font-bold text-blue-900">
              {formatarValor(calcularTotalContratos())}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-2 min-h-[40px] md:min-h-0 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm md:text-base rounded-lg transition-colors active:bg-gray-400 shrink-0"
          >
            <Search size={16} className="md:w-[18px] md:h-[18px] shrink-0" />
            <span>Filtros</span>
          </button>
          <Link 
            href="/negociacoes/novo" 
            className="flex items-center gap-1.5 md:gap-2 px-3 py-2 min-h-[40px] md:min-h-0 bg-blue-500 hover:bg-blue-600 text-white text-sm md:text-base rounded-lg transition-colors active:bg-blue-700 shrink-0"
          >
            <Plus size={16} className="md:w-[18px] md:h-[18px] shrink-0" />
            <span className="md:hidden">Novo</span>
            <span className="hidden md:inline">NOVO CONTRATO</span>
          </Link>
        </div>
      </div>
      
      {mostrarFiltros && (
        <div className="bg-white shadow-sm rounded-lg mb-4 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center mb-4">
            <h2 className="text-lg font-medium">Filtros</h2>
            <button
              onClick={limparFiltros}
              className="w-full md:w-auto min-h-[44px] md:min-h-0 text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 text-sm font-medium rounded-lg active:bg-blue-50"
            >
              <X size={16} />
              Limpar filtros
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input
                type="text"
                value={numeroFiltro}
                onChange={(e) => setNumeroFiltro(e.target.value)}
                className="w-full min-h-[48px] md:min-h-0 p-2.5 md:p-2 border border-gray-300 rounded-lg text-base"
                placeholder="Filtrar por número"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full min-h-[48px] md:min-h-0 p-2.5 md:p-2 border border-gray-300 rounded-lg text-base"
              >
                <option value="">Todos os tipos</option>
                {tiposNegociacoes.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <select
                value={fornecedorFiltro}
                onChange={(e) => setFornecedorFiltro(e.target.value)}
                className="w-full min-h-[48px] md:min-h-0 p-2.5 md:p-2 border border-gray-300 rounded-lg text-base"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={descricaoFiltro}
                onChange={(e) => setDescricaoFiltro(e.target.value)}
                className="w-full min-h-[48px] md:min-h-0 p-2.5 md:p-2 border border-gray-300 rounded-lg text-base"
                placeholder="Filtrar por descrição"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
              <input
                type="date"
                value={dataInicioFiltro}
                onChange={(e) => setDataInicioFiltro(e.target.value)}
                className="w-full min-h-[48px] md:min-h-0 p-2.5 md:p-2 border border-gray-300 rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de fim</label>
              <input
                type="date"
                value={dataFimFiltro}
                onChange={(e) => setDataFimFiltro(e.target.value)}
                className="w-full min-h-[48px] md:min-h-0 p-2.5 md:p-2 border border-gray-300 rounded-lg text-base"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Layout mobile: cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Carregando negociações...</div>
          ) : negociacoesFiltradas.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">Nenhuma negociação encontrada</div>
          ) : (
            negociacoesFiltradas.map((negociacao) => (
              <div key={negociacao.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{negociacao.numero}</p>
                    <div className="mt-1">{renderTipoBadge(negociacao.tipo)}</div>
                    {negociacao.fornecedor?.nome && (
                      <p className="text-sm text-gray-600 truncate mt-1">{negociacao.fornecedor.nome}</p>
                    )}
                    {negociacao.descricao && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">{negociacao.descricao}</p>
                    )}
                  </div>
                  <p className="font-semibold text-blue-900 shrink-0">
                    {formatarValor(negociacao.valor_total)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <Link
                    href={`/negociacoes/editar/${negociacao.id}`}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-amber-600 text-amber-600 text-sm font-medium active:bg-amber-50"
                    title="Editar"
                  >
                    <Pencil size={16} />
                    Editar
                  </Link>
                  <button
                    onClick={() => abrirModalRelatorio(negociacao)}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-blue-600 text-blue-600 text-sm font-medium active:bg-blue-50"
                    title="Relatório"
                  >
                    <BarChart3 size={16} />
                    Relatório
                  </button>
                  <button
                    onClick={() => handleGerarPDF(negociacao)}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-green-600 text-green-600 text-sm font-medium active:bg-green-50 disabled:opacity-50"
                    title="PDF"
                    disabled={gerandoPDF}
                  >
                    <FileText size={16} />
                    PDF
                  </button>
                  <button
                    onClick={() => abrirModalExcluir(negociacao)}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-red-600 text-red-600 text-sm font-medium active:bg-red-50"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Layout desktop: tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">NÚMERO</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">TIPO</th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">FORNECEDOR</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">DESCRIÇÃO</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Carregando negociações...</td>
                </tr>
              ) : negociacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Nenhuma negociação encontrada</td>
                </tr>
              ) : (
                negociacoesFiltradas.map((negociacao) => (
                  <tr key={negociacao.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">{negociacao.numero}</td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {renderTipoBadge(negociacao.tipo)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {negociacao.fornecedor?.nome}
                    </td>
                    <td className="px-6 py-4">{negociacao.descricao}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {formatarValor(negociacao.valor_total)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/negociacoes/editar/${negociacao.id}`}
                        className="text-amber-600 hover:text-amber-900 inline-flex items-center"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </Link>
                      <button
                        onClick={() => abrirModalRelatorio(negociacao)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        title="Relatório do Contrato"
                      >
                        <BarChart3 size={18} />
                      </button>
                      <button
                        onClick={() => handleGerarPDF(negociacao)}
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                        title="Gerar PDF"
                        disabled={gerandoPDF}
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => abrirModalExcluir(negociacao)}
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

      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleDelete}
        titulo="Excluir Contrato"
        mensagem={negociacaoSelecionada ? `Tem certeza que deseja excluir o contrato "${negociacaoSelecionada.numero}"? Esta ação não pode ser desfeita.` : ''}
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />

      {/* Componente PDF oculto - usado para gerar o PDF */}
      {negociacaoSelecionada && gerandoPDF && (
        <div style={{ display: 'none' }}>
          <PDFContrato
            contrato={negociacaoSelecionada}
            itens={itensPDF}
            parcelas={parcelasPDF}
            obraInfo={obraInfo}
            onPDFReady={handlePDFReady}
          >
            <span>Gerando PDF...</span>
          </PDFContrato>
        </div>
      )}

      {/* Modal para visualização do PDF */}
      <PDFModal
        isOpen={modalPDFAberto}
        onClose={() => {
          setModalPDFAberto(false);
          setGerandoPDF(false);
          setNegociacaoSelecionada(null);
        }}
        pdfUrl={urlPDF}
        fileName={`Contrato ${negociacaoSelecionada?.numero || ''}`}
      />

      {/* Modal de Relatório do Contrato */}
      {contratoRelatorio && (
        <RelatorioContratoModal
          isOpen={modalRelatorioAberto}
          onClose={() => {
            setModalRelatorioAberto(false);
            setContratoRelatorio(null);
          }}
          contrato={contratoRelatorio}
        />
      )}

    </main>
  );
} 