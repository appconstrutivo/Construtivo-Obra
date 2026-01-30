"use client";

import { useState, useMemo } from 'react';
import {
  FileBarChart,
  Calendar,
  Filter,
  Download,
  Receipt,
  TrendingUp,
  ArrowRightLeft,
  Loader2,
  DollarSign,
  LayoutList,
  PieChart,
  FileDown,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabaseClient';
import { useObra } from '@/contexts/ObraContext';
import { fetchParcelasReceber } from '@/lib/supabase-clientes';
import PDFRelatorioConfiguravel from '@/components/relatorios/PDFRelatorioConfiguravel';

type TipoRelatorio = 'contas_pagas' | 'contas_recebidas' | 'contas_pagas_recebidas';
type FormatoRelatorio = 'detalhado' | 'resumido';

interface ItemContaPaga {
  id: number;
  origem: 'compra' | 'medicao';
  descricao: string;
  valor: number;
  dataPrevista: string;
  fornecedorOuObra?: string;
}

interface ItemContaRecebida {
  id: number;
  descricao: string;
  valor: number;
  dataRecebimento: string;
  cliente: string;
  formaRecebimento?: string;
}

interface TotaisPorMes {
  ano: number;
  mes: number;
  mesLabel: string;
  totalPago: number;
  totalRecebido: number;
}

interface TotaisPorMesSimples {
  ano: number;
  mes: number;
  mesLabel: string;
  total: number;
}

const MESES_LABELS: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};

