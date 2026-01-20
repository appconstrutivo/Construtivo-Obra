'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Negociacao, ItemMedicao } from '@/lib/supabase';

interface MedicaoComItens {
  id: number;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: string;
  observacao?: string;
  numero_ordem?: number;
  itens: ItemMedicaoComAcumulado[];
}

interface ItemMedicaoComAcumulado extends ItemMedicao {
  percentual_acumulado: number;
}

interface PDFRelatorioContratoProps {
  contrato: Negociacao;
  medicoes: MedicaoComItens[];
  resumo: {
    valorTotal: number;
    valorMedido: number;
    valorSaldo: number;
    percentualExecutado: number;
    numeroMedicoes: number;
    medicoesAprovadas: number;
    medicoesPendentes: number;
  };
  onPDFReady?: (url: string) => void;
  children?: React.ReactNode;
}

// Estilos para o PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 10,
  },
  header: {
    backgroundColor: '#2563EB',
    color: 'white',
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    opacity: 0.9,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resumoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  resumoCard: {
    backgroundColor: '#F9FAFB',
    border: '1 solid #E5E7EB',
    borderRadius: 6,
    padding: 12,
    flex: 1,
    minWidth: 120,
  },
  resumoLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 3,
  },
  resumoValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  resumoValueGreen: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  resumoValueOrange: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EA580C',
  },
  resumoValuePurple: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9333EA',
  },
  progressContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  progressLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 3,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  progressText: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },
  estatisticasContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  estatisticaCard: {
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  estatisticaValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 3,
  },
  estatisticaLabel: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
  },
  medicaoContainer: {
    backgroundColor: '#FAFAFA',
    border: '1 solid #E5E7EB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  medicaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medicaoTitulo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  medicaoPeriodo: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  medicaoStatus: {
    fontSize: 8,
    padding: '3 6',
    borderRadius: 10,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    alignSelf: 'center',
  },
  statusAprovado: {
    backgroundColor: '#10B981',
  },
  statusPendente: {
    backgroundColor: '#F59E0B',
  },
  medicaoValor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 3,
  },
  observacao: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: '#374151',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tableCellPercent: {
    width: 45, // Reduzido mais 10% (50 * 0.9 = 45)
    fontSize: 8,
    color: '#374151',
    marginRight: 8, // Espaçamento entre % Acum. e Valor
  },
  tableCellHeaderPercent: {
    width: 45, // Reduzido mais 10% (50 * 0.9 = 45)
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8, // Espaçamento entre % Acum. e Valor
  },
  percentualBadge: {
    fontSize: 7,
    padding: '2 4',
    borderRadius: 8,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  percentualGreen: {
    backgroundColor: '#10B981',
  },
  percentualYellow: {
    backgroundColor: '#F59E0B',
  },
  percentualBlue: {
    backgroundColor: '#3B82F6',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#6B7280',
  },
});

