"use client";

import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { Medicao, ItemMedicao } from '@/lib/supabase';

// Definindo estilos para o PDF em orientação horizontal
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: '30',
    fontSize: '10',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20',
    borderBottom: '2px solid #2563eb',
    paddingBottom: '15',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: '18',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '5',
  },
  subtitle: {
    fontSize: '12',
    color: '#64748b',
    marginBottom: '2',
  },
  headerInfo: {
    fontSize: '10',
    color: '#374151',
    marginBottom: '2',
  },
  statusAprovado: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '4',
    fontSize: '10',
    fontWeight: 'bold',
  },
  statusPendente: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4',
    fontSize: '10',
    fontWeight: 'bold',
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: '20',
    gap: '20',
  },
  infoColumn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: '15',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '12',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '10',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '5',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: '8',
  },
  infoLabel: {
    fontSize: '9',
    color: '#64748b',
    width: '35%',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: '10',
    color: '#1f2937',
    flex: 1,
  },
  tableSection: {
    marginBottom: '20',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    padding: '8',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: '9',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: '6',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: '6',
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: '8',
    color: '#374151',
    textAlign: 'center',
    padding: '2',
  },
  tableCellLeft: {
    fontSize: '8',
    color: '#374151',
    textAlign: 'left',
    padding: '2',
  },
  tableCellRight: {
    fontSize: '8',
    color: '#374151',
    textAlign: 'right',
    padding: '2',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    padding: '8',
  },
  totalText: {
    color: '#ffffff',
    fontSize: '10',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  signatureSection: {
    flexDirection: 'row',
    marginTop: '30',
    gap: '60',
    justifyContent: 'space-around',
  },
  signatureBox: {
    flex: 1,
    borderTop: '1px solid #374151',
    paddingTop: '10',
    textAlign: 'center',
    maxWidth: '40%',
  },
  signatureLabel: {
    fontSize: '10',
    color: '#374151',
    fontWeight: 'bold',
  },
  signatureSubLabel: {
    fontSize: '8',
    color: '#64748b',
    marginTop: '2',
  },
  footer: {
    position: 'absolute',
    bottom: '20',
    left: '30',
    right: '30',
    textAlign: 'center',
    fontSize: '8',
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '10',
  },
  valorDestaque: {
    fontSize: '12',
    fontWeight: 'bold',
    color: '#059669',
  },
});

