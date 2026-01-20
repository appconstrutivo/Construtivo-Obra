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
    <main className="flex-1 overflow-auto p-6">
      <div className="flex justify-between items-center mb-6">
        {/* Painel "Total em contratos" no lugar do título */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-blue-800">Total em contratos:</h2>
            <span className="text-xl font-bold text-blue-900">
              {formatarValor(calcularTotalContratos())}
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
            href="/negociacoes/novo" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>NOVO CONTRATO</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input
                type="text"
                value={numeroFiltro}
                onChange={(e) => setNumeroFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por número"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={descricaoFiltro}
                onChange={(e) => setDescricaoFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por descrição"
              />
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