export default function RelatoriosPage() {
  const { obraSelecionada } = useObra();
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('contas_pagas_recebidas');
  const [formatoRelatorio, setFormatoRelatorio] = useState<FormatoRelatorio>('detalhado');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfGerando, setPdfGerando] = useState(false);
  const [contasPagas, setContasPagas] = useState<ItemContaPaga[]>([]);
  const [contasRecebidas, setContasRecebidas] = useState<ItemContaRecebida[]>([]);

  const formatarValor = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatarData = (data: string) => {
    const d = data.split('T')[0].split('-');
    return `${d[2]}/${d[1]}/${d[0]}`;
  };

  const dentroDoPeriodo = (dataStr: string, inicio: string, fim: string): boolean => {
    if (!dataStr) return false;
    const data = dataStr.split('T')[0];
    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
  };

  const gerarRelatorio = async () => {
    if (!obraSelecionada?.id) {
      alert('Selecione uma obra no topo da página para gerar relatórios.');
      return;
    }

    setLoading(true);
    setContasPagas([]);
    setContasRecebidas([]);

    try {
      const obraId = obraSelecionada.id;
      const inicio = dataInicio || undefined;
      const fim = dataFim || undefined;

      if (
        tipoRelatorio === 'contas_pagas' ||
        tipoRelatorio === 'contas_pagas_recebidas'
      ) {
        const { data: parcelasCompras } = await supabase
          .from('parcelas_pedido_compra')
          .select(
            `
            id,
            data_prevista,
            valor,
            descricao,
            status,
            pedido_compra:pedido_compra_id(
              obra_id,
              fornecedor:fornecedor_id(nome)
            )
          `
          )
          .eq('status', 'Pago')
          .not('data_prevista', 'is', null)
          .order('data_prevista', { ascending: true });

        const { data: parcelasMedicoes } = await supabase
          .from('parcelas_medicao')
          .select(
            `
            id,
            data_prevista,
            valor,
            descricao,
            status,
            medicao:medicao_id(
              obra_id,
              negociacao:negociacao_id(
                fornecedor:fornecedor_id(nome)
              )
            )
            `
          )
          .eq('status', 'Pago')
          .not('data_prevista', 'is', null)
          .order('data_prevista', { ascending: true });

        const itensPagas: ItemContaPaga[] = [];

        (parcelasCompras || []).forEach((p: any) => {
          if (p.pedido_compra?.obra_id !== obraId) return;
          if (inicio || fim) {
            if (!dentroDoPeriodo(p.data_prevista, inicio || '', fim || ''))
              return;
          }
          itensPagas.push({
            id: p.id,
            origem: 'compra',
            descricao: p.descricao || `Parcela #${p.id}`,
            valor: Number(p.valor) || 0,
            dataPrevista: p.data_prevista,
            fornecedorOuObra: p.pedido_compra?.fornecedor?.nome,
          });
        });

        (parcelasMedicoes || []).forEach((p: any) => {
          if (p.medicao?.obra_id !== obraId) return;
          if (inicio || fim) {
            if (!dentroDoPeriodo(p.data_prevista, inicio || '', fim || ''))
              return;
          }
          const fornecedor = p.medicao?.negociacao?.fornecedor?.nome;
          itensPagas.push({
            id: p.id,
            origem: 'medicao',
            descricao: p.descricao || `Medição #${p.id}`,
            valor: Number(p.valor) || 0,
            dataPrevista: p.data_prevista,
            fornecedorOuObra: fornecedor,
          });
        });

        itensPagas.sort(
          (a, b) =>
            new Date(a.dataPrevista).getTime() -
            new Date(b.dataPrevista).getTime()
        );
        setContasPagas(itensPagas);
      }

      if (
        tipoRelatorio === 'contas_recebidas' ||
        tipoRelatorio === 'contas_pagas_recebidas'
      ) {
        const parcelasRaw = await fetchParcelasReceber(obraId);
        const recebidas = (parcelasRaw || []).filter(
          (p: any) => p.status === 'Recebido' && p.data_recebimento
        );

        const itensRecebidas: ItemContaRecebida[] = recebidas
          .filter((p: any) => {
            if (!inicio && !fim) return true;
            return dentroDoPeriodo(
              p.data_recebimento,
              inicio || '',
              fim || ''
            );
          })
          .map((p: any) => ({
            id: p.id,
            descricao: p.descricao || `Recebimento #${p.id}`,
            valor: Number(p.valor) || 0,
            dataRecebimento: p.data_recebimento,
            cliente: p.cliente?.nome || 'Cliente não informado',
            formaRecebimento: p.forma_recebimento,
          }))
          .sort(
            (a: ItemContaRecebida, b: ItemContaRecebida) =>
              new Date(a.dataRecebimento).getTime() -
              new Date(b.dataRecebimento).getTime()
          );

        setContasRecebidas(itensRecebidas);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const totalPagas = contasPagas.reduce((acc, i) => acc + i.valor, 0);
  const totalRecebidas = contasRecebidas.reduce((acc, i) => acc + i.valor, 0);
  const temResultado =
    contasPagas.length > 0 || contasRecebidas.length > 0;

  const baixarPDF = async () => {
    if (!temResultado) return;
    setPdfGerando(true);
    try {
      const props = {
        tipoRelatorio,
        formatoRelatorio,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        obraNome: obraSelecionada?.nome,
        contasPagas: contasPagas.map((p) => ({
          id: p.id,
          origem: p.origem,
          descricao: p.descricao,
          valor: p.valor,
          dataPrevista: p.dataPrevista,
          fornecedorOuObra: p.fornecedorOuObra,
        })),
        contasRecebidas: contasRecebidas.map((r) => ({
          id: r.id,
          descricao: r.descricao,
          valor: r.valor,
          dataRecebimento: r.dataRecebimento,
          cliente: r.cliente,
          formaRecebimento: r.formaRecebimento,
        })),
        totaisPorMes: totaisPorMes.map((t) => ({
          mesLabel: t.mesLabel,
          totalPago: t.totalPago,
          totalRecebido: t.totalRecebido,
        })),
        totaisPorMesContasPagas: totaisPorMesContasPagas.map((t) => ({
          mesLabel: t.mesLabel,
          total: t.total,
        })),
        totaisPorMesContasRecebidas: totaisPorMesContasRecebidas.map((t) => ({
          mesLabel: t.mesLabel,
          total: t.total,
        })),
        totalPagas,
        totalRecebidas,
      };
      const blob = await pdf(<PDFRelatorioConfiguravel {...props} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nomeArquivo = `relatorio-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}.pdf`;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfGerando(false);
    }
  };

  /** Lista de meses no período (dataInicio..dataFim) com totais pagos e recebidos por mês */
  const totaisPorMes = useMemo((): TotaisPorMes[] => {
    if (tipoRelatorio !== 'contas_pagas_recebidas') return [];
    const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const fim = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    if (!inicio || !fim) return [];

    const mesesMap = new Map<string, TotaisPorMes>();
    let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);

    while (d <= fimMes) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesMap.set(key, {
        ano: d.getFullYear(),
        mes: d.getMonth() + 1,
        mesLabel: `${MESES_LABELS[d.getMonth() + 1]}/${d.getFullYear()}`,
        totalPago: 0,
        totalRecebido: 0,
      });
      d.setMonth(d.getMonth() + 1);
    }

    contasPagas.forEach((item) => {
      const [ano, mes] = item.dataPrevista.split('T')[0].split('-').map(Number);
      const key = `${ano}-${String(mes).padStart(2, '0')}`;
      const row = mesesMap.get(key);
      if (row) row.totalPago += item.valor;
    });

    contasRecebidas.forEach((item) => {
      const [ano, mes] = item.dataRecebimento.split('T')[0].split('-').map(Number);
      const key = `${ano}-${String(mes).padStart(2, '0')}`;
      const row = mesesMap.get(key);
      if (row) row.totalRecebido += item.valor;
    });

    return Array.from(mesesMap.values()).sort(
      (a, b) => (a.ano - b.ano) * 12 + (a.mes - b.mes)
    );
  }, [
    tipoRelatorio,
    dataInicio,
    dataFim,
    contasPagas,
    contasRecebidas,
  ]);

  /** Totais por mês apenas de contas pagas (para resumido "Contas pagas") */
  const totaisPorMesContasPagas = useMemo((): TotaisPorMesSimples[] => {
    if (tipoRelatorio !== 'contas_pagas') return [];
    const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const fim = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    if (!inicio || !fim) return [];

    const mesesMap = new Map<string, TotaisPorMesSimples>();
    let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);

    while (d <= fimMes) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesMap.set(key, {
        ano: d.getFullYear(),
        mes: d.getMonth() + 1,
        mesLabel: `${MESES_LABELS[d.getMonth() + 1]}/${d.getFullYear()}`,
        total: 0,
      });
      d.setMonth(d.getMonth() + 1);
    }

    contasPagas.forEach((item) => {
      const [ano, mes] = item.dataPrevista.split('T')[0].split('-').map(Number);
      const key = `${ano}-${String(mes).padStart(2, '0')}`;
      const row = mesesMap.get(key);
      if (row) row.total += item.valor;
    });

    return Array.from(mesesMap.values()).sort(
      (a, b) => (a.ano - b.ano) * 12 + (a.mes - b.mes)
    );
  }, [tipoRelatorio, dataInicio, dataFim, contasPagas]);

  /** Totais por mês apenas de contas recebidas (para resumido "Contas recebidas") */
  const totaisPorMesContasRecebidas = useMemo((): TotaisPorMesSimples[] => {
    if (tipoRelatorio !== 'contas_recebidas') return [];
    const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const fim = dataFim ? new Date(dataFim + 'T23:59:59') : null;
    if (!inicio || !fim) return [];

    const mesesMap = new Map<string, TotaisPorMesSimples>();
    let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);

    while (d <= fimMes) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesMap.set(key, {
        ano: d.getFullYear(),
        mes: d.getMonth() + 1,
        mesLabel: `${MESES_LABELS[d.getMonth() + 1]}/${d.getFullYear()}`,
        total: 0,
      });
      d.setMonth(d.getMonth() + 1);
    }

    contasRecebidas.forEach((item) => {
      const [ano, mes] = item.dataRecebimento.split('T')[0].split('-').map(Number);
      const key = `${ano}-${String(mes).padStart(2, '0')}`;
      const row = mesesMap.get(key);
      if (row) row.total += item.valor;
    });

    return Array.from(mesesMap.values()).sort(
      (a, b) => (a.ano - b.ano) * 12 + (a.mes - b.mes)
    );
  }, [tipoRelatorio, dataInicio, dataFim, contasRecebidas]);

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileBarChart className="text-primary" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">
            Relatórios configuráveis
          </h1>
        </div>
        <p className="text-gray-600">
          Selecione o tipo de relatório, o período (opcional) e clique em Gerar
          para visualizar os dados. A obra selecionada no topo da página será
          usada como filtro.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Configuração do relatório
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Tipo de relatório *
            </label>
            <select
              value={tipoRelatorio}
              onChange={(e) =>
                setTipoRelatorio(e.target.value as TipoRelatorio)
              }
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="contas_pagas">Contas pagas</option>
              <option value="contas_recebidas">Contas recebidas</option>
              <option value="contas_pagas_recebidas">
                Contas pagas x Contas recebidas
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
              <Calendar size={14} />
              Data início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
              <Calendar size={14} />
              Data fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={gerarRelatorio}
              disabled={loading || !obraSelecionada?.id}
              className="w-full px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Gerar relatório
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6 pt-4 border-t">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
              Formato do relatório
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formato"
                  checked={formatoRelatorio === 'detalhado'}
                  onChange={() => setFormatoRelatorio('detalhado')}
                  className="text-primary focus:ring-primary"
                />
                <LayoutList size={18} className="text-gray-500" />
                <span className="text-sm">Detalhado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formato"
                  checked={formatoRelatorio === 'resumido'}
                  onChange={() => setFormatoRelatorio('resumido')}
                  className="text-primary focus:ring-primary"
                />
                <PieChart size={18} className="text-gray-500" />
                <span className="text-sm">Resumido</span>
              </label>
            </div>
          </div>
        </div>

        {!obraSelecionada?.id && (
          <p className="text-amber-600 text-sm">
            Selecione uma obra no seletor do topo da página para gerar
            relatórios.
          </p>
        )}
      </div>

      {temResultado && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={baixarPDF}
            disabled={pdfGerando}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md flex items-center gap-2 transition-colors"
          >
            {pdfGerando ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileDown size={18} />
                Baixar PDF
              </>
            )}
          </button>
        </div>
      )}

      {temResultado && formatoRelatorio === 'resumido' && (
        <div className="space-y-6">
          {tipoRelatorio === 'contas_pagas_recebidas' &&
            dataInicio &&
            dataFim && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  <h3 className="font-semibold text-gray-900">
                    Resumo por mês — {formatarData(dataInicio)} a{' '}
                    {formatarData(dataFim)}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-600">
                        <th className="px-4 py-3 font-medium">Mês</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Contas pagas (total)
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Contas recebidas (total)
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {totaisPorMes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            Nenhum dado no período selecionado.
                          </td>
                        </tr>
                      ) : (
                        totaisPorMes.map((row) => {
                          const saldo = row.totalRecebido - row.totalPago;
                          return (
                            <tr
                              key={`${row.ano}-${row.mes}`}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {row.mesLabel}
                              </td>
                              <td className="px-4 py-3 text-right text-red-700">
                                {formatarValor(row.totalPago)}
                              </td>
                              <td className="px-4 py-3 text-right text-green-700">
                                {formatarValor(row.totalRecebido)}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-medium ${saldo >= 0 ? 'text-green-700' : 'text-red-700'
                                  }`}
                              >
                                {formatarValor(saldo)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {totaisPorMes.length > 0 && (
                      <tfoot>
                        <tr className="bg-primary/5 font-semibold">
                          <td className="px-4 py-3">Total do período</td>
                          <td className="px-4 py-3 text-right text-red-700">
                            {formatarValor(totalPagas)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700">
                            {formatarValor(totalRecebidas)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right ${totalRecebidas - totalPagas >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                              }`}
                          >
                            {formatarValor(totalRecebidas - totalPagas)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

          {tipoRelatorio === 'contas_pagas_recebidas' &&
            (!dataInicio || !dataFim) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                Para exibir o resumo por mês, informe <strong>Data início</strong> e{' '}
                <strong>Data fim</strong> e clique em Gerar relatório.
              </div>
            )}

          {tipoRelatorio === 'contas_pagas' && dataInicio && dataFim && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                <h3 className="font-semibold text-gray-900">
                  Resumo por mês (Contas pagas) — {formatarData(dataInicio)} a{' '}
                  {formatarData(dataFim)}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-gray-600">
                      <th className="px-4 py-3 font-medium">Mês</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Total (contas pagas)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {totaisPorMesContasPagas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Nenhum dado no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      totaisPorMesContasPagas.map((row) => (
                        <tr
                          key={`${row.ano}-${row.mes}`}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {row.mesLabel}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-700">
                            {formatarValor(row.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {totaisPorMesContasPagas.length > 0 && (
                    <tfoot>
                      <tr className="bg-primary/5 font-semibold">
                        <td className="px-4 py-3">Total do período</td>
                        <td className="px-4 py-3 text-right text-red-700">
                          {formatarValor(totalPagas)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {tipoRelatorio === 'contas_pagas' && (!dataInicio || !dataFim) && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Total do período
                {dataInicio && dataFim
                  ? ` — ${formatarData(dataInicio)} a ${formatarData(dataFim)}`
                  : ''}
              </h3>
              <p className="text-2xl font-bold text-red-700">
                {formatarValor(totalPagas)}
              </p>
              <p className="text-sm text-amber-600 mt-2">
                Para ver o total por cada mês, informe Data início e Data fim
                e clique em Gerar relatório.
              </p>
            </div>
          )}

          {tipoRelatorio === 'contas_recebidas' && dataInicio && dataFim && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                <h3 className="font-semibold text-gray-900">
                  Resumo por mês (Contas recebidas) — {formatarData(dataInicio)} a{' '}
                  {formatarData(dataFim)}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-gray-600">
                      <th className="px-4 py-3 font-medium">Mês</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Total (contas recebidas)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {totaisPorMesContasRecebidas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Nenhum dado no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      totaisPorMesContasRecebidas.map((row) => (
                        <tr
                          key={`${row.ano}-${row.mes}`}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {row.mesLabel}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-700">
                            {formatarValor(row.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {totaisPorMesContasRecebidas.length > 0 && (
                    <tfoot>
                      <tr className="bg-primary/5 font-semibold">
                        <td className="px-4 py-3">Total do período</td>
                        <td className="px-4 py-3 text-right text-green-700">
                          {formatarValor(totalRecebidas)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {tipoRelatorio === 'contas_recebidas' && (!dataInicio || !dataFim) && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Total do período
                {dataInicio && dataFim
                  ? ` — ${formatarData(dataInicio)} a ${formatarData(dataFim)}`
                  : ''}
              </h3>
              <p className="text-2xl font-bold text-green-700">
                {formatarValor(totalRecebidas)}
              </p>
              <p className="text-sm text-amber-600 mt-2">
                Para ver o total por cada mês, informe Data início e Data fim
                e clique em Gerar relatório.
              </p>
            </div>
          )}
        </div>
      )}

      {temResultado && formatoRelatorio === 'detalhado' && (
        <div className="space-y-6">
          {(tipoRelatorio === 'contas_pagas' ||
            tipoRelatorio === 'contas_pagas_recebidas') &&
            contasPagas.length >= 0 && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                  <Receipt size={20} className="text-primary" />
                  <h3 className="font-semibold text-gray-900">
                    Contas pagas
                    {dataInicio || dataFim
                      ? ` (${dataInicio || '...'} a ${dataFim || '...'})`
                      : ''}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-600">
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Origem</th>
                        <th className="px-4 py-3">Fornecedor / Obra</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contasPagas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            Nenhuma conta paga no período.
                          </td>
                        </tr>
                      ) : (
                        contasPagas.map((item) => (
                          <tr
                            key={`${item.origem}-${item.id}`}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatarData(item.dataPrevista)}
                            </td>
                            <td className="px-4 py-3">{item.descricao}</td>
                            <td className="px-4 py-3 capitalize">
                              {item.origem}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.fornecedorOuObra || '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatarValor(item.valor)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {contasPagas.length > 0 && (
                      <tfoot>
                        <tr className="bg-primary/5 font-semibold">
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-right"
                          >
                            Total contas pagas
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatarValor(totalPagas)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

          {(tipoRelatorio === 'contas_recebidas' ||
            tipoRelatorio === 'contas_pagas_recebidas') &&
            contasRecebidas.length >= 0 && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  <h3 className="font-semibold text-gray-900">
                    Contas recebidas
                    {dataInicio || dataFim
                      ? ` (${dataInicio || '...'} a ${dataFim || '...'})`
                      : ''}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-600">
                        <th className="px-4 py-3">Data recebimento</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Forma</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contasRecebidas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            Nenhuma conta recebida no período.
                          </td>
                        </tr>
                      ) : (
                        contasRecebidas.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatarData(item.dataRecebimento)}
                            </td>
                            <td className="px-4 py-3">{item.descricao}</td>
                            <td className="px-4 py-3">{item.cliente}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.formaRecebimento || '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatarValor(item.valor)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {contasRecebidas.length > 0 && (
                      <tfoot>
                        <tr className="bg-primary/5 font-semibold">
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-right"
                          >
                            Total contas recebidas
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatarValor(totalRecebidas)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

          {tipoRelatorio === 'contas_pagas_recebidas' && temResultado && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft size={20} className="text-primary" />
                <h3 className="font-semibold text-gray-900">Resumo comparativo</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-red-50/50 border-red-100">
                  <p className="text-sm text-gray-600 mb-1">Total pago</p>
                  <p className="text-xl font-bold text-red-700">
                    {formatarValor(totalPagas)}
                  </p>
                </div>
                <div className="border rounded-lg p-4 bg-green-50/50 border-green-100">
                  <p className="text-sm text-gray-600 mb-1">Total recebido</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatarValor(totalRecebidas)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center gap-2">
                <DollarSign size={18} className="text-gray-500" />
                <span className="text-sm text-gray-600">Saldo do período: </span>
                <span
                  className={`font-semibold ${totalRecebidas - totalPagas >= 0
                    ? 'text-green-700'
                    : 'text-red-700'
                    }`}
                >
                  {formatarValor(totalRecebidas - totalPagas)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {!temResultado && !loading && obraSelecionada?.id && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
          <FileBarChart size={48} className="mx-auto mb-3 text-gray-300" />
          <p>Configure o relatório acima e clique em &quot;Gerar relatório&quot;.</p>
        </div>
      )}
    </main>
  );
}
