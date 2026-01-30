'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

export interface ItemContaPagaPDF {
  id: number;
  origem: string;
  descricao: string;
  valor: number;
  dataPrevista: string;
  fornecedorOuObra?: string;
}

export interface ItemContaRecebidaPDF {
  id: number;
  descricao: string;
  valor: number;
  dataRecebimento: string;
  cliente: string;
  formaRecebimento?: string;
}

export interface TotaisPorMesPDF {
  mesLabel: string;
  totalPago: number;
  totalRecebido: number;
}

export interface TotaisPorMesSimplesPDF {
  mesLabel: string;
  total: number;
}

export interface PDFRelatorioConfiguravelProps {
  tipoRelatorio: 'contas_pagas' | 'contas_recebidas' | 'contas_pagas_recebidas';
  formatoRelatorio: 'detalhado' | 'resumido';
  dataInicio?: string;
  dataFim?: string;
  obraNome?: string;
  contasPagas: ItemContaPagaPDF[];
  contasRecebidas: ItemContaRecebidaPDF[];
  totaisPorMes: TotaisPorMesPDF[];
  totaisPorMesContasPagas: TotaisPorMesSimplesPDF[];
  totaisPorMesContasRecebidas: TotaisPorMesSimplesPDF[];
  totalPagas: number;
  totalRecebidas: number;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 9,
  },
  header: {
    backgroundColor: '#2563EB',
    color: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    opacity: 0.95,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: '#374151',
  },
  tableCellRight: {
    flex: 1,
    fontSize: 8,
    color: '#374151',
    textAlign: 'right',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tableCellHeaderRight: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#EFF6FF',
    marginTop: 4,
    fontWeight: 'bold',
  },
  resumoCard: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  resumoItem: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
  },
  resumoItemPago: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  resumoItemRecebido: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  resumoLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 2,
  },
  resumoValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resumoValuePago: { color: '#B91C1C' },
  resumoValueRecebido: { color: '#15803D' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#6B7280',
  },
  emptyMessage: {
    fontSize: 9,
    color: '#6B7280',
    fontStyle: 'italic',
    padding: 8,
  },
});

