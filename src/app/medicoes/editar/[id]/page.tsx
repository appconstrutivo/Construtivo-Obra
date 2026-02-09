"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import {
  fetchMedicaoById,
  fetchItensMedicao,
  updateMedicao,
  updateItemMedicao,
  deleteItemMedicao,
  insertItemMedicao,
  fetchItensNegociacaoDisponiveisParaMedicao,
  fetchParcelasMedicaoByMedicao,
  insertParcelaMedicao,
  deleteParcelaMedicao,
  Medicao,
  ItemNegociacao,
  ParcelaMedicao
} from '@/lib/supabase';
import React from 'react';

type ItemMedicaoState = {
  id?: number;
  item_negociacao_id: number;
  descricao: string;
  unidade: string;
  quantidade_total: number;
  quantidade_medida: number;
  percentual_executado: number;
  valor_unitario: number;
  valor_total: number;
};

interface PageParams {
  id: string;
}

export default function EditarMedicaoPage({ params }: any) {
  const resolvedParams = React.use(params) as PageParams;
  const router = useRouter();
  const id = parseInt(resolvedParams.id);

  const [medicao, setMedicao] = useState<Medicao | null>(null);
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemNegociacao[]>([]);
  const [itensMedicao, setItensMedicao] = useState<ItemMedicaoState[]>([]);
  const [itensExcluidos, setItensExcluidos] = useState<number[]>([]);
  const [itensModificados, setItensModificados] = useState<Set<number>>(new Set());

  const [parcelas, setParcelas] = useState<{
    id?: number;
    data_prevista: string;
    valor: number;
    descricao: string;
  }[]>([]);
  const [parcelaForm, setParcelaForm] = useState({
    data_prevista: '',
    valor: 0,
    descricao: ''
  });
  const [parcelasOriginais, setParcelasOriginais] = useState<ParcelaMedicao[]>([]);

  const [formData, setFormData] = useState({
    data_inicio: '',
    data_fim: '',
    desconto: 0,
    observacao: ''
  });

  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoadingDados(true);
      try {
        const medicaoData = await fetchMedicaoById(id);

        if (!medicaoData) {
          alert('Medição não encontrada');
          router.push('/medicoes');
          return;
        }

        setMedicao(medicaoData);

        const formatarDataISO = (dataString: string | null) => {
          if (!dataString) return '';
          return new Date(dataString).toISOString().split('T')[0];
        };

        setFormData({
          data_inicio: formatarDataISO(medicaoData.data_inicio),
          data_fim: formatarDataISO(medicaoData.data_fim),
          desconto: medicaoData.desconto || 0,
          observacao: medicaoData.observacao || ''
        });

        const itensMedicaoData = await fetchItensMedicao(id);
        const itensFormatados = itensMedicaoData.map(item => ({
          id: item.id,
          item_negociacao_id: item.item_negociacao_id,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade_total: item.quantidade_total,
          quantidade_medida: item.quantidade_medida,
          percentual_executado: item.percentual_executado,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total
        }));
        setItensMedicao(itensFormatados);

        const itensNegociacao = await fetchItensNegociacaoDisponiveisParaMedicao(
          medicaoData.negociacao_id,
          id
        );
        setItensDisponiveis(itensNegociacao);

        const parcelasData = await fetchParcelasMedicaoByMedicao(id);
        setParcelasOriginais(parcelasData);
        setParcelas(parcelasData.map((p: ParcelaMedicao) => ({
          id: p.id,
          data_prevista: p.data_prevista.split('T')[0],
          valor: p.valor,
          descricao: p.descricao || ''
        })));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados da medição');
        router.push('/medicoes');
      } finally {
        setLoadingDados(false);
      }
    };

    carregarDados();
  }, [id, router]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getQuantidadeDisponivel = (itemNegociacaoId: number) => {
    const item = itensDisponiveis.find(i => i.id === itemNegociacaoId);
    return item?.quantidade_disponivel ?? 0;
  };

  const handleAdicionarItem = (item: ItemNegociacao) => {
    if (item.totalmente_medido) {
      alert('Este item já foi totalmente executado e não pode ser medido novamente.');
      return;
    }
    if (itensMedicao.some(i => i.item_negociacao_id === item.id)) return;

    const novoItem: ItemMedicaoState = {
      item_negociacao_id: item.id,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade_total: item.quantidade,
      quantidade_medida: 0,
      percentual_executado: 0,
      valor_unitario: item.valor_unitario,
      valor_total: 0
    };
    setItensMedicao(prev => [...prev, novoItem]);
  };

  const handleRemoverItem = (index: number) => {
    const item = itensMedicao[index];
    if (item.id) setItensExcluidos(prev => [...prev, item.id!]);
    setItensMedicao(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantidadeChange = (index: number, valor: number) => {
    const item = itensMedicao[index];
    const disponivel = getQuantidadeDisponivel(item.item_negociacao_id);
    const max = item.quantidade_medida + disponivel;
    const valorFinal = Math.min(Math.max(0, valor), max);

    setItensMedicao(prev => {
      const novo = [...prev];
      const atual = novo[index];
      const percentual = (valorFinal / atual.quantidade_total) * 100;
      const valorTotal = valorFinal * atual.valor_unitario;
      novo[index] = {
        ...atual,
        quantidade_medida: valorFinal,
        percentual_executado: percentual,
        valor_total: valorTotal
      };
      return novo;
    });
    if (item.id) setItensModificados(prev => new Set([...prev, item.id!]));
  };

  const calcularTotalMedicao = () => itensMedicao.reduce((t, i) => t + i.valor_total, 0);
  const calcularTotalComDesconto = () => calcularTotalMedicao() - formData.desconto;
  const calcularTotalParcelas = () => parcelas.reduce((t, p) => t + p.valor, 0);

  const formatarValor = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatarData = (dataString: string) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const adicionarParcela = () => {
    if (!parcelaForm.data_prevista || parcelaForm.valor <= 0) {
      alert('Preencha a data e o valor da parcela');
      return;
    }
    setParcelas(prev => [...prev, { ...parcelaForm }]);
    setParcelaForm({ data_prevista: '', valor: 0, descricao: '' });
  };

  const removerParcela = (index: number) => {
    setParcelas(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data_inicio || !formData.data_fim) {
      alert('Preencha as datas de início e fim');
      return;
    }
    if (itensMedicao.length === 0) {
      alert('Adicione pelo menos um item à medição');
      return;
    }
    const temItemZerado = itensMedicao.some(i => i.quantidade_medida <= 0);
    if (temItemZerado) {
      alert('Todos os itens devem ter quantidade a medir maior que zero');
      return;
    }

    setLoading(true);
    try {
      await updateMedicao(
        id,
        formData.data_inicio,
        formData.data_fim,
        undefined,
        Number(formData.desconto),
        formData.observacao || undefined
      );

      for (const itemId of itensExcluidos) {
        await deleteItemMedicao(itemId);
      }

      for (const item of itensMedicao) {
        if (item.id) {
          if (itensModificados.has(item.id)) {
            await updateItemMedicao(item.id, item.quantidade_medida);
          }
        } else {
          await insertItemMedicao(
            id,
            item.item_negociacao_id,
            item.descricao,
            item.unidade,
            item.quantidade_total,
            item.quantidade_medida,
            item.valor_unitario
          );
        }
      }

      for (const parcelaOriginal of parcelasOriginais) {
        await deleteParcelaMedicao(parcelaOriginal.id);
      }
      for (const parcela of parcelas) {
        await insertParcelaMedicao(id, parcela.data_prevista, parcela.valor, parcela.descricao);
      }

      alert('Medição atualizada com sucesso!');
      router.push('/medicoes');
    } catch (error) {
      console.error('Erro ao atualizar medição:', error);
      alert('Erro ao atualizar medição. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingDados) {
    return (
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex justify-center items-center h-full">
          <p>Carregando dados da medição...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/medicoes"
          className="p-2.5 rounded-full hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 md:mr-4 md:p-2"
          aria-label="Voltar"
        >
          <ArrowLeft size={22} className="md:w-5 md:h-5" />
        </Link>
        <h1 className="text-xl font-bold md:text-2xl">EDITAR MEDIÇÃO</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6 p-4 md:p-6">
          <h2 className="text-base font-medium mb-4 md:text-lg">Informações da Medição</h2>

          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contrato / Negociação</label>
            <div className="p-3 md:p-2 border border-gray-300 rounded-lg bg-gray-50">
              <p className="font-medium text-gray-900">
                {medicao?.negociacao?.numero} - {medicao?.negociacao?.descricao}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Fornecedor: {medicao?.negociacao?.fornecedor?.nome}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início*</label>
              <input
                type="date"
                name="data_inicio"
                className="w-full p-3 md:p-2 min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                value={formData.data_inicio}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim*</label>
              <input
                type="date"
                name="data_fim"
                className="w-full p-3 md:p-2 min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                value={formData.data_fim}
                onChange={handleFormChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label>
              <input
                type="number"
                name="desconto"
                min="0"
                step="0.01"
                className="w-full p-3 md:p-2 min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                value={formData.desconto}
                onChange={handleFormChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
              <textarea
                name="observacao"
                className="w-full p-3 md:p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[100px] md:min-h-0"
                rows={3}
                value={formData.observacao}
                onChange={handleFormChange}
                placeholder="Informações adicionais sobre esta medição..."
              />
            </div>
          </div>
        </div>

        {medicao && (
          <>
            <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6">
              <h2 className="text-base font-medium p-4 md:p-6 pb-3 border-b md:text-lg">Itens Disponíveis</h2>

              {/* Lista em cards — apenas mobile */}
              <div className="md:hidden p-4 space-y-3">
                {itensDisponiveis.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">Nenhum item disponível nesta negociação</p>
                ) : (
                  itensDisponiveis.map((item) => {
                    const jaNaMedicao = itensMedicao.some(i => i.item_negociacao_id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 ${item.totalmente_medido ? 'bg-gray-50 opacity-75' : 'border-gray-100'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm">{item.descricao}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.quantidade} {item.unidade} · {formatarValor(item.valor_unitario)}/un
                            </p>
                            {item.quantidade_ja_medida != null && item.quantidade_ja_medida > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                Já medido: {item.quantidade_ja_medida} {item.unidade}
                                {!item.totalmente_medido && item.quantidade_disponivel != null && (
                                  <> · Disp.: {item.quantidade_disponivel}</>
                                )}
                              </p>
                            )}
                            {item.totalmente_medido && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                100% EXECUTADO
                              </span>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {item.totalmente_medido ? (
                              <span className="text-gray-400 text-sm">—</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAdicionarItem(item)}
                                disabled={jaNaMedicao}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Adicionar à medição"
                              >
                                <Plus size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tabela — apenas desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">DESCRIÇÃO</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">UNID.</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">QUANTIDADE</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR UNIT.</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR TOTAL</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itensDisponiveis.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          Nenhum item disponível nesta negociação
                        </td>
                      </tr>
                    ) : (
                      itensDisponiveis.map((item) => {
                        const jaNaMedicao = itensMedicao.some(i => i.item_negociacao_id === item.id);
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-gray-50 ${item.totalmente_medido ? 'bg-gray-100' : ''}`}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className={`font-medium ${item.totalmente_medido ? 'text-gray-500' : ''}`}>
                                  {item.descricao}
                                  {item.totalmente_medido && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                      100% EXECUTADO
                                    </span>
                                  )}
                                </div>
                                {item.quantidade_ja_medida != null && item.quantidade_ja_medida > 0 && (
                                  <div className="text-sm text-gray-500">
                                    Já medido: {item.quantidade_ja_medida} {item.unidade}
                                    {!item.totalmente_medido && (
                                      <> | Disponível: {item.quantidade_disponivel} {item.unidade}</>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">{item.unidade}</td>
                            <td className="px-6 py-4">
                              <div>
                                <div>{item.quantidade}</div>
                                {item.quantidade_ja_medida != null && item.quantidade_ja_medida > 0 && (
                                  <div
                                    className={`text-sm ${item.totalmente_medido ? 'text-green-700 font-medium' : 'text-green-600'}`}
                                  >
                                    {item.percentual_executado?.toFixed(1)}% executado
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">{formatarValor(item.valor_unitario)}</td>
                            <td className="px-6 py-4">{formatarValor(item.valor_total ?? 0)}</td>
                            <td className="px-6 py-4">
                              {item.totalmente_medido ? (
                                <span className="text-gray-400 cursor-not-allowed" title="Item totalmente executado">
                                  🚫
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAdicionarItem(item)}
                                  className="text-blue-600 hover:text-blue-800"
                                  disabled={jaNaMedicao}
                                  title="Adicionar item à medição"
                                >
                                  <Plus size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6">
              <h2 className="text-base font-medium p-4 md:p-6 pb-3 border-b md:text-lg">Itens da Medição</h2>
              {itensMedicao.length === 0 ? (
                <p className="p-4 md:p-6 text-center text-gray-500 text-sm">
                  Nenhum item adicionado à medição. Adicione itens da lista acima.
                </p>
              ) : (
                <>
                  {/* Lista em cards — apenas mobile */}
                  <div className="md:hidden p-4 space-y-4">
                    {itensMedicao.map((item, index) => {
                      const disponivel = getQuantidadeDisponivel(item.item_negociacao_id);
                      const max = item.quantidade_medida + disponivel;
                      return (
                        <div key={item.item_negociacao_id + (item.id ?? 0)} className="border border-gray-100 rounded-xl p-4">
                          <p className="font-medium text-gray-900 text-sm mb-2">{item.descricao}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
                            <span>{item.quantidade_total} {item.unidade} total</span>
                            <span>{formatarValor(item.valor_unitario)}/un</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <label className="text-sm font-medium text-gray-700">Qtd a medir:</label>
                            <input
                              type="number"
                              className="w-24 p-2.5 min-h-[44px] border border-gray-300 rounded-lg text-base"
                              value={item.quantidade_medida}
                              onChange={(e) =>
                                handleQuantidadeChange(index, parseFloat(e.target.value) || 0)
                              }
                              min={0}
                              max={max}
                              step="0.001"
                            />
                            {disponivel > 0 && (
                              <span className="text-xs text-gray-500">Máx: {max}</span>
                            )}
                            <span className="text-sm text-gray-600">
                              {item.percentual_executado.toFixed(1)}% · {formatarValor(item.valor_total)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoverItem(index)}
                              className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                              aria-label="Remover item"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-3 border-t border-gray-100 font-medium text-gray-900">
                      Total da Medição: {formatarValor(calcularTotalMedicao())}
                    </div>
                    {formData.desconto > 0 && (
                      <div className="text-sm text-red-600">
                        Desconto: -{formatarValor(formData.desconto)} · Total com desconto: {formatarValor(calcularTotalComDesconto())}
                      </div>
                    )}
                  </div>

                  {/* Tabela — apenas desktop */}
                  <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">DESCRIÇÃO</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">UNID.</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">QUANTIDADE TOTAL</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">QUANTIDADE A MEDIR</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">% EXECUTADO</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR UNIT.</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR TOTAL</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {itensMedicao.map((item, index) => {
                        const disponivel = getQuantidadeDisponivel(item.item_negociacao_id);
                        const max = item.quantidade_medida + disponivel;
                        return (
                          <tr key={item.item_negociacao_id + (item.id ?? 0)} className="hover:bg-gray-50">
                            <td className="px-6 py-4">{item.descricao}</td>
                            <td className="px-6 py-4">{item.unidade}</td>
                            <td className="px-6 py-4">{item.quantidade_total}</td>
                            <td className="px-6 py-4">
                              <div>
                                <input
                                  type="number"
                                  className="w-32 p-1 border border-gray-300 rounded-md"
                                  value={item.quantidade_medida}
                                  onChange={(e) =>
                                    handleQuantidadeChange(index, parseFloat(e.target.value) || 0)
                                  }
                                  min={0}
                                  max={max}
                                  step="0.001"
                                />
                                {disponivel > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">Máx: {max}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">{item.percentual_executado.toFixed(2)}%</td>
                            <td className="px-6 py-4">{formatarValor(item.valor_unitario)}</td>
                            <td className="px-6 py-4">{formatarValor(item.valor_total)}</td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => handleRemoverItem(index)}
                                className="text-red-600 hover:text-red-800"
                                title="Remover item"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-3 text-right font-medium">
                          Total da Medição:
                        </td>
                        <td className="px-6 py-3 font-medium">
                          {formatarValor(calcularTotalMedicao())}
                        </td>
                        <td></td>
                      </tr>
                      {formData.desconto > 0 && (
                        <>
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3 text-right font-medium text-red-600">
                              Desconto:
                            </td>
                            <td className="px-6 py-3 font-medium text-red-600">
                              -{formatarValor(formData.desconto)}
                            </td>
                            <td></td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3 text-right font-medium">
                              Total com Desconto:
                            </td>
                            <td className="px-6 py-3 font-medium">
                              {formatarValor(calcularTotalComDesconto())}
                            </td>
                            <td></td>
                          </tr>
                        </>
                      )}
                    </tfoot>
                  </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="bg-white shadow-sm rounded-xl overflow-hidden mb-6 p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h2 className="text-base font-semibold md:text-lg">Previsão de Desembolso</h2>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">Opcional</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="data-parcela" className="block text-sm font-medium text-gray-700 mb-1">
                Data Prevista
              </label>
              <input
                type="date"
                id="data-parcela"
                className="w-full p-3 md:p-2 min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                value={parcelaForm.data_prevista}
                onChange={(e) => setParcelaForm(prev => ({ ...prev, data_prevista: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="valor-parcela" className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                id="valor-parcela"
                min="0"
                step="any"
                className="w-full p-3 md:p-2 min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                value={parcelaForm.valor || ''}
                onChange={(e) =>
                  setParcelaForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <label htmlFor="descricao-parcela" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição (opcional)
              </label>
              <div className="flex flex-col gap-2 md:flex-row md:gap-2">
                <input
                  type="text"
                  id="descricao-parcela"
                  className="flex-1 p-3 md:p-2 min-h-[48px] md:min-h-0 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  value={parcelaForm.descricao}
                  onChange={(e) => setParcelaForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Entrada, 1ª parcela, etc."
                />
                <button
                  type="button"
                  onClick={adicionarParcela}
                  className="min-h-[48px] md:min-h-0 px-4 py-3 md:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  Adicionar parcela
                </button>
              </div>
            </div>
          </div>

          {/* Lista de parcelas em cards — apenas mobile */}
          <div className="md:hidden space-y-3 mb-4">
            {parcelas.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">Nenhuma parcela adicionada</p>
            ) : (
              parcelas.map((parcela, index) => (
                <div key={index} className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-gray-900">{formatarData(parcela.data_prevista)}</p>
                    <p className="text-sm text-gray-600">{parcela.descricao || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <button
                      type="button"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      onClick={() => removerParcela(index)}
                      aria-label="Remover parcela"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
            {parcelas.length > 0 && (
              <p className="text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
                Total das parcelas: {formatarValor(calcularTotalParcelas())}
              </p>
            )}
          </div>

          {/* Tabela de parcelas — apenas desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DATA PREVISTA
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VALOR
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DESCRIÇÃO
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AÇÃO
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parcelas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-center text-sm text-gray-500">
                      Nenhuma parcela adicionada
                    </td>
                  </tr>
                ) : (
                  parcelas.map((parcela, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">{formatarData(parcela.data_prevista)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-2">{parcela.descricao || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900"
                          onClick={() => removerParcela(index)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={1} className="px-4 py-2 text-right font-medium">
                    Total das Parcelas:
                  </td>
                  <td colSpan={3} className="px-4 py-2 font-bold">
                    {formatarValor(calcularTotalParcelas())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-6 md:flex-row md:justify-end md:space-x-4 md:gap-0">
          <Link
            href="/medicoes"
            className="w-full md:w-auto min-h-[48px] md:min-h-0 px-4 py-3 md:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <ArrowLeft size={18} />
            <span>Cancelar</span>
          </Link>
          <button
            type="submit"
            className="w-full md:w-auto min-h-[48px] md:min-h-0 px-4 py-3 md:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-70"
            disabled={loading}
          >
            <Save size={18} />
            <span>{loading ? 'Salvando...' : 'Salvar Medição'}</span>
          </button>
        </div>
      </form>
    </main>
  );
}
