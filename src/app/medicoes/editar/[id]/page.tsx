"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Search, Plus, Trash2, Edit } from 'lucide-react';
import { 
  fetchMedicaoById,
  fetchItensMedicao,
  updateMedicao,
  updateItemMedicao,
  deleteItemMedicao,
  insertItemMedicao,
  fetchNegociacaoById,
  fetchItensNegociacaoDisponiveisParaMedicao,
  fetchParcelasMedicaoByMedicao,
  insertParcelaMedicao,
  updateParcelaMedicao,
  deleteParcelaMedicao,
  Medicao,
  ItemMedicao,
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

// Definindo a interface para os parâmetros da rota
interface PageParams {
  id: string;
}

export default function EditarMedicaoPage({ params }: any) {
  // Usando React.use() para acessar os parâmetros, conforme exigido pelo Next.js 15
  const resolvedParams = React.use(params) as PageParams;
  const router = useRouter();
  const id = parseInt(resolvedParams.id);
  
  const [medicao, setMedicao] = useState<Medicao | null>(null);
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemNegociacao[]>([]);
  const [itensFiltrados, setItensFiltrados] = useState<ItemNegociacao[]>([]);
  const [itensMedicao, setItensMedicao] = useState<ItemMedicaoState[]>([]);
  const [itensExcluidos, setItensExcluidos] = useState<number[]>([]);
  const [itensModificados, setItensModificados] = useState<Set<number>>(new Set());
  
  // Estados para previsão de desembolso
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
  
  const [termoBusca, setTermoBusca] = useState('');
  const [exibirDropdown, setExibirDropdown] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemNegociacao | null>(null);
  
  const [formData, setFormData] = useState({
    data_inicio: '',
    data_fim: '',
    desconto: 0
  });
  
  const [itemForm, setItemForm] = useState({
    quantidade_medida: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  
  // Carregar dados da medição
  useEffect(() => {
    const carregarDados = async () => {
      setLoadingDados(true);
      try {
        // Carregar dados em paralelo para ser mais rápido
        const medicaoData = await fetchMedicaoById(id);
        
        if (!medicaoData) {
          alert('Medição não encontrada');
          router.push('/medicoes');
          return;
        }
        
        setMedicao(medicaoData);
        
        // Formatar datas para o formato esperado pelo input date
        const formatarDataISO = (dataString: string | null) => {
          if (!dataString) return '';
          return new Date(dataString).toISOString().split('T')[0];
        };
        
        setFormData({
          data_inicio: formatarDataISO(medicaoData.data_inicio),
          data_fim: formatarDataISO(medicaoData.data_fim),
          desconto: medicaoData.desconto || 0
        });
        
        // Carregar itens da medição
        const itensMedicaoData = await fetchItensMedicao(id);
        
        // Mapear itens da medição para o formato interno
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
        
        // Carregar itens disponíveis para medição
        const negociacao = await fetchNegociacaoById(medicaoData.negociacao_id);
        const itensNegociacao = await fetchItensNegociacaoDisponiveisParaMedicao(
          medicaoData.negociacao_id,
          id // Passar o ID da medição atual para incluir os itens já medidos
        );
        
        setItensDisponiveis(itensNegociacao);
        
        // Carregar parcelas de previsão de desembolso
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
  
  // Filtrar itens disponíveis com base no termo de busca
  useEffect(() => {
    if (!termoBusca.trim()) {
      setItensFiltrados([]);
      return;
    }

    const termoLowerCase = termoBusca.toLowerCase();
    const filtrados = itensDisponiveis.filter(
      item => 
        item.descricao.toLowerCase().includes(termoLowerCase)
    );
    
    setItensFiltrados(filtrados.slice(0, 10)); // Limitar a 10 resultados
  }, [termoBusca, itensDisponiveis]);
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleBuscarItem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTermoBusca(value);
    
    // Mostrar o dropdown quando houver texto
    setExibirDropdown(value.trim().length > 0);
  };
  
  const handleSelecionarItem = (item: ItemNegociacao) => {
    // Verificar se o item está totalmente medido
    if (item.totalmente_medido) {
      alert('Este item já foi totalmente executado e não pode ser medido novamente.');
      setTermoBusca('');
      setExibirDropdown(false);
      return;
    }
    
    setItemSelecionado(item);
    setExibirDropdown(false);
    
    // Preencher o formulário com os dados do item
    setItemForm({
      quantidade_medida: 0 // Quantidade medida precisa ser definida pelo usuário
    });
    
    // Atualizar o termo de busca com a descrição do item
    setTermoBusca(item.descricao);
  };
  
  const adicionarItem = () => {
    if (!itemSelecionado) {
      alert('Selecione um item para adicionar');
      return;
    }
    
    // Verificar se a quantidade medida é válida
    if (itemForm.quantidade_medida <= 0) {
      alert('A quantidade medida deve ser maior que zero');
      return;
    }
    
    // Verificar se a quantidade medida não excede a quantidade disponível
    const quantidadeDisponivel = itemSelecionado.quantidade_disponivel || itemSelecionado.quantidade;
    if (itemForm.quantidade_medida > quantidadeDisponivel) {
      alert(`A quantidade medida não pode exceder a quantidade disponível (${quantidadeDisponivel} ${itemSelecionado.unidade})`);
      return;
    }
    
    // Calcular o percentual executado
    const percentualExecutado = (itemForm.quantidade_medida / itemSelecionado.quantidade) * 100;
    
    // Calcular o valor total
    const valorTotal = itemForm.quantidade_medida * itemSelecionado.valor_unitario;
    
    // Verificar se o item já está na medição
    const itemExistente = itensMedicao.find(i => i.item_negociacao_id === itemSelecionado.id);
    
    if (itemExistente) {
      // Atualizar o item existente
      const novosItens = itensMedicao.map(item => {
        if (item.item_negociacao_id === itemSelecionado.id) {
          // Marcar como modificado se a quantidade mudou
          if (item.id && item.quantidade_medida !== itemForm.quantidade_medida) {
            setItensModificados(prev => new Set([...prev, item.id!]));
          }
          return {
            ...item,
            quantidade_medida: itemForm.quantidade_medida,
            percentual_executado: percentualExecutado,
            valor_total: valorTotal
          };
        }
        return item;
      });
      
      setItensMedicao(novosItens);
    } else {
      // Adicionar novo item
      const novoItem: ItemMedicaoState = {
        item_negociacao_id: itemSelecionado.id,
        descricao: itemSelecionado.descricao,
        unidade: itemSelecionado.unidade,
        quantidade_total: itemSelecionado.quantidade,
        quantidade_medida: itemForm.quantidade_medida,
        percentual_executado: percentualExecutado,
        valor_unitario: itemSelecionado.valor_unitario,
        valor_total: valorTotal
      };
      
      setItensMedicao([...itensMedicao, novoItem]);
    }
    
    // Resetar o formulário
    setItemSelecionado(null);
    setTermoBusca('');
    setItemForm({ quantidade_medida: 0 });
  };
  
  const removerItem = (index: number) => {
    const item = itensMedicao[index];
    
    // Se o item já existe no banco (tem ID), adicione-o à lista de itens a excluir
    if (item.id) {
      setItensExcluidos([...itensExcluidos, item.id]);
    }
    
    const novosItens = [...itensMedicao];
    novosItens.splice(index, 1);
    setItensMedicao(novosItens);
  };

  const calcularValorTotal = () => {
    return itensMedicao.reduce((total, item) => total + item.valor_total, 0);
  };
  
  const calcularTotalParcelas = () => {
    return parcelas.reduce((total, parcela) => total + parcela.valor, 0);
  };

  const formatarData = (dataString: string) => {
    // Converte de YYYY-MM-DD para DD/MM/YYYY sem problemas de timezone
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  
  const adicionarParcela = () => {
    if (!parcelaForm.data_prevista || parcelaForm.valor <= 0) {
      alert('Preencha a data e o valor da parcela');
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
    
    // Validação básica
    if (!formData.data_inicio || !formData.data_fim) {
      alert('Por favor, preencha as datas de início e fim');
      return;
    }
    
    if (itensMedicao.length === 0) {
      alert('Adicione pelo menos um item à medição');
      return;
    }
    
    setLoading(true);
    
    try {
      // Atualizar a medição
      await updateMedicao(
        id,
        formData.data_inicio,
        formData.data_fim,
        undefined,
        Number(formData.desconto)
      );
      
      // Processar os itens da medição
      
      // 1. Excluir itens removidos
      for (const itemId of itensExcluidos) {
        await deleteItemMedicao(itemId);
      }
      
      // 2. Atualizar ou inserir itens
      for (const item of itensMedicao) {
        if (item.id) {
          // Item existente - só atualizar se foi modificado
          if (itensModificados.has(item.id)) {
            await updateItemMedicao(
              item.id,
              item.quantidade_medida
            );
          }
        } else {
          // Novo item, inserir
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
      
      // 3. Remover todas as parcelas antigas
      for (const parcelaOriginal of parcelasOriginais) {
        await deleteParcelaMedicao(parcelaOriginal.id);
      }
      
      // 4. Inserir as novas parcelas
      for (const parcela of parcelas) {
        await insertParcelaMedicao(
          id,
          parcela.data_prevista,
          parcela.valor,
          parcela.descricao
        );
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
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-center items-center h-full">
          <p>Carregando dados da medição...</p>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex items-center mb-6">
        <Link 
          href="/medicoes" 
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">EDITAR MEDIÇÃO</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Informações da Medição</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                id="data_inicio"
                name="data_inicio"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.data_inicio}
                onChange={handleFormChange}
                required
              />
            </div>
            
            <div>
              <label htmlFor="data_fim" className="block text-sm font-medium text-gray-700 mb-1">
                Data de Fim
              </label>
              <input
                type="date"
                id="data_fim"
                name="data_fim"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.data_fim}
                onChange={handleFormChange}
                required
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contrato
            </label>
            <div className="p-2 border border-gray-300 rounded-md bg-gray-50">
              <p className="font-medium">{medicao?.negociacao?.numero} - {medicao?.negociacao?.descricao}</p>
              <p className="text-sm text-gray-500">Fornecedor: {medicao?.negociacao?.fornecedor?.nome}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <label htmlFor="desconto" className="block text-sm font-medium text-gray-700 mb-1">
              Desconto (R$)
            </label>
            <input
              type="number"
              id="desconto"
              name="desconto"
              min="0"
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.desconto}
              onChange={handleFormChange}
            />
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Itens da Medição</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Item do Contrato
            </label>
            <div className="relative">
              <div className="flex">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite para buscar um item..."
                    value={termoBusca}
                    onChange={handleBuscarItem}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  
                  {exibirDropdown && itensFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                      {itensFiltrados.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2 hover:bg-gray-100 cursor-pointer ${item.totalmente_medido ? 'bg-gray-50' : ''}`}
                          onClick={() => handleSelecionarItem(item)}
                        >
                          <p className={`font-medium ${item.totalmente_medido ? 'text-gray-500' : ''}`}>
                            {item.descricao}
                            {item.totalmente_medido && (
                              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                100% EXECUTADO
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.unidade} | Qtd: {item.quantidade} | Valor: {item.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            {item.percentual_executado && item.percentual_executado > 0 && (
                              <> | {item.percentual_executado.toFixed(1)}% executado</>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {exibirDropdown && termoBusca && itensFiltrados.length === 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg p-2">
                      <p className="text-gray-500">Nenhum item encontrado</p>
                    </div>
                  )}
                </div>
                
                {itemSelecionado && (
                  <div className="flex">
                    <input
                      type="number"
                      className="w-32 p-2 border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Qtd"
                      min="0.01"
                      max={itemSelecionado.quantidade_disponivel || itemSelecionado.quantidade}
                      step="0.001"
                      value={itemForm.quantidade_medida || ''}
                      onChange={(e) => {
                        const valor = parseFloat(e.target.value) || 0;
                        const quantidadeDisponivel = itemSelecionado.quantidade_disponivel || itemSelecionado.quantidade;
                        const valorFinal = Math.min(valor, quantidadeDisponivel);
                        setItemForm({ quantidade_medida: valorFinal });
                      }}
                    />
                    <button
                      type="button"
                      onClick={adicionarItem}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {itemSelecionado && (
              <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                <p className="font-medium">{itemSelecionado.descricao}</p>
                <p className="text-sm">
                  Unidade: {itemSelecionado.unidade} | 
                  Quantidade Total: {itemSelecionado.quantidade} | 
                  {itemSelecionado.quantidade_ja_medida && itemSelecionado.quantidade_ja_medida > 0 && (
                    <>
                      Já Medido: {itemSelecionado.quantidade_ja_medida} | 
                      Disponível: {itemSelecionado.quantidade_disponivel} | 
                    </>
                  )}
                  Valor Unitário: {itemSelecionado.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Medida</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Executado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Unit.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itensMedicao.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-2 text-center text-sm text-gray-500">
                      Nenhum item adicionado
                    </td>
                  </tr>
                ) : (
                  itensMedicao.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{item.descricao}</td>
                      <td className="px-4 py-2">{item.unidade}</td>
                      <td className="px-4 py-2">{item.quantidade_total}</td>
                      <td className="px-4 py-2">{item.quantidade_medida}</td>
                      <td className="px-4 py-2">{item.percentual_executado.toFixed(2)}%</td>
                      <td className="px-4 py-2">
                        {item.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-2">
                        {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const currentItem = item; // Capture o item atual do loop
                              const itemNeg = itensDisponiveis.find(i => i.id === currentItem.item_negociacao_id);
                              if (itemNeg) {
                                setItemSelecionado(itemNeg);
                              } else {
                                // Fallback para um objeto parcial se não encontrar o item original
                                setItemSelecionado({
                                  id: currentItem.item_negociacao_id,
                                  negociacao_id: medicao?.negociacao_id || 0,
                                  item_custo_id: null,
                                  descricao: currentItem.descricao,
                                  unidade: currentItem.unidade,
                                  quantidade: currentItem.quantidade_total,
                                  valor_unitario: currentItem.valor_unitario,
                                  valor_total: currentItem.valor_total,
                                  created_at: '',
                                  updated_at: ''
                                });
                              }
                              setTermoBusca(currentItem.descricao);
                              setItemForm({ quantidade_medida: currentItem.quantidade_medida });
                              
                              // Marcar como modificado quando o usuário edita
                              if (currentItem.id) {
                                setItensModificados(prev => new Set([...prev, currentItem.id!]));
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar quantidade"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerItem(index)}
                            className="text-red-600 hover:text-red-900"
                            title="Remover item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-2 text-right font-medium">
                    Valor Total da Medição:
                  </td>
                  <td colSpan={2} className="px-4 py-2 font-bold">
                    {calcularValorTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {/* Seção de Previsão de Desembolso */}
        <div className="bg-white shadow-sm rounded-lg p-6">
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
                  <Plus size={18} />
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
                    {calcularTotalParcelas().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end gap-4">
          <Link
            href="/medicoes"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Save size={18} />
            <span>{loading ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </form>
    </main>
  );
} 