function formatarValor(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data: string): string {
  if (!data) return '-';
  const d = data.split('T')[0].split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

const PDFRelatorioConfiguravel: React.FC<PDFRelatorioConfiguravelProps> = (props) => {
  const {
    tipoRelatorio,
    formatoRelatorio,
    dataInicio,
    dataFim,
    obraNome,
    contasPagas,
    contasRecebidas,
    totaisPorMes,
    totaisPorMesContasPagas,
    totaisPorMesContasRecebidas,
    totalPagas,
    totalRecebidas,
  } = props;

  const periodoLabel =
    dataInicio && dataFim
      ? `${formatarData(dataInicio)} a ${formatarData(dataFim)}`
      : 'Período não filtrado';

  const tituloTipo =
    tipoRelatorio === 'contas_pagas'
      ? 'Contas pagas'
      : tipoRelatorio === 'contas_recebidas'
        ? 'Contas recebidas'
        : 'Contas pagas x Contas recebidas';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Relatório configurável</Text>
          <Text style={styles.headerSubtitle}>
            {tituloTipo} {obraNome ? ` • ${obraNome}` : ''}
          </Text>
          <Text style={styles.headerSubtitle}>Período: {periodoLabel}</Text>
          <Text style={styles.headerSubtitle}>
            Formato: {formatoRelatorio === 'detalhado' ? 'Detalhado' : 'Resumido'}
          </Text>
        </View>

        {formatoRelatorio === 'detalhado' && (
          <>
            {(tipoRelatorio === 'contas_pagas' ||
              tipoRelatorio === 'contas_pagas_recebidas') && (
                <View>
                  <Text style={styles.sectionTitle}>Contas pagas</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Data</Text>
                      <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Descrição</Text>
                      <Text style={[styles.tableCellHeader, { flex: 0.6 }]}>Origem</Text>
                      <Text style={[styles.tableCellHeaderRight, { flex: 1 }]}>Valor</Text>
                    </View>
                    {contasPagas.length === 0 ? (
                      <Text style={styles.emptyMessage}>Nenhuma conta paga no período.</Text>
                    ) : (
                      contasPagas.map((item) => (
                        <View key={`p-${item.id}`} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 0.8 }]}>
                            {formatarData(item.dataPrevista)}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.descricao}</Text>
                          <Text style={[styles.tableCell, { flex: 0.6 }]}>{item.origem}</Text>
                          <Text style={[styles.tableCellRight, { flex: 1 }]}>
                            {formatarValor(item.valor)}
                          </Text>
                        </View>
                      ))
                    )}
                    {contasPagas.length > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={[styles.tableCell, { flex: 2.9 }]}>Total contas pagas</Text>
                        <Text style={[styles.tableCellRight, { flex: 1 }]}>
                          {formatarValor(totalPagas)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

            {(tipoRelatorio === 'contas_recebidas' ||
              tipoRelatorio === 'contas_pagas_recebidas') && (
                <View>
                  <Text style={styles.sectionTitle}>Contas recebidas</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Data</Text>
                      <Text style={[styles.tableCellHeader, { flex: 1.2 }]}>Descrição</Text>
                      <Text style={[styles.tableCellHeader, { flex: 1 }]}>Cliente</Text>
                      <Text style={[styles.tableCellHeaderRight, { flex: 0.8 }]}>Valor</Text>
                    </View>
                    {contasRecebidas.length === 0 ? (
                      <Text style={styles.emptyMessage}>
                        Nenhuma conta recebida no período.
                      </Text>
                    ) : (
                      contasRecebidas.map((item) => (
                        <View key={`r-${item.id}`} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 0.8 }]}>
                            {formatarData(item.dataRecebimento)}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1.2 }]}>{item.descricao}</Text>
                          <Text style={[styles.tableCell, { flex: 1 }]}>{item.cliente}</Text>
                          <Text style={[styles.tableCellRight, { flex: 0.8 }]}>
                            {formatarValor(item.valor)}
                          </Text>
                        </View>
                      ))
                    )}
                    {contasRecebidas.length > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={[styles.tableCell, { flex: 3 }]}>
                          Total contas recebidas
                        </Text>
                        <Text style={[styles.tableCellRight, { flex: 0.8 }]}>
                          {formatarValor(totalRecebidas)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

            {tipoRelatorio === 'contas_pagas_recebidas' && (
              <View style={styles.resumoCard}>
                <View style={[styles.resumoItem, styles.resumoItemPago]}>
                  <Text style={styles.resumoLabel}>Total pago</Text>
                  <Text style={[styles.resumoValue, styles.resumoValuePago]}>
                    {formatarValor(totalPagas)}
                  </Text>
                </View>
                <View style={[styles.resumoItem, styles.resumoItemRecebido]}>
                  <Text style={styles.resumoLabel}>Total recebido</Text>
                  <Text style={[styles.resumoValue, styles.resumoValueRecebido]}>
                    {formatarValor(totalRecebidas)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {formatoRelatorio === 'resumido' && (
          <>
            {tipoRelatorio === 'contas_pagas' &&
              dataInicio &&
              dataFim &&
              totaisPorMesContasPagas.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Resumo por mês (Contas pagas)</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCellHeader, { flex: 2 }]}>Mês</Text>
                      <Text style={[styles.tableCellHeaderRight, { flex: 1 }]}>Total</Text>
                    </View>
                    {totaisPorMesContasPagas.map((row, i) => (
                      <View key={`sp-${i}`} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 2 }]}>{row.mesLabel}</Text>
                        <Text style={[styles.tableCellRight, { flex: 1 }]}>
                          {formatarValor(row.total)}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.totalRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>Total do período</Text>
                      <Text style={[styles.tableCellRight, { flex: 1 }]}>
                        {formatarValor(totalPagas)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

            {tipoRelatorio === 'contas_recebidas' &&
              dataInicio &&
              dataFim &&
              totaisPorMesContasRecebidas.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Resumo por mês (Contas recebidas)</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCellHeader, { flex: 2 }]}>Mês</Text>
                      <Text style={[styles.tableCellHeaderRight, { flex: 1 }]}>Total</Text>
                    </View>
                    {totaisPorMesContasRecebidas.map((row, i) => (
                      <View key={`sr-${i}`} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 2 }]}>{row.mesLabel}</Text>
                        <Text style={[styles.tableCellRight, { flex: 1 }]}>
                          {formatarValor(row.total)}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.totalRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>Total do período</Text>
                      <Text style={[styles.tableCellRight, { flex: 1 }]}>
                        {formatarValor(totalRecebidas)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

            {tipoRelatorio === 'contas_pagas_recebidas' &&
              dataInicio &&
              dataFim &&
              totaisPorMes.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Resumo por mês</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCellHeader, { flex: 1.2 }]}>Mês</Text>
                      <Text style={[styles.tableCellHeaderRight, { flex: 1 }]}>Pagas</Text>
                      <Text style={[styles.tableCellHeaderRight, { flex: 1 }]}>Recebidas</Text>
                      <Text style={[styles.tableCellHeaderRight, { flex: 0.8 }]}>Saldo</Text>
                    </View>
                    {totaisPorMes.map((row, i) => {
                      const saldo = row.totalRecebido - row.totalPago;
                      return (
                        <View key={`sm-${i}`} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 1.2 }]}>{row.mesLabel}</Text>
                          <Text style={[styles.tableCellRight, { flex: 1 }]}>
                            {formatarValor(row.totalPago)}
                          </Text>
                          <Text style={[styles.tableCellRight, { flex: 1 }]}>
                            {formatarValor(row.totalRecebido)}
                          </Text>
                          <Text style={[styles.tableCellRight, { flex: 0.8 }]}>
                            {formatarValor(saldo)}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={styles.totalRow}>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>Total do período</Text>
                      <Text style={[styles.tableCellRight, { flex: 1 }]}>
                        {formatarValor(totalPagas)}
                      </Text>
                      <Text style={[styles.tableCellRight, { flex: 1 }]}>
                        {formatarValor(totalRecebidas)}
                      </Text>
                      <Text style={[styles.tableCellRight, { flex: 0.8 }]}>
                        {formatarValor(totalRecebidas - totalPagas)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

            {(tipoRelatorio === 'contas_pagas' || tipoRelatorio === 'contas_recebidas') &&
              (!dataInicio || !dataFim) && (
                <View>
                  <Text style={styles.sectionTitle}>Total do período</Text>
                  <Text style={styles.resumoValue}>
                    {tipoRelatorio === 'contas_pagas'
                      ? formatarValor(totalPagas)
                      : formatarValor(totalRecebidas)}
                  </Text>
                </View>
              )}
          </>
        )}

        <Text style={styles.footer}>
          Relatório gerado em {new Date().toLocaleString('pt-BR')} — Sistema Construtivo
        </Text>
      </Page>
    </Document>
  );
};

export default PDFRelatorioConfiguravel;