// Componente do documento PDF
const DocumentoPDFMedicao: React.FC<{ medicao: Medicao; itens: ItemMedicao[] }> = ({ 
  medicao, 
  itens 
}) => {
  const formatarValor = (valor: number | null | undefined) => {
    try {
      if (valor === null || valor === undefined) return 'R$ 0,00';
      if (typeof valor !== 'number' || isNaN(valor)) return 'R$ 0,00';
      
      return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    } catch (error) {
      return 'R$ 0,00';
    }
  };

  const formatarData = (data: string | null) => {
    try {
      if (!data) return '-';
      
      if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = data.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        return dataObj.toLocaleDateString('pt-BR');
      }
      
      return new Date(data).toLocaleDateString('pt-BR');
    } catch (error) {
      return '-';
    }
  };

  const formatarPercentual = (valor: number | null | undefined) => {
    try {
      if (!valor && valor !== 0) return '0,00%';
      if (typeof valor !== 'number' || isNaN(valor)) return '0,00%';
      return `${valor.toFixed(2)}%`;
    } catch (error) {
      return '0,00%';
    }
  };

  const formatarQuantidade = (valor: number | null | undefined) => {
    try {
      if (!valor && valor !== 0) return '0';
      if (typeof valor !== 'number' || isNaN(valor)) return '0';
      return String(valor);
    } catch (error) {
      return '0';
    }
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>BOLETIM DE MEDIÇÃO</Text>
            <Text style={styles.subtitle}>Sistema de Controle de Obras - Construtivo</Text>
            <Text style={styles.headerInfo}>
              Medição Nº {String(medicao?.numero_ordem || 1)} - {medicao?.negociacao?.numero || 'N/A'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerInfo}>
              Data de Geração: {new Date().toLocaleDateString('pt-BR')}
            </Text>
            <Text style={styles.headerInfo}>
              Período: {formatarData(medicao?.data_inicio)} a {formatarData(medicao?.data_fim)}
            </Text>
            <View style={(medicao?.status === 'Aprovado') ? styles.statusAprovado : styles.statusPendente}>
              <Text>{String((medicao?.status || 'Pendente')).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Seção de Informações */}
        <View style={styles.infoSection}>
          {/* Informações da Obra */}
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>INFORMAÇÕES DA OBRA</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Obra:</Text>
              <Text style={styles.infoValue}>{medicao?.negociacao?.obra || 'Não informado'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contrato:</Text>
              <Text style={styles.infoValue}>{medicao?.negociacao?.numero || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>{medicao?.negociacao?.tipo || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Descrição:</Text>
              <Text style={styles.infoValue}>{medicao?.negociacao?.descricao || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Eng. Responsável:</Text>
              <Text style={styles.infoValue}>
                {medicao?.negociacao?.engenheiro_responsavel || 'Não informado'}
              </Text>
            </View>
          </View>

          {/* Informações do Fornecedor */}
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>DADOS DO FORNECEDOR</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{medicao?.negociacao?.fornecedor?.nome || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Código:</Text>
              <Text style={styles.infoValue}>{medicao?.negociacao?.fornecedor?.codigo || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documento:</Text>
              <Text style={styles.infoValue}>{medicao?.negociacao?.fornecedor?.documento || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contato:</Text>
              <Text style={styles.infoValue}>
                {medicao?.negociacao?.fornecedor?.contato || 'Não informado'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>
                {medicao?.negociacao?.fornecedor?.telefone || 'Não informado'}
              </Text>
            </View>
          </View>

          {/* Resumo da Medição */}
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>RESUMO DA MEDIÇÃO</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Período:</Text>
              <Text style={styles.infoValue}>
                {formatarData(medicao?.data_inicio)} a {formatarData(medicao?.data_fim)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{medicao?.status || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Itens Medidos:</Text>
              <Text style={styles.infoValue}>{String(itens?.length || 0)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Observações:</Text>
              <Text style={styles.infoValue}>
                {medicao?.observacao || 'Nenhuma observação'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valor Total:</Text>
              <Text style={[styles.infoValue, styles.valorDestaque]}>
                {formatarValor(medicao?.valor_total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabela de Itens */}
        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>ITENS DA MEDIÇÃO</Text>
          
          {/* Cabeçalho da tabela */}
                  <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: '30%', textAlign: 'left' }]}>DESCRIÇÃO</Text>
          <Text style={[styles.tableHeaderText, { width: '8%' }]}>UNID.</Text>
          <Text style={[styles.tableHeaderText, { width: '10%', textAlign: 'right' }]}>QTD. TOTAL</Text>
          <Text style={[styles.tableHeaderText, { width: '10%', textAlign: 'right' }]}>QTD. MEDIDA</Text>
          <Text style={[styles.tableHeaderText, { width: '10%', textAlign: 'right' }]}>% EXEC.</Text>
          <Text style={[styles.tableHeaderText, { width: '12%', textAlign: 'right' }]}>VLR. UNIT.</Text>
          <Text style={[styles.tableHeaderText, { width: '12%', textAlign: 'right' }]}>VLR. TOTAL</Text>
        </View>

                     {/* Linhas da tabela */}
           {itens && itens.length > 0 ? itens.map((item, index) => (
             <View key={`item-${item?.id || index}`} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
               <Text style={[styles.tableCellLeft, { width: '30%' }]}>{String(item?.descricao || 'N/A')}</Text>
               <Text style={[styles.tableCell, { width: '8%' }]}>{String(item?.unidade || 'UN')}</Text>
               <Text style={[styles.tableCellRight, { width: '10%' }]}>{formatarQuantidade(item?.quantidade_total)}</Text>
               <Text style={[styles.tableCellRight, { width: '10%' }]}>{formatarQuantidade(item?.quantidade_medida)}</Text>
               <Text style={[styles.tableCellRight, { width: '10%' }]}>
                 {formatarPercentual(item?.percentual_executado)}
               </Text>
               <Text style={[styles.tableCellRight, { width: '12%' }]}>
                 {formatarValor(item?.valor_unitario)}
               </Text>
               <Text style={[styles.tableCellRight, { width: '12%' }]}>
                 {formatarValor(item?.valor_total)}
               </Text>
             </View>
           )) : (
             <View style={styles.tableRow}>
               <Text style={[styles.tableCell, { width: '100%' }]}>Nenhum item encontrado</Text>
             </View>
           )}

          {/* Linha de total */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalText, { width: '88%' }]}>TOTAL DA MEDIÇÃO:</Text>
            <Text style={[styles.totalText, { width: '12%' }]}>
              {formatarValor(medicao?.valor_total)}
            </Text>
          </View>

          {/* Desconto, se houver */}
          {(medicao?.desconto && Number(medicao.desconto) > 0) ? (
            <>
              <View style={[styles.tableRow, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.tableCellRight, { width: '88%', color: '#dc2626' }]}>
                  DESCONTO:
                </Text>
                <Text style={[styles.tableCellRight, { width: '12%', color: '#dc2626' }]}>
                  -{formatarValor(medicao.desconto)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalText, { width: '88%' }]}>TOTAL COM DESCONTO:</Text>
                <Text style={[styles.totalText, { width: '12%' }]}>
                  {formatarValor((medicao?.valor_total || 0) - (medicao?.desconto || 0))}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Seção de Assinaturas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>RESPONSÁVEL TÉCNICO</Text>
            <Text style={styles.signatureSubLabel}>
              {medicao?.negociacao?.engenheiro_responsavel || '______________________________'}
            </Text>
            <Text style={styles.signatureSubLabel}>Data: ___/___/______</Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>FORNECEDOR</Text>
            <Text style={styles.signatureSubLabel}>
              {medicao?.negociacao?.fornecedor?.nome || '______________________________'}
            </Text>
            <Text style={styles.signatureSubLabel}>Data: ___/___/______</Text>
          </View>
        </View>

        {/* Rodapé */}
        <Text style={styles.footer}>
          Documento gerado automaticamente pelo Sistema Construtivo - {new Date().toLocaleString('pt-BR')}
        </Text>
      </Page>
    </Document>
  );
};

// Componente principal para visualização e download do PDF
interface PDFMedicaoProps {
  medicao: Medicao;
  itens: ItemMedicao[];
  children: React.ReactNode;
  onPDFReady?: (url: string) => void;
}

const PDFMedicao: React.FC<PDFMedicaoProps> = ({ medicao, itens, children, onPDFReady }) => {
  const urlPDFRef = React.useRef<string | null>(null);

  console.log('🎉 PDFMedicao COMPLETO renderizado com:', { 
    medicao: !!medicao, 
    itens: itens?.length || 0,
    numeroOrdem: medicao?.numero_ordem,
    contratoNumero: medicao?.negociacao?.numero
  });
  
  // Verificar se estamos no lado do cliente
  if (typeof window === 'undefined') {
    console.log('🌐 PDFMedicao: lado do servidor - retornando placeholder');
    return <span>Carregando PDF...</span>;
  }
  
  const nomeArquivo = `medicao_${medicao?.negociacao?.numero?.replace(/\//g, '_')}_${String(medicao?.numero_ordem || 1)}.pdf`;

  return (
    <PDFDownloadLink
      document={<DocumentoPDFMedicao medicao={medicao} itens={itens} />}
      fileName={nomeArquivo}
    >
      {({ loading, url, error, blob }) => {
        console.log('📋 PDFMedicao - Estado do PDFDownloadLink:', { 
          loading, 
          temUrl: !!url, 
          temBlob: !!blob,
          temErro: !!error,
          nomeArquivo
        });
        
        if (error) {
          console.error('💥 ERRO no PDFMedicao:', error);
          return <span style={{ color: 'red' }}>Erro ao gerar PDF: {String(error)}</span>;
        }
        
        if (loading) {
          console.log('⏳ PDFMedicao sendo gerado...');
          return <span style={{ color: 'orange' }}>Gerando PDF da medição...</span>;
        }
        
        // Usar ref para evitar setState durante render, mas ainda chamar callback
        if (url && url !== urlPDFRef.current && onPDFReady) {
          urlPDFRef.current = url;
          console.log('✅ PDFMedicao pronto! Chamando callback com URL:', url);
          // Usar um microtask para chamar fora do render
          Promise.resolve().then(() => onPDFReady(url));
        }
        
        if (url) {
          console.log('✅ PDFMedicao pronto! URL gerada:', url);
          return children;
        }
        
        console.log('⚠️ Estado inesperado do PDFMedicao');
        return <span>Preparando PDF da medição...</span>;
      }}
    </PDFDownloadLink>
  );
};

export default PDFMedicao;