/*
# Memorial Descritivo - Dashboard com Navegação Temporal

## Objetivo
Dashboard principal do sistema Construtivo com funcionalidade de navegação temporal 
no gráfico "Evolução da Obra", permitindo ao usuário visualizar diferentes períodos
do ano (6 meses por vez) com dados de valores orçados vs realizados.

## Funcionalidades Principais
1. Exibição de estatísticas gerais da obra
2. Gráfico de evolução temporal navegável
3. Distribuição de custos por centro de custo
4. Acompanhamento de contratos e medições
5. Lista de atividades recentes

## Navegação Temporal
- Controles visuais para navegar entre períodos de 6 meses
- Indicador visual do período atual sendo exibido
- Botões com estados desabilitados nos limites (início/fim do ano)
- Atualização otimizada: apenas o gráfico é recalculado, sem recarregar toda a tela
- Cache local dos dados para navegação instantânea entre períodos
- Botão manual de refresh para forçar atualização dos dados

## Fluxo de Dados
- Entrada: Dados do Supabase (medições, pedidos, negociações)
- Processamento: Agregação por mês com base nas datas de aprovação
- Saída: Gráficos interativos e estatísticas atualizadas

## Segurança
- Uso de variáveis de ambiente para credenciais do Supabase
- Validação de estados antes de renderização
- Tratamento de erros com feedback visual (loading states)

## Observações Futuras
- Possibilidade de expandir para visualização anual
- Adicionar filtros por centro de custo específico
- Implementar exportação de dados do período selecionado
*/

'use client';

import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { StatisticCard } from '@/components/ui/statistic-card';
import { ActivityList, ActivityItem } from '@/components/ui/activity-list';
import { ChartCard } from '@/components/ui/chart-card';
import { CostDistributionChart } from '@/components/ui/cost-distribution-chart';
import { ContractProgressGauges } from '@/components/ui/contract-progress-gauges';
import { supabase } from '@/lib/supabaseClient';
import { useObra } from '@/contexts/ObraContext';

interface CentroCusto {
  id: number;
  codigo: string;
  descricao: string;
  orcado: number | null;
  custo: number | null;
  realizado: number | null;
  com_bdi: number | null;
  created_at: string;
  updated_at: string;
}

interface PedidoCompra {
  id: number;
  fornecedor_id: number;
  data_compra: string;
  valor_total: number;
  status: string;
  created_at: string;
  updated_at: string;
  fornecedores?: {
    nome: string;
  };
}

interface Medicao {
  id: number;
  negociacao_id: number;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: string;
  created_at: string;
  updated_at: string;
  negociacoes?: {
    descricao: string;
    fornecedor_id: number;
    fornecedores?: {
      nome: string;
    };
  };
}

interface Negociacao {
  id: number;
  numero: string;
  tipo: string;
  fornecedor_id: number;
  descricao: string;
  data_inicio: string;
  data_fim: string | null;
  obra: string | null;
  engenheiro_responsavel: string | null;
  valor_total: number;
  created_at: string;
  updated_at: string;
  fornecedores?: {
    nome: string;
  };
}

interface ContractProgressData {
  id: number;
  numero: string;
  tipo: string;
  descricao: string;
  fornecedor_nome: string;
  valor_total: number;
  valor_medido: number;
  percentual_executado: number;
}

