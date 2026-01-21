"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { 
  fetchNegociacoes, 
  Negociacao, 
  insertMedicao, 
  fetchItensNegociacaoDisponiveisParaMedicao, 
  ItemNegociacao, 
  insertItemMedicao,
  insertParcelaMedicao
} from '@/lib/supabase';
import { useNotification } from '@/components/ui/notification';
import { useObra } from '@/contexts/ObraContext';

export default function NovaMedicaoPage() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const { obraSelecionada } = useObra();
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Form states
  const [negociacaoId, setNegociacaoId] = useState<number | null>(null);
  const [negociacaoSelecionada, setNegociacaoSelecionada] = useState<Negociacao | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [observacao, setObservacao] = useState('');
  const [desconto, setDesconto] = useState<number>(0);
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemNegociacao[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<ItemNegociacao[]>([]);
  const [quantidadesAMedir, setQuantidadesAMedir] = useState<Record<number, number>>({});
  
  // Estados para previsão de desembolso
  const [parcelas, setParcelas] = useState<{
    data_prevista: string;
    valor: number;
    descricao: string;
  }[]>([]);
  const [parcelaForm, setParcelaForm] = useState({
    data_prevista: '',
    valor: 0,
    descricao: ''
  });
  
  // Carregar negociações disponíveis
  useEffect(() => {
    const carregarNegociacoes = async () => {
      setLoading(true);
      try {
        const data = await fetchNegociacoes();
        setNegociacoes(data);
      } catch (error) {
        console.error('Erro ao carregar negociações:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarNegociacoes();
  }, []);
  
  // Quando selecionar uma negociação, carregar seus itens disponíveis
  useEffect(() => {
    if (!negociacaoId) return;
    
    const carregarItensDisponiveis = async () => {
      try {
        const negociacaoSelecionada = negociacoes.find(n => n.id === negociacaoId) || null;
        setNegociacaoSelecionada(negociacaoSelecionada);
        
        const itens = await fetchItensNegociacaoDisponiveisParaMedicao(negociacaoId);
        setItensDisponiveis(itens);
      } catch (error) {
        console.error('Erro ao carregar itens da negociação:', error);
      }
    };
    
    carregarItensDisponiveis();
  }, [negociacaoId, negociacoes]);
  
  const handleNegociacaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    setNegociacaoId(id || null);
    // Limpar os itens selecionados quando trocar de negociação
    setItensSelecionados([]);
    setQuantidadesAMedir({});
  };
  
  const handleAdicionarItem = (item: ItemNegociacao) => {
    // Verificar se o item está totalmente medido
    if (item.totalmente_medido) {
      alert('Este item já foi totalmente executado e não pode ser medido novamente.');
      return;
    }
    
    setItensSelecionados((prev) => [...prev, item]);
    setQuantidadesAMedir((prev) => ({
      ...prev,
      [item.id]: 0
    }));
  };
  
  const handleRemoverItem = (id: number) => {
    setItensSelecionados((prev) => prev.filter(item => item.id !== id));
    setQuantidadesAMedir((prev) => {
      const newQuantidades = { ...prev };
      delete newQuantidades[id];
      return newQuantidades;
    });
  };
  
  const handleQuantidadeChange = (id: number, valor: number) => {
    // Encontrar o item para verificar a quantidade disponível
    const item = itensSelecionados.find(i => i.id === id);
    if (item) {
      const quantidadeDisponivel = item.quantidade_disponivel || item.quantidade;
      // Limitar o valor à quantidade disponível
      const valorFinal = Math.min(valor, quantidadeDisponivel);
      
      setQuantidadesAMedir((prev) => ({
        ...prev,
        [id]: valorFinal
      }));
    }
  };
  
  const calcularPercentualExecutado = (itemId: number) => {
    const item = itensSelecionados.find(i => i.id === itemId);
    if (!item) return 0;
    
    const qtdMedida = quantidadesAMedir[itemId] || 0;
    return (qtdMedida / item.quantidade) * 100;
  };
  
  const calcularValorTotal = (itemId: number) => {
    const item = itensSelecionados.find(i => i.id === itemId);
    if (!item) return 0;
    
    const qtdMedida = quantidadesAMedir[itemId] || 0;
    return qtdMedida * item.valor_unitario;
  };
  
  const calcularTotalMedicao = () => {
    return itensSelecionados.reduce((total, item) => {
      return total + calcularValorTotal(item.id);
    }, 0);
  };
  
  const calcularTotalComDesconto = () => {
    const total = calcularTotalMedicao();
    return total - desconto;
  };
  
  const calcularTotalParcelas = () => {
    return parcelas.reduce((total, parcela) => total + parcela.valor, 0);
  };
  
  const adicionarParcela = () => {
    if (!parcelaForm.data_prevista || parcelaForm.valor <= 0) {
      showNotification({
        title: "Dados incompletos",
        message: "Preencha a data e o valor da parcela",
        type: "warning"
      });
      return;
    }

    setParcelas([...parcelas, { ...parcelaForm }]);
    
    // Limpar o formulário
    setParcelaForm({
      data_prevista: '',
      valor: 0,
      descricao: ''
    });
  };
  
  const removerParcela = (index: number) => {
    setParcelas(parcelas.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!negociacaoId || !dataInicio || !dataFim) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    
    if (itensSelecionados.length === 0) {
      alert('Adicione pelo menos um item à medição');
      return;
    }
    
    // Verificar se tem algum item com quantidade zero
    const temItemZerado = Object.values(quantidadesAMedir).some(qtd => qtd <= 0);
    if (temItemZerado) {
      alert('Todos os itens devem ter quantidade a medir maior que zero');
      return;
    }
    
    // Verificar se algum item excede a quantidade disponível
    const temItemExcedente = itensSelecionados.some(item => {
      const qtdMedir = quantidadesAMedir[item.id];
      const qtdDisponivel = item.quantidade_disponivel || item.quantidade;
      return qtdMedir > qtdDisponivel;
    });
    
    if (temItemExcedente) {
      alert('A quantidade a medir não pode exceder a quantidade disponível para alguns itens');
      return;
    }
    
    setSalvando(true);
    
    try {
      // 1. Criar a medição
      const medicao = await insertMedicao(
        negociacaoId,
        dataInicio,
        dataFim,
        observacao,
        desconto,
        obraSelecionada?.id || null
      );
      
      // 2. Adicionar os itens da medição
      for (const item of itensSelecionados) {
        await insertItemMedicao(
          medicao.id,
          item.id,
          item.descricao,
          item.unidade,
          item.quantidade,
          quantidadesAMedir[item.id],
          item.valor_unitario
        );
      }
      
      // 3. Adicionar as parcelas de previsão de desembolso
      for (const parcela of parcelas) {
        await insertParcelaMedicao(
          medicao.id,
          parcela.data_prevista,
          parcela.valor,
          parcela.descricao
        );
      }
      
      // Exibir notificação de sucesso
      showNotification({
        title: 'Medição realizada com sucesso',
        message: 'A medição foi cadastrada no sistema',
        type: 'success',
        duration: 5000
      });
      
      // 3. Redirecionar para a lista de medições
      router.push('/medicoes');
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      alert('Erro ao salvar medição. Verifique o console para mais detalhes.');
    } finally {
      setSalvando(false);
    }
  };
  
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (dataString: string) => {
    // Converte de YYYY-MM-DD para DD/MM/YYYY sem problemas de timezone
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  
  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex items-center mb-6">
        <Link 
          href="/medicoes" 
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">NOVA MEDIÇÃO</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 p-6">
          <h2 className="text-lg font-medium mb-4">Informações da Medição</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contrato / Negociação*
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={negociacaoId || ''}
              onChange={handleNegociacaoChange}
              required
            >
              <option value="">Selecione um contrato</option>
              {negociacoes.map((negociacao) => (
                <option key={negociacao.id} value={negociacao.id}>
                  {negociacao.fornecedor?.nome} - {negociacao.numero}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início*
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim*
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desconto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={desconto}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observação
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Informações adicionais sobre esta medição..."
              />
            </div>
          </div>
        </div>
        
        {negociacaoSelecionada && (
          <>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
              <h2 className="text-lg font-medium p-6 pb-3 border-b">Itens Disponíveis</h2>
              
              <div className="overflow-x-auto">
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
                      itensDisponiveis.map((item) => (
                        <tr key={item.id} className={`hover:bg-gray-50 ${item.totalmente_medido ? 'bg-gray-100' : ''}`}>
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
                              {item.quantidade_ja_medida && item.quantidade_ja_medida > 0 && (
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
                              {item.quantidade_ja_medida && item.quantidade_ja_medida > 0 && (
                                <div className={`text-sm ${item.totalmente_medido ? 'text-green-700 font-medium' : 'text-green-600'}`}>
                                  {item.percentual_executado?.toFixed(1)}% executado
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">{formatarValor(item.valor_unitario)}</td>
                          <td className="px-6 py-4">{formatarValor(item.valor_total)}</td>
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
                                disabled={itensSelecionados.some(i => i.id === item.id)}
                                title="Adicionar item à medição"
                              >
                                +
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
              <h2 className="text-lg font-medium p-6 pb-3 border-b">Itens da Medição</h2>
              
              {itensSelecionados.length === 0 ? (
                <p className="p-6 text-center text-gray-500">
                  Nenhum item adicionado à medição. Adicione itens da lista acima.
                </p>
              ) : (
                <div className="overflow-x-auto">
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
                      {itensSelecionados.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">{item.descricao}</td>
                          <td className="px-6 py-4">{item.unidade}</td>
                          <td className="px-6 py-4">{item.quantidade}</td>
                          <td className="px-6 py-4">
                            <div>
                              <input
                                type="number"
                                className="w-32 p-1 border border-gray-300 rounded-md"
                                value={quantidadesAMedir[item.id] || 0}
                                onChange={(e) => handleQuantidadeChange(item.id, Number(e.target.value))}
                                min="0"
                                max={item.quantidade_disponivel || item.quantidade}
                                step="0.001"
                              />
                              {item.quantidade_disponivel && item.quantidade_disponivel < item.quantidade && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Máx: {item.quantidade_disponivel}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">{calcularPercentualExecutado(item.id).toFixed(2)}%</td>
                          <td className="px-6 py-4">{formatarValor(item.valor_unitario)}</td>
                          <td className="px-6 py-4">{formatarValor(calcularValorTotal(item.id))}</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleRemoverItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
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
                      {desconto > 0 && (
                        <>
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3 text-right font-medium text-red-600">
                              Desconto:
                            </td>
                            <td className="px-6 py-3 font-medium text-red-600">
                              -{formatarValor(desconto)}
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
              )}
            </div>
          </>
        )}
        
        {/* Seção de Previsão de Desembolso */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Previsão de Desembolso</h2>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">Opcional</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="data-parcela" className="block text-sm font-medium text-gray-700 mb-1">
                Data Prevista
              </label>
              <input
                type="date"
                id="data-parcela"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={parcelaForm.valor || ''}
                onChange={(e) => setParcelaForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <label htmlFor="descricao-parcela" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="descricao-parcela"
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={parcelaForm.descricao}
                  onChange={(e) => setParcelaForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Entrada, 1ª parcela, etc."
                />
                <button
                  type="button"
                  onClick={adicionarParcela}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
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
                      <td className="px-4 py-2 whitespace-nowrap">
                        {formatarData(parcela.data_prevista)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-2">
                        {parcela.descricao || '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900"
                          onClick={() => removerParcela(index)}
                        >
                          🗑️
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
        
        <div className="flex justify-end mt-6 space-x-4">
          <Link 
            href="/medicoes" 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>Cancelar</span>
          </Link>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            disabled={salvando}
          >
            <Save size={16} />
            <span>{salvando ? 'Salvando...' : 'Salvar Medição'}</span>
          </button>
        </div>
      </form>
    </main>
  );
} 