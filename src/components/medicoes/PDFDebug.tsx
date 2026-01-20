"use client";

import React from 'react';
import { Document, Page, Text, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { Medicao, ItemMedicao } from '@/lib/supabase';

// Estilos mínimos
const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  text: {
    fontSize: 12,
    marginBottom: 8,
  },
});

// Documento PDF ultra-simples - apenas texto estático + ID da medição
const DocumentoDebug: React.FC<{ medicao: Medicao; itens: ItemMedicao[] }> = ({ 
  medicao, 
  itens 
}) => {
  console.log('🔍 DocumentoDebug sendo renderizado...');
  console.log('📊 Dados da medição:', {
    id: medicao?.id,
    numero_ordem: medicao?.numero_ordem,
    temItens: !!itens,
    quantidadeItens: itens?.length
  });

  try {
    const medicaoId = medicao?.id || 'ID_NAO_ENCONTRADO';
    const numeroOrdem = medicao?.numero_ordem || 'NUMERO_NAO_ENCONTRADO';
    
    console.log('✅ Renderizando PDF com ID:', medicaoId);
    
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.text}>PDF DEBUG - ULTRA SIMPLES</Text>
          <Text style={styles.text}>Medição ID: {medicaoId}</Text>
          <Text style={styles.text}>Número: {numeroOrdem}</Text>
          <Text style={styles.text}>Data: {new Date().toISOString()}</Text>
        </Page>
      </Document>
    );
  } catch (error) {
    console.error('💥 ERRO na renderização do DocumentoDebug:', error);
    throw error; // Re-throw para que o PDFDownloadLink possa capturar
  }
};

// Componente principal
const PDFDebug: React.FC<{ 
  children: React.ReactNode;
  medicao: Medicao;
  itens: ItemMedicao[];
  onPDFReady?: (url: string) => void;
}> = ({ children, medicao, itens, onPDFReady }) => {
  console.log('🚀 PDFDebug iniciado');
  console.log('📝 Props recebidas:', {
    medicao: !!medicao,
    medicaoId: medicao?.id,
    itens: !!itens,
    quantidadeItens: itens?.length,
    children: !!children
  });

  // Verificar se estamos no lado do cliente
  if (typeof window === 'undefined') {
    console.log('🌐 Lado do servidor - retornando placeholder');
    return <span>Carregando PDF...</span>;
  }

  console.log('🌐 Lado do cliente - criando PDFDownloadLink');

  return (
    <PDFDownloadLink
      document={<DocumentoDebug medicao={medicao} itens={itens} />}
      fileName={`medicao-${medicao?.numero_ordem || medicao?.id || 'documento'}.pdf`}
    >
      {({ blob, url, loading, error }) => {
        console.log('📋 Estado do PDFDownloadLink:', {
          loading,
          temUrl: !!url,
          temBlob: !!blob,
          temErro: !!error,
          urlTipo: typeof url
        });

        if (error) {
          console.error('💥 ERRO no PDFDownloadLink:', error);
          return <span style={{ color: 'red' }}>Erro ao gerar PDF: {String(error)}</span>;
        }

        if (loading) {
          console.log('⏳ PDF sendo gerado...');
          return <span style={{ color: 'orange' }}>Gerando PDF...</span>;
        }

        if (url && onPDFReady) {
          console.log('✅ PDF pronto! Chamando callback com URL:', url);
          onPDFReady(url);
        }

        if (url) {
          console.log('✅ PDF pronto! URL gerada:', url);
          return children;
        }

        console.log('⚠️ Estado inesperado do PDFDownloadLink');
        return <span>Preparando PDF...</span>;
      }}
    </PDFDownloadLink>
  );
};

export default PDFDebug; 