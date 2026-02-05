'use client';

/**
 * Componente PDF do Orçamento - @react-pdf/renderer
 * Formatos: resumido (só itens) | analitico_com_item (com detalhamento por composição)
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { OrcamentoDocumento, OrcamentoGrupo, OrcamentoItem } from '@/lib/supabase';
import type { ItemDetalhamento } from '@/lib/supabase';

export type FormatoPDFOrcamento = 'resumido' | 'analitico' | 'analitico_com_item';

export type DetalhamentoComposicaoPDF = {
  itens: ItemDetalhamento[];
  precosPorItem: Record<string, number>;
};

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 16,
    borderBottom: '2px solid #1e40af',
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  headerLabel: {
    width: '28%',
    fontSize: 8,
    color: '#64748b',
    fontWeight: 'bold',
  },
  headerValue: {
    flex: 1,
    fontSize: 9,
    color: '#1f2937',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 12,
    marginBottom: 6,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 4,
  },
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    padding: 5,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 4,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 4,
    backgroundColor: '#f9fafb',
  },
  cellCodigo: { width: '12%', fontSize: 7 },
  cellDescricao: { flex: 1, fontSize: 7 },
  cellUn: { width: '8%', fontSize: 7, textAlign: 'right' },
  cellQtd: { width: '10%', fontSize: 7, textAlign: 'right' },
  cellPreco: { width: '14%', fontSize: 7, textAlign: 'right' },
  cellTotal: { width: '14%', fontSize: 7, textAlign: 'right' },
  detalheRow: {
    flexDirection: 'row',
    paddingLeft: 12,
    paddingVertical: 2,
    borderBottom: '1px solid #f3f4f6',
    fontSize: 6,
  },
  resumo: {
    marginTop: 16,
    border: '1px solid #e5e7eb',
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  resumoLabel: { fontSize: 9, color: '#64748b', width: 140, textAlign: 'right' },
  resumoValor: { fontSize: 9, color: '#1f2937', width: 90, textAlign: 'right' },
  resumoTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '2px solid #1e40af',
  },
  resumoTotalLabel: { fontSize: 11, fontWeight: 'bold', color: '#1e40af', width: 140, textAlign: 'right' },
  resumoTotalValor: { fontSize: 11, fontWeight: 'bold', color: '#1e40af', width: 90, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
  },
});

function formatarValor(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'R$ 0,00';
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(s: string | null | undefined): string {
  if (!s) return '-';
  try {
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [y, m, d] = s.slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
    }
    return new Date(s).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

export interface PDFOrcamentoProps {
  formato: FormatoPDFOrcamento;
  orcamento: OrcamentoDocumento;
  grupos: OrcamentoGrupo[];
  itens: OrcamentoItem[];
  detalhamentoPorComposicao?: Record<string, DetalhamentoComposicaoPDF>;
}

const PDFOrcamento: React.FC<PDFOrcamentoProps> = ({
  formato,
  orcamento,
  grupos,
  itens,
  detalhamentoPorComposicao = {},
}) => {
  const itensPorGrupo = React.useMemo(() => {
    const map: Record<number, OrcamentoItem[]> = {};
    for (const g of grupos) map[g.id] = [];
    for (const it of itens) {
      if (map[it.orcamento_grupo_id]) map[it.orcamento_grupo_id].push(it);
    }
    grupos.forEach((g) => (map[g.id] = (map[g.id] || []).sort((a, b) => a.id - b.id)));
    return map;
  }, [grupos, itens]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>ORÇAMENTO DE OBRA</Text>
          <Text style={styles.subtitle}>
            Nº {orcamento.numero ?? orcamento.id} — {orcamento.obra_nome ?? 'Sem título'}
          </Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Cliente:</Text>
            <Text style={styles.headerValue}>{orcamento.cliente ?? '-'}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Endereço:</Text>
            <Text style={styles.headerValue}>{orcamento.endereco ?? '-'}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Emissão / Validade:</Text>
            <Text style={styles.headerValue}>
              {formatarData(orcamento.data_emissao)} — {formatarData(orcamento.data_validade)}
            </Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Responsável técnico / CREA:</Text>
            <Text style={styles.headerValue}>
              {orcamento.responsavel_tecnico ?? '-'} {orcamento.crea ? ` / ${orcamento.crea}` : ''}
            </Text>
          </View>
        </View>

        {grupos
          .sort((a, b) => a.ordem - b.ordem)
          .map((grupo) => {
            const itensGrupo = itensPorGrupo[grupo.id] ?? [];
            return (
              <View key={grupo.id}>
                <Text style={styles.sectionTitle}>
                  {grupo.codigo} — {grupo.descricao}
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.cellCodigo]}>Código</Text>
                    <Text style={[styles.tableHeaderText, styles.cellDescricao]}>Descrição</Text>
                    <Text style={[styles.tableHeaderText, styles.cellUn]}>Un.</Text>
                    <Text style={[styles.tableHeaderText, styles.cellQtd]}>Quant.</Text>
                    <Text style={[styles.tableHeaderText, styles.cellPreco]}>Preço Unit.</Text>
                    <Text style={[styles.tableHeaderText, styles.cellTotal]}>Total</Text>
                  </View>
                  {itensGrupo.map((item, idx) => {
                    const det = item.codigo ? detalhamentoPorComposicao[item.codigo.trim()] : null;
                    const showDetalhe = formato === 'analitico_com_item' && det && det.itens.length > 0;
                    return (
                      <View key={item.id}>
                        <View style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                          <Text style={styles.cellCodigo}>{item.codigo ?? '-'}</Text>
                          <Text style={styles.cellDescricao}>{item.descricao}</Text>
                          <Text style={styles.cellUn}>{item.unidade}</Text>
                          <Text style={styles.cellQtd}>{item.quantidade.toLocaleString('pt-BR')}</Text>
                          <Text style={styles.cellPreco}>{formatarValor(item.preco_unitario)}</Text>
                          <Text style={styles.cellTotal}>{formatarValor(item.total)}</Text>
                        </View>
                        {showDetalhe &&
                          det.itens.map((d) => (
                            <View key={`${item.id}-${d.id}-${d.codigo_item}`} style={styles.detalheRow}>
                              <Text style={{ flex: 1 }}>{d.codigo_item} — {d.descricao}</Text>
                              <Text>{d.unidade_medida} x {d.coeficiente.toLocaleString('pt-BR')} = {formatarValor((det.precosPorItem[d.codigo_item] ?? 0) * d.coeficiente)}</Text>
                            </View>
                          ))}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

        <View style={styles.resumo}>
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Custo direto:</Text>
            <Text style={styles.resumoValor}>{formatarValor(orcamento.total_direto)}</Text>
          </View>
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>BDI ({Number(orcamento.percentual_bdi).toFixed(2)}%):</Text>
            <Text style={styles.resumoValor}>{formatarValor(orcamento.valor_bdi)}</Text>
          </View>
          <View style={styles.resumoTotal}>
            <Text style={styles.resumoTotalLabel}>Total (com BDI):</Text>
            <Text style={styles.resumoTotalValor}>{formatarValor(orcamento.total_com_bdi)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Documento gerado pelo Construtivo Obra — {new Date().toLocaleDateString('pt-BR')}
        </Text>
      </Page>
    </Document>
  );
};

export default PDFOrcamento;
