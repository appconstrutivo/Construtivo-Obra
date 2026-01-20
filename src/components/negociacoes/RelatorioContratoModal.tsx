'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, TrendingUp, FileText, CheckCircle, Clock, Download, Printer } from 'lucide-react';
import { Negociacao, Medicao, ItemMedicao, fetchMedicoes, fetchItensMedicao, fetchItensNegociacao } from '@/lib/supabase';
import PDFModal from '@/components/ui/PDFModal';
import PDFRelatorioContrato from './PDFRelatorioContrato';

interface RelatorioContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrato: Negociacao;
}

interface MedicaoComItens extends Medicao {
  itens: ItemMedicao[];
}

interface ItemMedicaoComAcumulado extends ItemMedicao {
  percentual_acumulado: number;
}

export default function RelatorioContratoModal({ isOpen, onClose, contrato }: RelatorioContratoModalProps) {
  const [loading, setLoading] = useState(false);
  const [medicoes, setMedicoes] = useState<MedicaoComItens[]>([]);
  const [resumo, setResumo] = useState({
    valorTotal: 0,
    valorMedido: 0,
    valorSaldo: 0,
    percentualExecutado: 0,
    numeroMedicoes: 0,
    medicoesAprovadas: 0,
    medicoesPendentes: 0
  });

  // Estados para PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [modalPDFAberto, setModalPDFAberto] = useState(false);
  const [urlPDF, setUrlPDF] = useState('');
  
  // Medições com percentuais acumulados para o PDF
  const medicoesComAcumulado = medicoes.map(medicao => ({
    ...medicao,
    itens: medicao.itens.map(item => ({
      ...item,
      percentual_acumulado: (item as any).percentual_acumulado || 0
    }))
  }));

  useEffect(() => {
    if (isOpen && contrato) {
      carregarDadosRelatorio();
    }
  }, [isOpen, contrato]);

  const calcularPercentuaisAcumulados = (medicoes: MedicaoComItens[], itensContrato: any[]) => {
    // Map para rastrear quantidades acumuladas por item de negociação
    const quantidadesAcumuladas: { [itemId: number]: number } = {};
    
    // Inicializar com zero
    itensContrato.forEach(item => {
      quantidadesAcumuladas[item.id] = 0;
    });

    // Processar medições em ordem cronológica
    const medicoesProcessadas = medicoes.map(medicao => {
      const itensComAcumulado = medicao.itens.map(itemMedicao => {
        // Somar apenas se a medição foi aprovada
        if (medicao.status === 'Aprovado') {
          quantidadesAcumuladas[itemMedicao.item_negociacao_id] += itemMedicao.quantidade_medida;
        }
        
        // Encontrar o item original do contrato para calcular percentual
        const itemOriginal = itensContrato.find(item => item.id === itemMedicao.item_negociacao_id);
        const quantidadeTotal = itemOriginal?.quantidade || itemMedicao.quantidade_total;
        const quantidadeAcumulada = quantidadesAcumuladas[itemMedicao.item_negociacao_id];
        const percentual_acumulado = quantidadeTotal > 0 ? (quantidadeAcumulada / quantidadeTotal) * 100 : 0;

        return {
          ...itemMedicao,
          percentual_acumulado: Math.min(percentual_acumulado, 100) // Limitar a 100%
        } as ItemMedicaoComAcumulado;
      });

      return { ...medicao, itens: itensComAcumulado };
    });

    return medicoesProcessadas;
  };

  const carregarDadosRelatorio = async () => {
    setLoading(true);
    try {
      // Buscar todas as medições
      const todasMedicoes = await fetchMedicoes();
      
      // Filtrar medições do contrato atual
      const medicoesContrato = todasMedicoes.filter(medicao => medicao.negociacao_id === contrato.id);
      
      // Buscar itens do contrato para calcular percentuais acumulados
      const itensContrato = await fetchItensNegociacao(contrato.id);
      
      // Buscar itens de cada medição
      const medicoesComItens: MedicaoComItens[] = await Promise.all(
        medicoesContrato.map(async (medicao) => {
          const itens = await fetchItensMedicao(medicao.id);
          return { ...medicao, itens };
        })
      );

      // Ordenar por data de criação (mais antigo primeiro para calcular acumulados)
      medicoesComItens.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      // Calcular percentuais acumulados
      const medicoesComAcumulados = calcularPercentuaisAcumulados(medicoesComItens, itensContrato);
      
      // Reordenar por data de criação (mais recente primeiro para exibição)
      medicoesComAcumulados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setMedicoes(medicoesComAcumulados);

      // Calcular resumo
      const valorTotal = contrato.valor_total;
      const valorMedido = medicoesComItens
        .filter(m => m.status === 'Aprovado')
        .reduce((total, medicao) => total + medicao.valor_total, 0);
      const valorSaldo = valorTotal - valorMedido;
      const percentualExecutado = valorTotal > 0 ? (valorMedido / valorTotal) * 100 : 0;
      const medicoesAprovadas = medicoesComItens.filter(m => m.status === 'Aprovado').length;
      const medicoesPendentes = medicoesComItens.filter(m => m.status === 'Pendente').length;

      setResumo({
        valorTotal,
        valorMedido,
        valorSaldo,
        percentualExecutado,
        numeroMedicoes: medicoesComItens.length,
        medicoesAprovadas,
        medicoesPendentes
      });

    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const gerarPDF = () => {
    setGerandoPDF(true);
  };

  const handlePDFReady = (url: string) => {
    setUrlPDF(url);
    setModalPDFAberto(true);
    setGerandoPDF(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Aprovado') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Aprovado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={12} className="mr-1" />
          Pendente
        </span>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Relatório do Contrato</h2>
            <p className="text-blue-100">{contrato.numero} - {contrato.fornecedor?.nome}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={gerarPDF}
              disabled={gerandoPDF}
              className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              title="Gerar PDF"
            >
              {gerandoPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Gerando...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span className="hidden sm:inline">PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors p-1"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando dados do relatório...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumo Executivo */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText size={20} className="mr-2 text-blue-600" />
                  Resumo Executivo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Valor Total</p>
                        <p className="text-xl font-bold text-gray-900">{formatarValor(resumo.valorTotal)}</p>
                      </div>
                      <DollarSign size={24} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Valor Medido</p>
                        <p className="text-xl font-bold text-green-600">{formatarValor(resumo.valorMedido)}</p>
                      </div>
                      <TrendingUp size={24} className="text-green-600" />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Saldo</p>
                        <p className="text-xl font-bold text-orange-600">{formatarValor(resumo.valorSaldo)}</p>
                      </div>
                      <DollarSign size={24} className="text-orange-600" />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">% Executado</p>
                        <p className="text-xl font-bold text-purple-600">{resumo.percentualExecutado.toFixed(1)}%</p>
                      </div>
                      <TrendingUp size={24} className="text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progresso do Contrato</span>
                    <span>{resumo.percentualExecutado.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(resumo.percentualExecutado, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Estatísticas de Medições */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Calendar size={20} className="mr-2 text-blue-600" />
                  Estatísticas de Medições
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{resumo.numeroMedicoes}</p>
                    <p className="text-sm text-gray-600">Total de Medições</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{resumo.medicoesAprovadas}</p>
                    <p className="text-sm text-gray-600">Medições Aprovadas</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{resumo.medicoesPendentes}</p>
                    <p className="text-sm text-gray-600">Medições Pendentes</p>
                  </div>
                </div>
              </div>

              {/* Histórico de Medições */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText size={20} className="mr-2 text-blue-600" />
                  Histórico de Medições
                </h3>
                {medicoes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhuma medição encontrada para este contrato.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicoes.map((medicao, index) => (
                      <div key={medicao.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Medição #{medicao.numero_ordem || index + 1}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Período: {formatarData(medicao.data_inicio)} a {formatarData(medicao.data_fim)}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(medicao.status)}
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {formatarValor(medicao.valor_total)}
                            </p>
                          </div>
                        </div>
                        
                        {medicao.observacao && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">
                              <strong>Observação:</strong> {medicao.observacao}
                            </p>
                          </div>
                        )}

                        {medicao.itens.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">Item</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">Qtde Total</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">Qtde Medida</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">% Acum.</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {medicao.itens.map((item) => (
                                  <tr key={item.id} className="border-t">
                                    <td className="px-3 py-2">{item.descricao}</td>
                                    <td className="px-3 py-2">{item.quantidade_total} {item.unidade}</td>
                                    <td className="px-3 py-2">{item.quantidade_medida} {item.unidade}</td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        (item as ItemMedicaoComAcumulado).percentual_acumulado >= 100 
                                          ? 'bg-green-100 text-green-800' 
                                          : (item as ItemMedicaoComAcumulado).percentual_acumulado >= 50 
                                            ? 'bg-yellow-100 text-yellow-800' 
                                            : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {(item as ItemMedicaoComAcumulado).percentual_acumulado?.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-medium">{formatarValor(item.valor_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
          >
            Fechar
          </button>
        </div>
        </div>
      </div>

      {/* Componente PDF oculto - usado para gerar o PDF */}
      {gerandoPDF && (
        <div style={{ display: 'none' }}>
          <PDFRelatorioContrato
            contrato={contrato}
            medicoes={medicoesComAcumulado}
            resumo={resumo}
            onPDFReady={handlePDFReady}
          >
            <span>Gerando PDF...</span>
          </PDFRelatorioContrato>
        </div>
      )}

      {/* Modal para visualização do PDF */}
      <PDFModal
        isOpen={modalPDFAberto}
        onClose={() => {
          setModalPDFAberto(false);
          setGerandoPDF(false);
        }}
        pdfUrl={urlPDF}
        fileName={`Relatório Contrato ${contrato.numero}`}
      />
    </>
  );
}