const PDFRelatorioContrato: React.FC<PDFRelatorioContratoProps> = ({
  contrato,
  medicoes,
  resumo,
  onPDFReady,
  children
}) => {
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getPercentualStyle = (percentual: number) => {
    if (percentual >= 100) return [styles.percentualBadge, styles.percentualGreen];
    if (percentual >= 50) return [styles.percentualBadge, styles.percentualYellow];
    return [styles.percentualBadge, styles.percentualBlue];
  };

  const PDFDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Relatório do Contrato</Text>
          <Text style={styles.headerSubtitle}>
            {contrato.numero} - {contrato.fornecedor?.nome}
          </Text>
        </View>

        {/* Resumo Executivo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Executivo</Text>
          <View style={styles.resumoContainer}>
            <View style={styles.resumoCard}>
              <Text style={styles.resumoLabel}>Valor Total</Text>
              <Text style={styles.resumoValue}>{formatarValor(resumo.valorTotal)}</Text>
            </View>
            <View style={styles.resumoCard}>
              <Text style={styles.resumoLabel}>Valor Medido</Text>
              <Text style={styles.resumoValueGreen}>{formatarValor(resumo.valorMedido)}</Text>
            </View>
            <View style={styles.resumoCard}>
              <Text style={styles.resumoLabel}>Saldo</Text>
              <Text style={styles.resumoValueOrange}>{formatarValor(resumo.valorSaldo)}</Text>
            </View>
            <View style={styles.resumoCard}>
              <Text style={styles.resumoLabel}>% Executado</Text>
              <Text style={styles.resumoValuePurple}>{resumo.percentualExecutado.toFixed(1)}%</Text>
            </View>
          </View>

          {/* Barra de Progresso */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progresso do Contrato</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(resumo.percentualExecutado, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{resumo.percentualExecutado.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Estatísticas de Medições */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatísticas de Medições</Text>
          <View style={styles.estatisticasContainer}>
            <View style={styles.estatisticaCard}>
              <Text style={styles.estatisticaValue}>{resumo.numeroMedicoes}</Text>
              <Text style={styles.estatisticaLabel}>Total de Medições</Text>
            </View>
            <View style={styles.estatisticaCard}>
              <Text style={styles.estatisticaValue}>{resumo.medicoesAprovadas}</Text>
              <Text style={styles.estatisticaLabel}>Medições Aprovadas</Text>
            </View>
            <View style={styles.estatisticaCard}>
              <Text style={styles.estatisticaValue}>{resumo.medicoesPendentes}</Text>
              <Text style={styles.estatisticaLabel}>Medições Pendentes</Text>
            </View>
          </View>
        </View>

        {/* Histórico de Medições */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Medições</Text>
          {medicoes.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 20 }}>
              Nenhuma medição encontrada para este contrato.
            </Text>
          ) : (
            medicoes.slice(0, 3).map((medicao, index) => (
              <View key={medicao.id} style={styles.medicaoContainer}>
                <View style={styles.medicaoHeader}>
                  <View>
                    <Text style={styles.medicaoTitulo}>
                      Medição #{medicao.numero_ordem || index + 1}
                    </Text>
                    <Text style={styles.medicaoPeriodo}>
                      Período: {formatarData(medicao.data_inicio)} a {formatarData(medicao.data_fim)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[
                      styles.medicaoStatus,
                      medicao.status === 'Aprovado' ? styles.statusAprovado : styles.statusPendente
                    ]}>
                      {medicao.status}
                    </Text>
                    <Text style={styles.medicaoValor}>
                      {formatarValor(medicao.valor_total)}
                    </Text>
                  </View>
                </View>

                {medicao.observacao && (
                  <Text style={styles.observacao}>
                    Observação: {medicao.observacao}
                  </Text>
                )}

                {medicao.itens.length > 0 && (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableCellHeader}>Item</Text>
                      <Text style={styles.tableCellHeader}>Qtde Total</Text>
                      <Text style={styles.tableCellHeader}>Qtde Medida</Text>
                      <Text style={styles.tableCellHeaderPercent}>% Acum.</Text>
                      <Text style={styles.tableCellHeader}>Valor</Text>
                    </View>
                    {medicao.itens.slice(0, 5).map((item) => (
                      <View key={item.id} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{item.descricao}</Text>
                        <Text style={styles.tableCell}>{item.quantidade_total} {item.unidade}</Text>
                        <Text style={styles.tableCell}>{item.quantidade_medida} {item.unidade}</Text>
                        <View style={styles.tableCellPercent}>
                          <Text style={getPercentualStyle(item.percentual_acumulado)}>
                            {item.percentual_acumulado.toFixed(1)}%
                          </Text>
                        </View>
                        <Text style={styles.tableCell}>{formatarValor(item.valor_total)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Relatório gerado em {new Date().toLocaleString('pt-BR')} - Sistema Construtivo
        </Text>
      </Page>
    </Document>
  );

  React.useEffect(() => {
    if (onPDFReady) {
      const generatePDF = async () => {
        try {
          const blob = await pdf(<PDFDocument />).toBlob();
          const url = URL.createObjectURL(blob);
          onPDFReady(url);
        } catch (error) {
          console.error('Erro ao gerar PDF:', error);
        }
      };

      generatePDF();
    }
  }, [contrato, medicoes, resumo, onPDFReady]);

  return children ? <>{children}</> : null;
};

export default PDFRelatorioContrato;