export default function Dashboard() {
  const { obraSelecionada, obras, isLoading: isLoadingObras } = useObra();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrcado: 0,
    totalCusto: 0,
    totalRealizado: 0,
    percentualExecutado: 0,
    totalCentrosCusto: 0,
    totalGrupos: 0,
    totalItensOrcamento: 0,
    totalItensCusto: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [centrosCustoData, setCentrosCustoData] = useState<Array<{ name: string; value: number }>>([]);
  const [evolucaoObraData, setEvolucaoObraData] = useState<Array<{ name: string; Receitas: number; Despesas: number }>>([]);
  const [distribuicaoCustosData, setDistribuicaoCustosData] = useState<Array<{ name: string; Orçado: number; Custo: number; Realizado: number }>>([]);
  const [contractProgressData, setContractProgressData] = useState<ContractProgressData[]>([]);

  // Estados para controle de navegação temporal do gráfico de evolução
  const [periodoInicial, setPeriodoInicial] = useState(0); // Mês inicial do período exibido (0 = Janeiro)
  const [mesesExibidos] = useState(6); // Quantidade de meses exibidos por vez
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear()); // Ano selecionado para análise

  // Cache simples dos dados carregados (para navegação temporal sem recarregar do servidor)
  const [dadosCompletos, setDadosCompletos] = useState<{
    todasMedicoes: Medicao[] | null;
    todasParcelas: any[] | null;
    todasParcelasMedicao: any[] | null;
    todasParcelasReceber: any[] | null;
    totalOrcado: number;
  } | null>(null);

  // Constante dos meses do ano (declarada no nível do componente)
  const mesesDoAno = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  /** Extrai ano e mês (0–11) de data_recebimento (string ISO ou Date). Retorna null se inválido. */
  const parseDataRecebimento = (raw: string | Date | null | undefined): { ano: number; mes: number } | null => {
    if (!raw) return null;
    try {
      const s = typeof raw === 'string' ? raw : (raw as Date).toISOString();
      const part = s.split('T')[0];
      if (!part) return null;
      const [a, m, d] = part.split('-').map(Number);
      if (!Number.isFinite(a) || !Number.isFinite(m) || m < 1 || m > 12) return null;
      return { ano: a, mes: m - 1 };
    } catch {
      return null;
    }
  };



  // useEffect principal - carrega dados gerais uma única vez
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Se ainda está carregando obras, aguardar
      if (isLoadingObras) {
        return;
      }

      setLoading(true);

      // Se não há obra selecionada, inicializar com dados vazios/zerados
      if (!obraSelecionada) {
        setStats({
          totalOrcado: 0,
          totalCusto: 0,
          totalRealizado: 0,
          percentualExecutado: 0,
          totalCentrosCusto: 0,
          totalGrupos: 0,
          totalItensOrcamento: 0,
          totalItensCusto: 0,
        });
        setActivities([]);
        setCentrosCustoData([]);
        setEvolucaoObraData([]);
        setDistribuicaoCustosData([]);
        setContractProgressData([]);
        setDadosCompletos({
          todasMedicoes: [],
          todasParcelas: [],
          todasParcelasMedicao: [],
          todasParcelasReceber: [],
          totalOrcado: 0,
        });
        setLoading(false);
        return;
      }

      try {
        // Buscar estatísticas gerais filtradas por obra
        const { data: centrosCusto } = await supabase
          .from('centros_custo')
          .select('*')
          .eq('obra_id', obraSelecionada.id);

        const { data: grupos } = await supabase
          .from('grupos')
          .select('*')
          .eq('obra_id', obraSelecionada.id);

        const { data: itensOrcamento } = await supabase
          .from('itens_orcamento')
          .select('*')
          .eq('obra_id', obraSelecionada.id);

        const { data: itensCusto } = await supabase
          .from('itens_custo')
          .select('*')
          .eq('obra_id', obraSelecionada.id);

        // Buscar todas as medições e pedidos para o gráfico de evolução (será usado no useEffect separado)
        const { data: todasMedicoes } = await supabase
          .from('medicoes')
          .select('*, negociacoes(*)')
          .eq('obra_id', obraSelecionada.id);

        // Buscar parcelas de pedidos de compra com previsão de desembolso
        // Nota: parcelas_pedido_compra não tem obra_id diretamente, precisa filtrar via pedido_compra
        const { data: todasParcelasRaw } = await supabase
          .from('parcelas_pedido_compra')
          .select(`
            *,
            pedido_compra:pedido_compra_id(
              *,
              obra_id
            )
          `)
          .not('data_prevista', 'is', null);

        // Filtrar parcelas da obra selecionada e com pedido aprovado
        const todasParcelas = (todasParcelasRaw || []).filter(
          parcela =>
            parcela.pedido_compra?.status === 'Aprovado' &&
            parcela.pedido_compra?.obra_id === obraSelecionada.id
        );

        // Buscar parcelas de medições com previsão de desembolso
        // Nota: parcelas_medicao não tem obra_id diretamente, precisa filtrar via medicao
        const { data: todasParcelasMedicaoRaw } = await supabase
          .from('parcelas_medicao')
          .select(`
            *,
            medicao:medicao_id(
              status,
              negociacao_id,
              obra_id
            )
          `)
          .not('data_prevista', 'is', null);

        // Filtrar parcelas da obra selecionada e com medição aprovada
        const todasParcelasMedicao = (todasParcelasMedicaoRaw || []).filter(
          parcela =>
            parcela.medicao?.status === 'Aprovado' &&
            parcela.medicao?.obra_id === obraSelecionada.id
        );

        // Buscar contas a receber marcadas como recebidas (usadas em Receitas no gráfico Evolução da Obra)
        const { data: todasParcelasReceber } = await supabase
          .from('parcelas_receber')
          .select('*')
          .eq('status', 'Recebido')
          .eq('obra_id', obraSelecionada.id)
          .not('data_recebimento', 'is', null)
          .order('data_recebimento', { ascending: true });

        // Buscar negociações com medições para os aferidores
        const { data: negociacoesComMedicoes } = await supabase
          .from('negociacoes')
          .select(`
            *,
            fornecedores(nome),
            medicoes(valor_total, status)
          `)
          .eq('obra_id', obraSelecionada.id)
          .order('created_at', { ascending: false });

        // Calcular totais
        const totalOrcado = centrosCusto?.reduce((acc: number, centro: CentroCusto) => acc + Number(centro.orcado || 0), 0) || 0;
        const totalCusto = centrosCusto?.reduce((acc: number, centro: CentroCusto) => acc + Number(centro.custo || 0), 0) || 0;

        // Calcular o total realizado com base apenas nas parcelas PAGAS
        const totalParcelasPagas = todasParcelas?.reduce((acc: number, parcela: any) => {
          return parcela.status === 'Pago' ? acc + Number(parcela.valor || 0) : acc;
        }, 0) || 0;

        // Calcular total de parcelas de medições pagas
        const totalParcelasMedicaoPagas = todasParcelasMedicao?.reduce((acc: number, parcela: any) => {
          return parcela.status === 'Pago' ? acc + Number(parcela.valor || 0) : acc;
        }, 0) || 0;

        const totalRealizado = totalParcelasPagas + totalParcelasMedicaoPagas;

        const percentualExecutado = totalCusto > 0 ? (totalRealizado / totalCusto) * 100 : 0;

        setStats({
          totalOrcado,
          totalCusto,
          totalRealizado,
          percentualExecutado,
          totalCentrosCusto: centrosCusto?.length || 0,
          totalGrupos: grupos?.length || 0,
          totalItensOrcamento: itensOrcamento?.length || 0,
          totalItensCusto: itensCusto?.length || 0,
        });

        // Preparar dados para gráficos
        if (centrosCusto && centrosCusto.length > 0) {
          // Dados para o gráfico de pizza (distribuição por centro de custo)
          let centrosData = centrosCusto.map((centro: CentroCusto) => ({
            name: centro.descricao,
            value: Number(centro.orcado || 0)
          }));

          // Limitar o número de centros mostrados no gráfico para melhor visualização
          // Ordenar por valor decrescente
          centrosData.sort((a, b) => b.value - a.value);

          // Se houver mais de 5 centros, agrupar os menores como "Outros"
          if (centrosData.length > 5) {
            const principaisCentros = centrosData.slice(0, 4);
            const outrosCentros = centrosData.slice(4);

            const somatorioOutros = outrosCentros.reduce((total, centro) => total + centro.value, 0);

            if (somatorioOutros > 0) {
              principaisCentros.push({
                name: 'Outros',
                value: somatorioOutros
              });
            }

            centrosData = principaisCentros;
          }

          setCentrosCustoData(centrosData);

          // Dados para o gráfico de barras (comparativo orçado vs. custo)
          const distribuicaoData = centrosCusto.map((centro: CentroCusto) => ({
            name: centro.descricao,
            Orçado: Number(centro.orcado || 0),
            Custo: Number(centro.custo || 0),
            Realizado: Number(centro.realizado || 0)
          }));

          setDistribuicaoCustosData(distribuicaoData);
        } else {
          // Quando não há centros de custo, manter arrays vazios para exibir gráficos vazios
          setCentrosCustoData([]);
          setDistribuicaoCustosData([]);
        }

        // Processar dados de evolução diretamente aqui (sem cache complicado)
        const mesesValores: { [key: string]: { Receitas: number; Despesas: number } } = {};

        // Inicializar todos os meses com zero
        mesesDoAno.forEach(mes => {
          mesesValores[mes] = { Receitas: 0, Despesas: 0 };
        });

        // Receitas = contas a receber marcadas como recebidas (status Recebido + data_recebimento)
        todasParcelasReceber?.forEach((parcela: any) => {
          if (parcela.status !== 'Recebido' || !parcela.data_recebimento) return;
          const parsed = parseDataRecebimento(parcela.data_recebimento);
          if (!parsed || parsed.ano !== anoSelecionado) return;
          const mesStr = mesesDoAno[parsed.mes];
          mesesValores[mesStr].Receitas += Number(parcela.valor) || 0;
        });

        // Processar parcelas de medições PAGAS (DESPESAS)
        todasParcelasMedicao?.forEach((parcela: any) => {
          if (parcela.data_prevista &&
            parcela.medicao?.status === 'Aprovado' &&
            parcela.status === 'Pago') { // APENAS parcelas já pagas
            const dataPrevisao = new Date(parcela.data_prevista);
            const anoPrevisao = dataPrevisao.getFullYear();

            if (anoPrevisao === anoSelecionado) {
              const mesPrevisao = mesesDoAno[dataPrevisao.getMonth()];
              mesesValores[mesPrevisao].Despesas += Number(parcela.valor);
            }
          }
        });

        // Processar parcelas de compras PAGAS (DESPESAS)
        todasParcelas?.forEach((parcela: any) => {
          if (parcela.data_prevista &&
            parcela.pedido_compra?.status === 'Aprovado' &&
            parcela.status === 'Pago') { // APENAS parcelas já pagas
            const dataPrevisao = new Date(parcela.data_prevista);
            const anoPrevisao = dataPrevisao.getFullYear();
            const mesPrevisao = dataPrevisao.getMonth();

            if (anoPrevisao === anoSelecionado) {
              const mesPrevisaoStr = mesesDoAno[mesPrevisao];
              mesesValores[mesPrevisaoStr].Despesas += Number(parcela.valor);
            }
          }
        });

        // Converter para array baseado no período atual
        const evolucaoData = mesesDoAno.slice(periodoInicial, periodoInicial + mesesExibidos).map(mes => ({
          name: mes,
          Receitas: mesesValores[mes].Receitas,
          Despesas: mesesValores[mes].Despesas
        }));

        setEvolucaoObraData(evolucaoData);

        // Armazenar dados para navegação temporal
        setDadosCompletos({
          todasMedicoes,
          todasParcelas,
          todasParcelasMedicao,
          todasParcelasReceber,
          totalOrcado
        });

        // Processar dados das negociações para os aferidores
        if (negociacoesComMedicoes && negociacoesComMedicoes.length > 0) {
          const contractsProgress: ContractProgressData[] = negociacoesComMedicoes.map((negociacao: any) => {
            const valorTotal = Number(negociacao.valor_total || 0);
            const valorMedido = negociacao.medicoes
              ?.filter((medicao: any) => medicao.status === 'Aprovado')
              ?.reduce((acc: number, medicao: any) => acc + Number(medicao.valor_total || 0), 0) || 0;

            const percentualExecutado = valorTotal > 0 ? (valorMedido / valorTotal) * 100 : 0;

            return {
              id: negociacao.id,
              numero: negociacao.numero,
              tipo: negociacao.tipo,
              descricao: negociacao.descricao,
              fornecedor_nome: negociacao.fornecedores?.nome || 'Não especificado',
              valor_total: valorTotal,
              valor_medido: valorMedido,
              percentual_executado: percentualExecutado
            };
          });

          setContractProgressData(contractsProgress);
        }

        // Buscar atividades recentes
        const { data: pedidos } = await supabase
          .from('pedidos_compra')
          .select('*, fornecedores(nome)')
          .eq('obra_id', obraSelecionada.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: medicoes } = await supabase
          .from('medicoes')
          .select('*, negociacoes(descricao, fornecedor_id, fornecedores(nome))')
          .eq('obra_id', obraSelecionada.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: negociacoes } = await supabase
          .from('negociacoes')
          .select('*, fornecedores(nome)')
          .eq('obra_id', obraSelecionada.id)
          .order('created_at', { ascending: false })
          .limit(5);

        // Combinar atividades recentes
        const recentActivities: ActivityItem[] = [];

        pedidos?.forEach((pedido: PedidoCompra) => {
          recentActivities.push({
            id: `pedido-${pedido.id}`,
            title: `Pedido de Compra`,
            description: `Fornecedor: ${pedido.fornecedores?.nome || 'Não especificado'} - R$ ${Number(pedido.valor_total).toLocaleString('pt-BR')}`,
            date: (() => {
              if (pedido.created_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [ano, mes, dia] = pedido.created_at.split('-').map(Number);
                return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
              }
              return new Date(pedido.created_at).toLocaleDateString('pt-BR');
            })(),
            type: 'pedido',
            status: pedido.status
          });
        });

        medicoes?.forEach((medicao: Medicao) => {
          recentActivities.push({
            id: `medicao-${medicao.id}`,
            title: `Medição`,
            description: `${medicao.negociacoes?.descricao || 'Não especificada'} - R$ ${Number(medicao.valor_total).toLocaleString('pt-BR')}`,
            date: (() => {
              if (medicao.created_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [ano, mes, dia] = medicao.created_at.split('-').map(Number);
                return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
              }
              return new Date(medicao.created_at).toLocaleDateString('pt-BR');
            })(),
            type: 'medicao',
            status: medicao.status
          });
        });

        negociacoes?.forEach((negociacao: Negociacao) => {
          recentActivities.push({
            id: `negociacao-${negociacao.id}`,
            title: `${negociacao.tipo} - ${negociacao.numero}`,
            description: `${negociacao.fornecedores?.nome || 'Não especificado'} - R$ ${Number(negociacao.valor_total).toLocaleString('pt-BR')}`,
            date: (() => {
              if (negociacao.created_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [ano, mes, dia] = negociacao.created_at.split('-').map(Number);
                return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
              }
              return new Date(negociacao.created_at).toLocaleDateString('pt-BR');
            })(),
            type: 'negociacao'
          });
        });

        // Ordenar por data (mais recente primeiro)
        recentActivities.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setActivities(recentActivities.slice(0, 20));
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [obraSelecionada, isLoadingObras]); // Recarregar quando a obra selecionada mudar ou quando terminar de carregar obras

  // useEffect simples para recalcular gráfico de evolução quando período mudar
  useEffect(() => {
    if (!dadosCompletos) {
      // Se não há dados completos, inicializar gráfico vazio
      const evolucaoData = mesesDoAno.slice(periodoInicial, periodoInicial + mesesExibidos).map(mes => ({
        name: mes,
        Receitas: 0,
        Despesas: 0
      }));
      setEvolucaoObraData(evolucaoData);
      return;
    }

    const { todasMedicoes, todasParcelas, todasParcelasMedicao, todasParcelasReceber, totalOrcado } = dadosCompletos;

    // Recalcular valores por mês
    const mesesValores: { [key: string]: { Receitas: number; Despesas: number } } = {};

    mesesDoAno.forEach(mes => {
      mesesValores[mes] = { Receitas: 0, Despesas: 0 };
    });

    // Receitas = contas a receber marcadas como recebidas (status Recebido + data_recebimento)
    todasParcelasReceber?.forEach((parcela: any) => {
      if (parcela.status !== 'Recebido' || !parcela.data_recebimento) return;
      const parsed = parseDataRecebimento(parcela.data_recebimento);
      if (!parsed || parsed.ano !== anoSelecionado) return;
      const mesStr = mesesDoAno[parsed.mes];
      mesesValores[mesStr].Receitas += Number(parcela.valor) || 0;
    });

    // Processar parcelas de medições PAGAS (DESPESAS)
    todasParcelasMedicao?.forEach((parcela: any) => {
      if (parcela.data_prevista &&
        parcela.medicao?.status === 'Aprovado' &&
        parcela.status === 'Pago') { // APENAS parcelas já pagas
        const dataPrevisao = new Date(parcela.data_prevista);
        const anoPrevisao = dataPrevisao.getFullYear();

        if (anoPrevisao === anoSelecionado) {
          const mesPrevisao = mesesDoAno[dataPrevisao.getMonth()];
          mesesValores[mesPrevisao].Despesas += Number(parcela.valor);
        }
      }
    });

    // Processar parcelas de compras PAGAS (DESPESAS)
    todasParcelas?.forEach((parcela: any) => {
      if (parcela.data_prevista &&
        parcela.pedido_compra?.status === 'Aprovado' &&
        parcela.status === 'Pago') { // APENAS parcelas já pagas
        const dataPrevisao = new Date(parcela.data_prevista);
        const anoPrevisao = dataPrevisao.getFullYear();

        if (anoPrevisao === anoSelecionado) {
          const mesPrevisao = mesesDoAno[dataPrevisao.getMonth()];
          mesesValores[mesPrevisao].Despesas += Number(parcela.valor);
        }
      }
    });

    // Gerar dados apenas para o período selecionado
    const evolucaoData = mesesDoAno.slice(periodoInicial, periodoInicial + mesesExibidos).map(mes => ({
      name: mes,
      Receitas: mesesValores[mes].Receitas,
      Despesas: mesesValores[mes].Despesas
    }));

    setEvolucaoObraData(evolucaoData);
  }, [periodoInicial, dadosCompletos, mesesExibidos, anoSelecionado]); // Recalcular quando período, dados ou ano mudarem



  // Mostrar loading apenas enquanto está carregando obras ou dados
  if (isLoadingObras || loading) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </main>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Funções de navegação temporal do gráfico de evolução da obra

  // Navegar para o período anterior (move 1 mês para trás)
  const navegarAnterior = () => {
    if (periodoInicial > 0) {
      setPeriodoInicial(periodoInicial - 1);
    }
  };

  // Navegar para o próximo período (move 1 mês para frente)
  const navegarProximo = () => {
    if (periodoInicial + mesesExibidos < mesesDoAno.length) {
      setPeriodoInicial(periodoInicial + 1);
    }
  };

  // Obter o texto do período atual sendo exibido
  const obterPeriodoAtual = () => {
    const inicio = mesesDoAno[periodoInicial];
    const fim = mesesDoAno[Math.min(periodoInicial + mesesExibidos - 1, mesesDoAno.length - 1)];
    return `${inicio} - ${fim}`;
  };

  // Verificar se pode navegar para trás
  const podeNavegarAnterior = periodoInicial > 0;

  // Verificar se pode navegar para frente
  const podeNavegarProximo = periodoInicial + mesesExibidos < mesesDoAno.length;

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="space-y-6">
        {/* Estatísticas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatisticCard
            title="Total Orçado/Venda"
            value={formatCurrency(stats.totalOrcado)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            }
          />
          <StatisticCard
            title="Total Custo/Liberado"
            value={formatCurrency(stats.totalCusto)}
            trend={{
              value: stats.totalCusto > 0 ? Math.round((stats.totalRealizado / stats.totalCusto) * 100) : 0,
              isPositive: stats.totalRealizado <= stats.totalCusto
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
          <StatisticCard
            title="Total Realizado"
            value={formatCurrency(stats.totalRealizado)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h.01M7 20v-4m0 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM15.01 20h-.01M20 20h.01M22 7H2m0 3v10a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V10M22 7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1M15 20v-4a2 2 0 1 0-4 0v4" />
              </svg>
            }
          />
          <StatisticCard
            title="Percentual Executado"
            value={`${stats.percentualExecutado.toFixed(1)}%`}
            description="Da obra total"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Evolução da Obra com Navegação Temporal */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 pb-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold">Evolução da Obra</h3>
                  <p className="text-sm text-muted-foreground">
                    Comparativo entre receitas e despesas por mês
                  </p>
                </div>
                {/* Controles de Navegação Temporal e Seletor de Ano */}
                <div className="flex items-center gap-3">
                  {/* Seletor de Ano */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="ano-selecionado" className="text-sm font-medium text-gray-700">
                      Ano:
                    </label>
                    <select
                      id="ano-selecionado"
                      value={anoSelecionado}
                      onChange={(e) => {
                        setAnoSelecionado(Number(e.target.value));
                        setPeriodoInicial(0); // Resetar para o início do ano quando mudar o ano
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const ano = new Date().getFullYear() - 5 + i;
                        return (
                          <option key={ano} value={ano}>
                            {ano}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {/* Controles de Navegação Temporal */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={navegarAnterior}
                      disabled={!podeNavegarAnterior}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={podeNavegarAnterior ? "Ver período anterior" : "Início do ano alcançado"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15,18 9,12 15,6"></polyline>
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[90px] text-center bg-gray-50 px-3 py-1 rounded-md">
                      {obterPeriodoAtual()}
                    </span>
                    <button
                      onClick={navegarProximo}
                      disabled={!podeNavegarProximo}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={podeNavegarProximo ? "Ver próximo período" : "Final do ano alcançado"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9,18 15,12 9,6"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <ChartCard
                title=""
                description=""
                type="area"
                data={evolucaoObraData}
                categories={['Receitas', 'Despesas']}
                className="border-0 shadow-none bg-transparent p-0"
              />
            </div>
          </div>

          <CostDistributionChart
            title="Distribuição de Custos"
            description="Comparativo entre valores de custo e realizado por centro de custo"
            data={distribuicaoCustosData}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna da esquerda - Aferidores e Distribuição por Centro de Custo */}
          <div className="lg:col-span-6 space-y-6">
            <ContractProgressGauges
              title="Avançado das Medições de Contratos"
              description="Progresso monetário das negociações baseado em medições aprovadas"
              data={contractProgressData}
            />
            <ChartCard
              title="Distribuição por Centro de Custo"
              description="Valores orçados por centro de custo"
              type="pie"
              data={centrosCustoData}
              dataKey="value"
              className="min-h-[400px]"
            />
          </div>

          {/* Coluna da direita - Atividades Recentes */}
          <ActivityList
            title="Atividades Recentes"
            activities={activities}
            className="lg:col-span-6 min-h-[800px]"
            maxHeight="750px"
          />
        </div>

        {/* Estatísticas secundárias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatisticCard
            title="Centros de Custo"
            value={stats.totalCentrosCusto}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                <path d="M12 3v6" />
              </svg>
            }
          />
          <StatisticCard
            title="Grupos"
            value={stats.totalGrupos}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            }
          />
          <StatisticCard
            title="Itens Orçamento"
            value={stats.totalItensOrcamento}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatisticCard
            title="Itens Custo"
            value={stats.totalItensCusto}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            }
          />
        </div>
      </div>
    </main>
  );
} 