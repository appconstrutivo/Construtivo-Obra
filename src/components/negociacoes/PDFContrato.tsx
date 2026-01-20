import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { Negociacao, ItemNegociacao, ParcelaPagamento, Fornecedor } from '@/lib/supabase';

// Tipos para props do componente
type ContratoData = Negociacao & {
  fornecedor?: Fornecedor;
};

// Estilos para o PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: '20',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20',
    paddingBottom: '15',
    borderBottom: '2px solid #3b82f6',
  },
  headerLeft: {
    flex: 2,
  },
  headerRight: {
    flex: 1,
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
    marginBottom: '8',
  },
  headerInfo: {
    fontSize: '10',
    color: '#374151',
  },
  statusAprovado: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    paddingTop: '5',
    paddingRight: '10',
    paddingBottom: '5',
    paddingLeft: '10',
    borderRadius: '4',
    fontSize: '9',
    fontWeight: 'bold',
    marginBottom: '8',
  },
  statusPendente: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    paddingTop: '5',
    paddingRight: '10',
    paddingBottom: '5',
    paddingLeft: '10',
    borderRadius: '4',
    fontSize: '9',
    fontWeight: 'bold',
    marginBottom: '8',
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
    borderRadius: '6',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '12',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '12',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: '6',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: '9',
    fontWeight: 'bold',
    color: '#374151',
    width: '35%',
    marginRight: '8',
  },
  infoValue: {
    fontSize: '9',
    color: '#1f2937',
    flex: 1,
    flexWrap: 'wrap',
  },
  tableSection: {
    marginBottom: '20',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    padding: '8',
    borderTopLeftRadius: '4',
    borderTopRightRadius: '4',
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: '9',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '6',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: '6',
    borderBottom: '1px solid #e5e7eb',
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
const DocumentoPDFContrato: React.FC<{ 
  contrato: ContratoData; 
  itens: ItemNegociacao[];
  parcelas: ParcelaPagamento[];
  obraInfo?: { nome: string; endereco: string; responsavel_tecnico: string } | null;
}> = ({ 
  contrato, 
  itens,
  parcelas,
  obraInfo
}) => {
  // Verificações de segurança robustas
  if (!contrato || typeof contrato !== 'object') {
    console.error('PDFContrato: Dados do contrato inválidos ou ausentes', contrato);
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Erro: Dados do contrato não encontrados ou inválidos</Text>
        </Page>
      </Document>
    );
  }

  // Validação e sanitização dos dados
  const contratoSeguro = {
    numero: contrato.numero || 'N/A',
    data_inicio: contrato.data_inicio || null,
    data_fim: contrato.data_fim || null,
    tipo: contrato.tipo || 'Contrato',
    valor_total: typeof contrato.valor_total === 'number' ? contrato.valor_total : 0,
    descricao: contrato.descricao || 'Nenhuma descrição',
    obra: contrato.obra || '',
    engenheiro_responsavel: contrato.engenheiro_responsavel || '',
    fornecedor: contrato.fornecedor || null
  };

  // Validação dos itens
  const itensSeguro = Array.isArray(itens) 
    ? itens.filter(item => item && typeof item === 'object').map(item => ({
        id: item.id || Math.random(),
        descricao: String(item.descricao || 'N/A'),
        unidade: String(item.unidade || 'UN'),
        quantidade: typeof item.quantidade === 'number' ? item.quantidade : 0,
        valor_unitario: typeof item.valor_unitario === 'number' ? item.valor_unitario : 0,
        valor_total: typeof item.valor_total === 'number' ? item.valor_total : 0
      }))
    : [];

  // Validação das parcelas
  const parcelasSeguras = Array.isArray(parcelas) 
    ? parcelas.filter(parcela => parcela && typeof parcela === 'object').map(parcela => ({
        id: parcela.id || Math.random(),
        data_prevista: parcela.data_prevista || null,
        valor: typeof parcela.valor === 'number' ? parcela.valor : 0,
        descricao: String(parcela.descricao || 'Pagamento programado')
      }))
    : [];

  // Validação dos dados da obra
  const obraSegura = obraInfo && typeof obraInfo === 'object' ? {
    nome: String(obraInfo.nome || ''),
    endereco: String(obraInfo.endereco || ''),
    responsavel_tecnico: String(obraInfo.responsavel_tecnico || '')
  } : null;

  const formatarValor = (valor: number | null | undefined) => {
    try {
      if (valor === null || valor === undefined || typeof valor !== 'number' || isNaN(valor)) {
        return 'R$ 0,00';
      }
      
      return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (error) {
      console.error('Erro ao formatar valor:', error, 'Valor recebido:', valor);
      return 'R$ 0,00';
    }
  };

  const formatarData = (data: string | null) => {
    try {
      if (!data || typeof data !== 'string') return '-';
      
      if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = data.split('-').map(Number);
        if (!ano || !mes || !dia) return '-';
        const dataObj = new Date(ano, mes - 1, dia);
        if (isNaN(dataObj.getTime())) return '-';
        return dataObj.toLocaleDateString('pt-BR');
      }
      
      const dataObj = new Date(data);
      if (isNaN(dataObj.getTime())) return '-';
      return dataObj.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error, 'Data recebida:', data);
      return '-';
    }
  };

  const formatarQuantidade = (valor: number | null | undefined) => {
    try {
      if (valor === null || valor === undefined || typeof valor !== 'number' || isNaN(valor)) {
        return '0,00';
      }
      
      return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (error) {
      console.error('Erro ao formatar quantidade:', error, 'Valor recebido:', valor);
      return '0,00';
    }
  };

  const formatarTexto = (texto: any): string => {
    if (texto === null || texto === undefined) return '';
    return String(texto);
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>CONTRATO #{formatarTexto(contratoSeguro.numero)}</Text>
            <Text style={styles.subtitle}>Sistema de Controle de Obras - Construtivo</Text>
            <Text style={styles.headerInfo}>Data de Início: {formatarData(contratoSeguro.data_inicio)}</Text>
            {contratoSeguro.data_fim && (
              <Text style={styles.headerInfo}>Data de Término: {formatarData(contratoSeguro.data_fim)}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusAprovado}>
              <Text>{formatarTexto(contratoSeguro.tipo)}</Text>
            </View>
            <Text style={styles.valorDestaque}>
              {formatarValor(contratoSeguro.valor_total)}
            </Text>
          </View>
        </View>

        {/* Informações do Contratado e Obra */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>DADOS DO CONTRATADO</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Razão Social:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(contratoSeguro.fornecedor?.nome) || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documento:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(contratoSeguro.fornecedor?.documento) || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contato:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(contratoSeguro.fornecedor?.contato) || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(contratoSeguro.fornecedor?.telefone) || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-mail:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(contratoSeguro.fornecedor?.email) || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>DADOS DA OBRA</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome da Obra:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(contratoSeguro.obra) || formatarTexto(obraSegura?.nome) || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Endereço:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(obraSegura?.endereco) || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Responsável Técnico:</Text>
              <Text style={styles.infoValue}>
                {formatarTexto(contratoSeguro.engenheiro_responsavel) || formatarTexto(obraSegura?.responsavel_tecnico) || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo de Contrato:</Text>
              <Text style={styles.infoValue}>{formatarTexto(contratoSeguro.tipo)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Descrição:</Text>
              <Text style={styles.infoValue}>{formatarTexto(contratoSeguro.descricao)}</Text>
            </View>
          </View>
        </View>

        {/* Tabela de Itens */}
        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>ITENS DO CONTRATO</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: '40%', textAlign: 'left' }]}>DESCRIÇÃO</Text>
            <Text style={[styles.tableHeaderText, { width: '10%' }]}>UNID.</Text>
            <Text style={[styles.tableHeaderText, { width: '12%', textAlign: 'right' }]}>QUANTIDADE</Text>
            <Text style={[styles.tableHeaderText, { width: '18%', textAlign: 'right' }]}>VLR. UNITÁRIO</Text>
            <Text style={[styles.tableHeaderText, { width: '20%', textAlign: 'right' }]}>VLR. TOTAL</Text>
          </View>

          {itensSeguro.length > 0 ? itensSeguro.map((item, index) => (
            <View key={`item-${item.id}-${index}`} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellLeft, { width: '40%' }]}>{item.descricao}</Text>
              <Text style={[styles.tableCell, { width: '10%' }]}>{item.unidade}</Text>
              <Text style={[styles.tableCellRight, { width: '12%' }]}>{formatarQuantidade(item.quantidade)}</Text>
              <Text style={[styles.tableCellRight, { width: '18%' }]}>{formatarValor(item.valor_unitario)}</Text>
              <Text style={[styles.tableCellRight, { width: '20%' }]}>{formatarValor(item.valor_total)}</Text>
            </View>
          )) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%' }]}>Nenhum item encontrado</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={[styles.totalText, { width: '80%' }]}>VALOR TOTAL DO CONTRATO:</Text>
            <Text style={[styles.totalText, { width: '20%' }]}>
              {formatarValor(contratoSeguro.valor_total)}
            </Text>
          </View>
        </View>

        {/* Seção de Cronograma de Pagamentos */}
        {parcelasSeguras.length > 0 && (
          <View style={styles.parcelasSection}>
            <Text style={styles.parcelasTitle}>CRONOGRAMA DE PAGAMENTOS</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: '25%', textAlign: 'left' }]}>DATA PREVISTA</Text>
              <Text style={[styles.tableHeaderText, { width: '30%', textAlign: 'right' }]}>VALOR</Text>
              <Text style={[styles.tableHeaderText, { width: '45%', textAlign: 'left' }]}>DESCRIÇÃO</Text>
            </View>
            {parcelasSeguras.map((parcela, index) => (
              <View key={`parcela-${parcela.id}-${index}`} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCellLeft, { width: '25%' }]}>{formatarData(parcela.data_prevista)}</Text>
                <Text style={[styles.tableCellRight, { width: '30%', paddingRight: '10' }]}>{formatarValor(parcela.valor)}</Text>
                <Text style={[styles.tableCellLeft, { width: '45%', paddingLeft: '10' }]}>{parcela.descricao}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Seção de Assinaturas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>CONTRATANTE</Text>
            <Text style={styles.signatureSubLabel}>
              {formatarTexto(contratoSeguro.engenheiro_responsavel) || formatarTexto(obraSegura?.responsavel_tecnico) || '______________________________'}
            </Text>
            <Text style={styles.signatureSubLabel}>Data: ___/___/______</Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>CONTRATADO</Text>
            <Text style={styles.signatureSubLabel}>
              {formatarTexto(contratoSeguro.fornecedor?.nome) || '______________________________'}
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
interface PDFContratoProps {
  contrato: ContratoData;
  itens: ItemNegociacao[];
  parcelas: ParcelaPagamento[];
  obraInfo?: { nome: string; endereco: string; responsavel_tecnico: string } | null;
  children: React.ReactNode;
  onPDFReady?: (url: string) => void;
}

// Componente principal
const PDFContrato: React.FC<PDFContratoProps> = ({ 
  contrato, 
  itens, 
  parcelas,
  obraInfo,
  children, 
  onPDFReady 
}) => {
  // Verificação de segurança robusteada
  if (!contrato || typeof contrato !== 'object') {
    console.error('PDFContrato: Contrato inválido ou ausente', contrato);
    return <span>Dados do contrato indisponíveis</span>;
  }

  // Verificações adicionais para evitar erro "Eo is not a function"
  if (!contrato.numero && !contrato.id) {
    console.error('PDFContrato: Contrato sem identificação válida', contrato);
    return <span>Dados do contrato incompletos</span>;
  }

  const fileName = `contrato_${contrato?.numero || Date.now()}.pdf`;

  // Dados validados para evitar erros
  const contratoValidado = contrato;
  const itensValidados = Array.isArray(itens) ? itens.filter(item => item && typeof item === 'object') : [];
  const parcelasValidadas = Array.isArray(parcelas) ? parcelas.filter(parcela => parcela && typeof parcela === 'object') : [];

  console.log('PDFContrato: Renderizando com dados:', {
    contrato: !!contratoValidado,
    contratoNumero: contratoValidado?.numero,
    contratoTipo: contratoValidado?.tipo,
    contratoFornecedor: contratoValidado?.fornecedor?.nome,
    itensCount: itensValidados.length,
    parcelasCount: parcelasValidadas.length,
    obraInfo: !!obraInfo,
    // Debug mais detalhado
    contratoValorTotal: contratoValidado?.valor_total,
    contratoDataInicio: contratoValidado?.data_inicio
  });

  // Log adicional para debug
  console.log('Dados do contrato:', JSON.stringify(contratoValidado, null, 2));
  console.log('Itens:', JSON.stringify(itensValidados, null, 2));
  console.log('Parcelas:', JSON.stringify(parcelasValidadas, null, 2));

  // Validação final antes de criar o documento
  try {
    return (
      <PDFDownloadLink 
        document={
          <DocumentoPDFContrato 
            contrato={contratoValidado} 
            itens={itensValidados}
            parcelas={parcelasValidadas}
            obraInfo={obraInfo}
          />
        } 
        fileName={fileName}
      >
      {({ blob, url, loading, error }) => {
        if (error) {
          console.error('Erro detalhado ao gerar PDF de contrato:', error);
          console.error('Stack trace:', error.stack);
          console.error('Dados que causaram o erro:', {
            contratoId: contratoValidado?.id,
            contratoNumero: contratoValidado?.numero,
            contratoTipo: typeof contratoValidado,
            itensLength: itensValidados?.length,
            parcelasLength: parcelasValidadas?.length,
            obraInfoType: typeof obraInfo
          });
          return <span>Erro ao gerar PDF do contrato</span>;
        }

        if (loading) {
          return <span>Gerando PDF do contrato...</span>;
        }

        if (url && onPDFReady && !loading) {
          console.log('PDF do contrato gerado com sucesso, URL:', url);
          setTimeout(() => onPDFReady(url), 100);
        }

        return children;
      }}
    </PDFDownloadLink>
  );
  } catch (error) {
    console.error('Erro crítico no PDFContrato:', error);
    return <span>Erro interno na geração do PDF</span>;
  }
};

export default PDFContrato; 