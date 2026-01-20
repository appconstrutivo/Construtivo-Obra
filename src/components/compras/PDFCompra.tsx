"use client";

import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { PedidoCompra, ItemPedidoCompra, ParcelaPedidoCompra } from '@/lib/supabase';

// Definindo estilos para o PDF
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
  parcelasSection: {
    marginBottom: '20',
    backgroundColor: '#fefbf3',
    border: '1px solid #f59e0b',
    padding: '15',
  },
  parcelasTitle: {
    fontSize: '12',
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: '10',
    textAlign: 'center',
  },
});

// Componente do documento PDF
const DocumentoPDFCompra: React.FC<{ 
  pedido: PedidoCompra; 
  itens: ItemPedidoCompra[];
  parcelas: ParcelaPedidoCompra[];
  obraInfo?: { nome: string; endereco: string; responsavel_tecnico: string } | null;
}> = ({ 
  pedido, 
  itens,
  parcelas,
  obraInfo
}) => {
  // Verificações de segurança
  if (!pedido) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Erro: Dados do pedido não encontrados</Text>
        </Page>
      </Document>
    );
  }
  const formatarValor = (valor: number | null | undefined) => {
    try {
      if (valor === null || valor === undefined) return 'R$ 0,00';
      if (typeof valor !== 'number' || isNaN(valor)) return 'R$ 0,00';
      
      return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (error) {
      console.error('Erro ao formatar valor:', error);
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
      console.error('Erro ao formatar data:', error);
      return '-';
    }
  };

  const formatarQuantidade = (valor: number | null | undefined) => {
    try {
      if (valor === null || valor === undefined) return '0';
      if (typeof valor !== 'number' || isNaN(valor)) return '0';
      
      return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (error) {
      console.error('Erro ao formatar quantidade:', error);
      return '0';
    }
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>PEDIDO DE COMPRA #{pedido?.numero_ordem || 'N/A'}</Text>
            <Text style={styles.subtitle}>Sistema de Controle de Obras - Construtivo</Text>
            <Text style={styles.headerInfo}>Data de Compra: {formatarData(pedido?.data_compra || null)}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={pedido?.status === 'Aprovado' ? styles.statusAprovado : styles.statusPendente}>
              <Text>{pedido?.status || 'Pendente'}</Text>
            </View>
            <Text style={styles.valorDestaque}>
              {formatarValor(pedido?.valor_total || 0)}
            </Text>
          </View>
        </View>

        {/* Seção de Informações */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>DADOS DO FORNECEDOR</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Razão Social:</Text>
              <Text style={styles.infoValue}>{pedido?.fornecedor?.nome || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documento:</Text>
              <Text style={styles.infoValue}>{pedido?.fornecedor?.documento || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contato:</Text>
              <Text style={styles.infoValue}>{pedido?.fornecedor?.contato || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>{pedido?.fornecedor?.telefone || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-mail:</Text>
              <Text style={styles.infoValue}>{pedido?.fornecedor?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>DADOS DA OBRA</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome da Obra:</Text>
              <Text style={styles.infoValue}>{obraInfo?.nome || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Endereço:</Text>
              <Text style={styles.infoValue}>{obraInfo?.endereco || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Responsável Técnico:</Text>
              <Text style={styles.infoValue}>{obraInfo?.responsavel_tecnico || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status do Pedido:</Text>
              <Text style={styles.infoValue}>{pedido?.status || 'Pendente'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Observações:</Text>
              <Text style={styles.infoValue}>{pedido?.observacoes || 'Nenhuma observação'}</Text>
            </View>
          </View>
        </View>

        {/* Tabela de Itens */}
        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>ITENS DO PEDIDO DE COMPRA</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: '40%', textAlign: 'left' }]}>DESCRIÇÃO</Text>
            <Text style={[styles.tableHeaderText, { width: '10%' }]}>UNID.</Text>
            <Text style={[styles.tableHeaderText, { width: '12%', textAlign: 'right' }]}>QUANTIDADE</Text>
            <Text style={[styles.tableHeaderText, { width: '18%', textAlign: 'right' }]}>VLR. UNITÁRIO</Text>
            <Text style={[styles.tableHeaderText, { width: '20%', textAlign: 'right' }]}>VLR. TOTAL</Text>
          </View>

          {Array.isArray(itens) && itens.length > 0 ? itens.map((item, index) => (
            <View key={`item-${item?.id || index}`} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellLeft, { width: '40%' }]}>{String(item?.descricao || 'N/A')}</Text>
              <Text style={[styles.tableCell, { width: '10%' }]}>{String(item?.unidade || 'UN')}</Text>
              <Text style={[styles.tableCellRight, { width: '12%' }]}>{formatarQuantidade(item?.quantidade)}</Text>
              <Text style={[styles.tableCellRight, { width: '18%' }]}>
                {formatarValor(item?.valor_unitario)}
              </Text>
              <Text style={[styles.tableCellRight, { width: '20%' }]}>
                {formatarValor(item?.valor_total)}
              </Text>
            </View>
          )) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%' }]}>Nenhum item encontrado</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={[styles.totalText, { width: '80%' }]}>VALOR TOTAL DO PEDIDO:</Text>
            <Text style={[styles.totalText, { width: '20%' }]}>
              {formatarValor(pedido?.valor_total || 0)}
            </Text>
          </View>
        </View>

        {/* Seção de Previsão de Desembolso */}
        {Array.isArray(parcelas) && parcelas.length > 0 && (
          <View style={styles.parcelasSection}>
            <Text style={styles.parcelasTitle}>PREVISÃO DE DESEMBOLSO</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: '25%', textAlign: 'left' }]}>DATA PREVISTA</Text>
              <Text style={[styles.tableHeaderText, { width: '30%', textAlign: 'right' }]}>VALOR</Text>
              <Text style={[styles.tableHeaderText, { width: '45%', textAlign: 'left' }]}>DESCRIÇÃO</Text>
            </View>
            {parcelas.map((parcela, index) => (
              <View key={`parcela-${parcela?.id || index}`} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCellLeft, { width: '25%' }]}>{formatarData(parcela?.data_prevista || null)}</Text>
                <Text style={[styles.tableCellRight, { width: '30%', paddingRight: '10' }]}>{formatarValor(parcela?.valor || 0)}</Text>
                <Text style={[styles.tableCellLeft, { width: '45%', paddingLeft: '10' }]}>{parcela?.descricao || 'Pagamento programado'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Seção de Assinaturas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>RESPONSÁVEL TÉCNICO</Text>
            <Text style={styles.signatureSubLabel}>
              {obraInfo?.responsavel_tecnico || '______________________________'}
            </Text>
            <Text style={styles.signatureSubLabel}>Data: ___/___/______</Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>FORNECEDOR</Text>
            <Text style={styles.signatureSubLabel}>
              {pedido?.fornecedor?.nome || '______________________________'}
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

// Interface das props do componente
interface PDFCompraProps {
  pedido: PedidoCompra;
  itens: ItemPedidoCompra[];
  parcelas: ParcelaPedidoCompra[];
  obraInfo?: { nome: string; endereco: string; responsavel_tecnico: string } | null;
  children: React.ReactNode;
  onPDFReady?: (url: string) => void;
}

// Componente principal
const PDFCompra: React.FC<PDFCompraProps> = ({ 
  pedido, 
  itens, 
  parcelas,
  obraInfo,
  children, 
  onPDFReady 
}) => {
  const fileName = `pedido_compra_${pedido?.numero_ordem || 'N/A'}.pdf`;

  // Verificação de segurança antes de renderizar
  if (!pedido) {
    console.log('PDFCompra: Pedido não disponível');
    return <span>Carregando dados...</span>;
  }

  return (
    <PDFDownloadLink 
      document={
        <DocumentoPDFCompra 
          pedido={pedido} 
          itens={Array.isArray(itens) ? itens : []}
          parcelas={Array.isArray(parcelas) ? parcelas : []}
          obraInfo={obraInfo}
        />
      } 
      fileName={fileName}
    >
      {({ blob, url, loading, error }) => {
        console.log('PDFCompra Status:', { 
          blob: !!blob, 
          url: !!url, 
          loading, 
          error,
          pedido: !!pedido,
          itensLength: Array.isArray(itens) ? itens.length : 0,
          parcelasLength: Array.isArray(parcelas) ? parcelas.length : 0
        });
        
        if (url && onPDFReady && !loading) {
          console.log('PDFCompra pronto, chamando callback com URL:', url);
          setTimeout(() => onPDFReady(url), 100);
        }

        if (loading) {
          return <span>Gerando PDF...</span>;
        }

        if (error) {
          console.error('Erro ao gerar PDF de compra:', error);
          console.error('Detalhes do erro:', {
            error,
            pedido: pedido ? 'OK' : 'NULL',
            itens: Array.isArray(itens) ? `${itens.length} itens` : 'INVALID',
            parcelas: Array.isArray(parcelas) ? `${parcelas.length} parcelas` : 'INVALID'
          });
          return <span>Erro ao gerar PDF</span>;
        }

        return children;
      }}
    </PDFDownloadLink>
  );
};

export default PDFCompra; 