"use client";

import { useState, useEffect } from 'react';
import { Receipt, Calendar, TrendingDown, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useObra } from '@/contexts/ObraContext';
import ContasPagarMedicoes from '@/components/contas-a-pagar/ContasPagarMedicoes';
import ContasPagarCompras from '@/components/contas-a-pagar/ContasPagarCompras';

interface EstatisticasContas {
  vencidas: number;
  proximos7Dias: number;
  proximos30Dias: number;
  totalPendente: number;
}

export default function ContasPagarPage() {
  const { obraSelecionada } = useObra();
  const [abaAtiva, setAbaAtiva] = useState<'medicoes' | 'compras'>('compras');
  const [estatisticas, setEstatisticas] = useState<EstatisticasContas>({
    vencidas: 0,
    proximos7Dias: 0,
    proximos30Dias: 0,
    totalPendente: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstatisticas();
  }, [obraSelecionada]);

  useEffect(() => {
    // Recarregar estatísticas quando a aba for alterada
    carregarEstatisticas();
  }, [abaAtiva, obraSelecionada]);

  const carregarEstatisticas = async () => {
    if (!obraSelecionada) {
      setEstatisticas({
        vencidas: 0,
        proximos7Dias: 0,
        proximos30Dias: 0,
        totalPendente: 0
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Buscar parcelas de compras
      // Nota: parcelas_pedido_compra não tem obra_id diretamente, precisa filtrar via pedido_compra
      const { data: todasParcelasCompras, error: errorCompras } = await supabase
        .from('parcelas_pedido_compra')
        .select(`
          *,
          pedido_compra:pedido_compra_id(
            status,
            obra_id
          )
        `)
        .not('data_prevista', 'is', null);

      if (errorCompras) throw errorCompras;

      // Filtrar parcelas da obra selecionada e com pedido aprovado
      const parcelasCompras = (todasParcelasCompras || []).filter(
        parcela => 
          parcela.pedido_compra?.status === 'Aprovado' &&
          parcela.pedido_compra?.obra_id === obraSelecionada.id
      );

      console.log(`Total de parcelas de compras encontradas: ${todasParcelasCompras?.length || 0}`);
      console.log(`Parcelas de compras da obra ${obraSelecionada.id}: ${parcelasCompras.length}`);

      // Buscar parcelas de medições
      // Nota: parcelas_medicao não tem obra_id diretamente, precisa filtrar via medicao
      const { data: todasParcelasMedicoes, error: errorMedicoes } = await supabase
        .from('parcelas_medicao')
        .select(`
          *,
          medicao:medicao_id(
            status,
            obra_id
          )
        `)
        .not('data_prevista', 'is', null);

      if (errorMedicoes) throw errorMedicoes;

      // Filtrar parcelas da obra selecionada e com medição aprovada
      const parcelasMedicoes = (todasParcelasMedicoes || []).filter(
        parcela => 
          parcela.medicao?.status === 'Aprovado' &&
          parcela.medicao?.obra_id === obraSelecionada.id
      );

      console.log(`Total de parcelas de medições encontradas: ${todasParcelasMedicoes?.length || 0}`);
      console.log(`Parcelas de medições da obra ${obraSelecionada.id}: ${parcelasMedicoes.length}`);

      // Calcular estatísticas
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let vencidas = 0;
      let proximos7Dias = 0;
      let proximos30Dias = 0;
      let totalPendente = 0;

      // Processar parcelas de compras
      console.log('Processando', parcelasCompras?.length || 0, 'parcelas de compras');
      
      parcelasCompras?.forEach(parcela => {
        // Considerar apenas parcelas pendentes (não pagas)
        if (parcela.status === 'Pago') {
          console.log('Parcela já paga, pulando:', parcela.id);
          return;
        }

        // Extrai a data sem considerar fuso horário para evitar problemas de timezone
        const dataString = parcela.data_prevista.split('T')[0]; // Remove hora se houver
        const [ano, mes, dia] = dataString.split('-').map(Number);
        const dataVencimento = new Date(ano, mes - 1, dia);
        dataVencimento.setHours(0, 0, 0, 0);
        
        const valor = Number(parcela.valor) || 0;

        // Calcular dias até o vencimento
        const diasAteVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`Parcela ${parcela.id}: vencimento ${parcela.data_prevista}, valor ${valor}, dias até vencimento ${diasAteVencimento}`);

        if (diasAteVencimento < 0) {
          // Vencida
          vencidas += valor;
          console.log(`  -> Vencida: +${valor} (total vencidas: ${vencidas})`);
        } else if (diasAteVencimento <= 7) {
          // Próximos 7 dias
          proximos7Dias += valor;
          console.log(`  -> Próximos 7 dias: +${valor} (total 7 dias: ${proximos7Dias})`);
        } else if (diasAteVencimento <= 30) {
          // Próximos 30 dias
          proximos30Dias += valor;
          console.log(`  -> Próximos 30 dias: +${valor} (total 30 dias: ${proximos30Dias})`);
        }

        totalPendente += valor;
      });

      console.log('Estatísticas de compras calculadas:', { vencidas, proximos7Dias, proximos30Dias, totalPendente });

      // Processar parcelas de medições
      console.log('Processando', parcelasMedicoes?.length || 0, 'parcelas de medições');
      
      parcelasMedicoes?.forEach(parcela => {
        // Considerar apenas parcelas pendentes (não pagas)
        if (parcela.status === 'Pago') {
          console.log('Parcela de medição já paga, pulando:', parcela.id);
          return;
        }

        // Extrai a data sem considerar fuso horário para evitar problemas de timezone
        const dataString = parcela.data_prevista.split('T')[0]; // Remove hora se houver
        const [ano, mes, dia] = dataString.split('-').map(Number);
        const dataVencimento = new Date(ano, mes - 1, dia);
        dataVencimento.setHours(0, 0, 0, 0);
        
        const valor = Number(parcela.valor) || 0;

        // Calcular dias até o vencimento
        const diasAteVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`Parcela medição ${parcela.id}: vencimento ${parcela.data_prevista}, valor ${valor}, dias até vencimento ${diasAteVencimento}`);

        if (diasAteVencimento < 0) {
          // Vencida
          vencidas += valor;
          console.log(`  -> Vencida: +${valor} (total vencidas: ${vencidas})`);
        } else if (diasAteVencimento <= 7) {
          // Próximos 7 dias
          proximos7Dias += valor;
          console.log(`  -> Próximos 7 dias: +${valor} (total 7 dias: ${proximos7Dias})`);
        } else if (diasAteVencimento <= 30) {
          // Próximos 30 dias
          proximos30Dias += valor;
          console.log(`  -> Próximos 30 dias: +${valor} (total 30 dias: ${proximos30Dias})`);
        }

        totalPendente += valor;
      });

      console.log('Estatísticas finais (compras + medições):', { vencidas, proximos7Dias, proximos30Dias, totalPendente });

      setEstatisticas({
        vencidas,
        proximos7Dias,
        proximos30Dias,
        totalPendente
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
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

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      {/* Header da página - Mobile: layout vertical, Desktop: layout horizontal */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <Receipt className="text-primary shrink-0" size={28} />
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Contas a Pagar</h1>
              <p className="text-sm text-gray-600 mt-0.5 md:hidden">
                Controle de vencimentos e desembolso
              </p>
            </div>
          </div>
          <button
            onClick={carregarEstatisticas}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors active:bg-blue-700 md:min-h-0 md:rounded-md shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        <p className="hidden md:block text-gray-600">
          Controle financeiro das medições e compras com datas de vencimento e previsão de desembolso
        </p>
      </div>

      {/* Estatísticas rápidas - Mobile: 2x2 grid, Desktop: 4 colunas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle className="text-red-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-gray-600 truncate">Vencidas</p>
              <p className="text-base md:text-xl font-bold text-red-600 truncate" title={loading ? '' : formatarValor(estatisticas.vencidas)}>
                {loading ? '...' : formatarValor(estatisticas.vencidas)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="text-yellow-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-gray-600 truncate">Próx. 7 dias</p>
              <p className="text-base md:text-xl font-bold text-yellow-600 truncate" title={loading ? '' : formatarValor(estatisticas.proximos7Dias)}>
                {loading ? '...' : formatarValor(estatisticas.proximos7Dias)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <TrendingDown className="text-blue-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-gray-600 truncate">Próx. 30 dias</p>
              <p className="text-base md:text-xl font-bold text-blue-600 truncate" title={loading ? '' : formatarValor(estatisticas.proximos30Dias)}>
                {loading ? '...' : formatarValor(estatisticas.proximos30Dias)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <Receipt className="text-gray-600" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-gray-600 truncate">Total pendente</p>
              <p className="text-base md:text-xl font-bold text-gray-900 truncate" title={loading ? '' : formatarValor(estatisticas.totalPendente)}>
                {loading ? '...' : formatarValor(estatisticas.totalPendente)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Tab Headers - Mobile: touch-friendly, Desktop: padrão */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setAbaAtiva('compras')}
              className={`flex-1 md:flex-initial px-4 py-3.5 md:px-6 md:py-4 font-medium text-sm border-b-2 transition-all min-h-[48px] md:min-h-0 ${
                abaAtiva === 'compras'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contas de Compras
            </button>
            <button
              onClick={() => setAbaAtiva('medicoes')}
              className={`flex-1 md:flex-initial px-4 py-3.5 md:px-6 md:py-4 font-medium text-sm border-b-2 transition-all min-h-[48px] md:min-h-0 ${
                abaAtiva === 'medicoes'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contas de Medições
            </button>
          </div>
        </div>

        {/* Tab Content - Mobile: padding reduzido */}
        <div className="p-4 md:p-6">
          {abaAtiva === 'compras' && <ContasPagarCompras onDataChange={carregarEstatisticas} />}
          {abaAtiva === 'medicoes' && <ContasPagarMedicoes onDataChange={carregarEstatisticas} />}
        </div>
      </div>
    </main>
  );
}
