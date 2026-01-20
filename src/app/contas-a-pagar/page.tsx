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
      const { data: parcelasCompras, error: errorCompras } = await supabase
        .from('parcelas_pedido_compra')
        .select(`
          *,
          pedido_compra:pedido_compra_id(
            status
          )
        `)
        .not('data_prevista', 'is', null)
        .eq('obra_id', obraSelecionada.id)
        .eq('pedido_compra.status', 'Aprovado');

      if (errorCompras) throw errorCompras;

      // Buscar parcelas de medições
      const { data: parcelasMedicoes, error: errorMedicoes } = await supabase
        .from('parcelas_medicao')
        .select(`
          *,
          medicao:medicao_id(
            status
          )
        `)
        .not('data_prevista', 'is', null)
        .eq('obra_id', obraSelecionada.id)
        .eq('medicao.status', 'Aprovado');

      if (errorMedicoes) throw errorMedicoes;

      // Calcular estatísticas
      const hoje = new Date();

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

        const dataVencimento = new Date(parcela.data_prevista);
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

        const dataVencimento = new Date(parcela.data_prevista);
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
    <main className="flex-1 overflow-auto p-6">
      {/* Header da página */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Receipt className="text-primary" size={28} />
            <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
          </div>
          <button
            onClick={carregarEstatisticas}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        <p className="text-gray-600">
          Controle financeiro das medições e compras com datas de vencimento e previsão de desembolso
        </p>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Vencidas</p>
              <p className="text-xl font-bold text-red-600">
                {loading ? '...' : formatarValor(estatisticas.vencidas)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Próximos 7 dias</p>
              <p className="text-xl font-bold text-yellow-600">
                {loading ? '...' : formatarValor(estatisticas.proximos7Dias)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Próximos 30 dias</p>
              <p className="text-xl font-bold text-blue-600">
                {loading ? '...' : formatarValor(estatisticas.proximos30Dias)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Receipt className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total pendente</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? '...' : formatarValor(estatisticas.totalPendente)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Tab Headers */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setAbaAtiva('compras')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-all ${
                abaAtiva === 'compras'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contas de Compras
            </button>
            <button
              onClick={() => setAbaAtiva('medicoes')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-all ${
                abaAtiva === 'medicoes'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contas de Medições
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {abaAtiva === 'compras' && <ContasPagarCompras onDataChange={carregarEstatisticas} />}
          {abaAtiva === 'medicoes' && <ContasPagarMedicoes onDataChange={carregarEstatisticas} />}
        </div>
      </div>
    </main>
  );
}
