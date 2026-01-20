"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { 
  fetchFornecedores, 
  Fornecedor, 
  insertPedidoCompra, 
  fetchItensCustoDisponiveisParaCompra, 
  ItemCusto, 
  insertItemPedidoCompra,
  insertParcelaPedidoCompra
} from '@/lib/supabase';
import { useNotification } from '@/components/ui/notification';
import { formatarDataBrasil } from '@/lib/utils';

export default function NovoPedidoCompraPage() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Form states
  const [fornecedorId, setFornecedorId] = useState<number | null>(null);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [dataCompra, setDataCompra] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemCusto[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<ItemCusto[]>([]);
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [valoresUnitarios, setValoresUnitarios] = useState<Record<number, number>>({});
  const [exibirDropdown, setExibirDropdown] = useState(false);
  
  // Estados para controle do formulário de item
  const [itensFiltrados, setItensFiltrados] = useState<ItemCusto[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<ItemCusto | null>(null);
  const [itemForm, setItemForm] = useState({
    item_custo_id: null as number | null,
    descricao: '',
    unidade: '',
    quantidade: 0,
    valor_unitario: 0
  });
  
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
  
  // Carregar fornecedores disponíveis
  useEffect(() => {
    const carregarFornecedores = async () => {
      setLoading(true);
      try {
        const data = await fetchFornecedores();
        setFornecedores(data);
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarFornecedores();
  }, []);
  
  // Carregar itens de custo disponíveis
  useEffect(() => {
    const carregarItensDisponiveis = async () => {
      try {
        const itens = await fetchItensCustoDisponiveisParaCompra();
        setItensDisponiveis(itens);
      } catch (error) {
        console.error('Erro ao carregar itens de custo disponíveis:', error);
      }
    };
    
    carregarItensDisponiveis();
  }, []);
  
  // Quando selecionar um fornecedor
  useEffect(() => {
    if (!fornecedorId) return;
    
    const fornecedor = fornecedores.find(f => f.id === fornecedorId) || null;
    setFornecedorSelecionado(fornecedor);
  }, [fornecedorId, fornecedores]);
  
  // Filtrar itens de custo com base no termo de busca
  useEffect(() => {
    if (!termoBusca.trim()) {
      setItensFiltrados([]);
      return;
    }

    const termoLowerCase = termoBusca.toLowerCase();
    const filtrados = itensDisponiveis.filter(
      item => 
        item.codigo.toLowerCase().includes(termoLowerCase) ||
        item.descricao.toLowerCase().includes(termoLowerCase)
    );
    
    setItensFiltrados(filtrados.slice(0, 10)); // Limitar a 10 resultados
  }, [termoBusca, itensDisponiveis]);
  
  const handleFornecedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    setFornecedorId(id || null);
  };

  const handleBuscarItem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTermoBusca(value);
    
    // Mostrar o dropdown quando houver texto
    setExibirDropdown(value.trim().length > 0);
  };

  const handleSelecionarItem = (item: ItemCusto) => {
    // Validação: verificar se o item já atingiu 100% de realização
    if (item.realizado_percentual >= 100) {
      showNotification({
        title: "Item não disponível",
        message: `O item "${item.codigo} - ${item.descricao}" já atingiu 100% de realização (${item.realizado_percentual.toFixed(1)}%) e não pode ser adicionado ao pedido de compra.`,
        type: "warning"
      });
      return;
    }

    setItemSelecionado(item);
    setExibirDropdown(false);
    
    // Preencher o formulário com os dados do item
    setItemForm({
      item_custo_id: item.id,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: 1,
      valor_unitario: 0 // Valor unitário precisa ser definido pelo usuário
    });
    
    // Atualizar o termo de busca com o código do item
    setTermoBusca(`${item.codigo} - ${item.descricao}`);
  };

  const handleItemFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setItemForm(prev => ({
      ...prev,
      [name]: name === 'quantidade' || name === 'valor_unitario' ? parseFloat(value) || 0 : value
    }));
  };
  
  const adicionarItem = () => {
    // Validação básica
    if (!itemForm.descricao || !itemForm.unidade || itemForm.quantidade <= 0 || itemForm.valor_unitario <= 0) {
      showNotification({
        title: "Aviso",
        message: "Preencha todos os campos do item corretamente",
        type: "warning"
      });
      return;
    }



    // Verificar se já existe um item com o mesmo ID
    if (itemSelecionado && itensSelecionados.some(item => item.id === itemSelecionado.id)) {
      showNotification({
        title: "Item duplicado",
        message: "Este item já foi adicionado ao pedido",
        type: "warning"
      });
      return;
    }

    if (itemSelecionado) {
      setItensSelecionados((prev) => [...prev, itemSelecionado]);
      setQuantidades((prev) => ({
        ...prev,
        [itemSelecionado.id]: itemForm.quantidade
      }));
      setValoresUnitarios((prev) => ({
        ...prev,
        [itemSelecionado.id]: itemForm.valor_unitario
      }));
    }

    // Resetar formulário do item
    setItemForm({
      item_custo_id: null,
      descricao: '',
      unidade: '',
      quantidade: 0,
      valor_unitario: 0
    });
    setItemSelecionado(null);
    setTermoBusca('');
    setExibirDropdown(false);
  };
  
  const handleRemoverItem = (id: number) => {
    setItensSelecionados((prev) => prev.filter(item => item.id !== id));
    setQuantidades((prev) => {
      const newQuantidades = { ...prev };
      delete newQuantidades[id];
      return newQuantidades;
    });
    setValoresUnitarios((prev) => {
      const newValores = { ...prev };
      delete newValores[id];
      return newValores;
    });
  };
  
  const calcularValorTotal = (itemId: number) => {
    const quantidade = quantidades[itemId] || 0;
    const valorUnitario = valoresUnitarios[itemId] || 0;
    return quantidade * valorUnitario;
  };
  
  const calcularTotalPedido = () => {
    return itensSelecionados.reduce((total, item) => {
      return total + calcularValorTotal(item.id);
    }, 0);
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
    
    if (!fornecedorId || !dataCompra) {
      showNotification({
        title: "Campos obrigatórios",
        message: "Preencha todos os campos obrigatórios",
        type: "warning"
      });
      return;
    }
    
    if (itensSelecionados.length === 0) {
      showNotification({
        title: "Nenhum item adicionado",
        message: "Adicione pelo menos um item ao pedido de compra",
        type: "warning"
      });
      return;
    }
    
    // Verificar se tem algum item com quantidade zero
    const temItemZerado = Object.values(quantidades).some(qtd => qtd <= 0);
    if (temItemZerado) {
      showNotification({
        title: "Quantidade inválida",
        message: "Todos os itens devem ter quantidade maior que zero",
        type: "warning"
      });
      return;
    }
    
    setSalvando(true);
    
    try {
      // 1. Criar o pedido de compra
      const pedido = await insertPedidoCompra(
        fornecedorId,
        dataCompra,
        observacoes
      );
      
      // 2. Adicionar os itens do pedido
      for (const item of itensSelecionados) {
        await insertItemPedidoCompra(
          pedido.id,
          item.id,
          item.descricao,
          item.unidade,
          quantidades[item.id],
          valoresUnitarios[item.id]
        );
      }
      
      // 3. Adicionar as parcelas de previsão de desembolso
      for (const parcela of parcelas) {
        await insertParcelaPedidoCompra(
          pedido.id,
          parcela.data_prevista,
          parcela.valor,
          parcela.descricao
        );
      }
      
      // Exibir notificação de sucesso
      showNotification({
        title: 'Pedido salvo com sucesso',
        message: 'O pedido de compra foi cadastrado no sistema',
        type: 'success',
        duration: 5000
      });
      
      // 4. Redirecionar para a lista de pedidos de compra
      router.push('/compras');
    } catch (error) {
      console.error('Erro ao salvar pedido de compra:', error);
      showNotification({
        title: "Erro ao salvar",
        message: "Erro ao salvar pedido de compra. Verifique o console para mais detalhes.",
        type: "error"
      });
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
  
  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex items-center mb-6">
        <Link 
          href="/compras" 
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">NOVO PEDIDO DE COMPRA</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 p-6">
          <h2 className="text-lg font-medium mb-4">Informações do Pedido</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fornecedor*
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fornecedorId || ''}
              onChange={handleFornecedorChange}
              required
            >
              <option value="">Selecione um fornecedor</option>
              {fornecedores.map((fornecedor) => (
                <option key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.nome}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data da Compra*
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dataCompra}
              onChange={(e) => setDataCompra(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Informações adicionais sobre o pedido de compra"
            />
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 p-6">
          <h2 className="text-lg font-medium mb-4">Itens do Pedido</h2>
          
          <div className="mb-6 border-b pb-6">
            <h3 className="font-medium mb-3">Adicionar Item</h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div className="space-y-2 relative md:col-span-2">
                <label htmlFor="item_custo" className="block text-sm font-medium">
                  Selecionar Item de Custo<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="item_custo"
                  name="item_custo"
                  value={termoBusca}
                  onChange={handleBuscarItem}
                  placeholder="Buscar por descrição ou código..."
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Dropdown de resultados da busca */}
                {exibirDropdown && itensFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                    {itensFiltrados.map(item => {
                      const isDisponivel = item.realizado_percentual < 100;
                      return (
                        <div 
                          key={item.id}
                          className={`p-3 border-b border-gray-100 last:border-0 ${
                            isDisponivel 
                              ? 'cursor-pointer hover:bg-gray-100' 
                              : 'cursor-not-allowed bg-gray-50 opacity-75'
                          }`}
                          onClick={() => isDisponivel && handleSelecionarItem(item)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className={`font-medium ${!isDisponivel ? 'text-gray-500' : ''}`}>
                                {item.codigo}
                              </div>
                              <div className={`text-sm ${!isDisponivel ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.descricao}
                              </div>
                            </div>
                            <div className="text-xs ml-2">
                              <span 
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  item.realizado_percentual >= 100 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {item.realizado_percentual.toFixed(1)}%
                              </span>
                              {!isDisponivel && (
                                <div className="text-red-500 mt-1">Indisponível</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="unidade" className="block text-sm font-medium">
                  Unidade<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="unidade"
                  name="unidade"
                  value={itemForm.unidade}
                  onChange={handleItemFormChange}
                  placeholder="Unidade de medida"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="quantidade" className="block text-sm font-medium">
                  Quantidade<span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantidade"
                  name="quantidade"
                  value={itemForm.quantidade || ''}
                  onChange={handleItemFormChange}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="valor_unitario" className="block text-sm font-medium">
                  Valor Unit.<span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="valor_unitario"
                  name="valor_unitario"
                  value={itemForm.valor_unitario || ''}
                  onChange={handleItemFormChange}
                  placeholder="R$ 0,00"
                  step="any"
                  min="0"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  <Plus size={18} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>
          
          {itensSelecionados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-2 border-b">Código</th>
                    <th className="px-4 py-2 border-b">Descrição</th>
                    <th className="px-4 py-2 border-b">Unidade</th>
                    <th className="px-4 py-2 border-b">Quantidade</th>
                    <th className="px-4 py-2 border-b">Valor Unitário</th>
                    <th className="px-4 py-2 border-b">Valor Total</th>
                    <th className="px-4 py-2 border-b">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensSelecionados.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b">{item.codigo}</td>
                      <td className="px-4 py-3 border-b">{item.descricao}</td>
                      <td className="px-4 py-3 border-b">{item.unidade}</td>
                      <td className="px-4 py-3 border-b">{quantidades[item.id]?.toLocaleString('pt-BR') || 0}</td>
                      <td className="px-4 py-3 border-b">
                        {(valoresUnitarios[item.id] || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {calcularValorTotal(item.id).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </td>
                      <td className="px-4 py-3 border-b">
                        <button
                          type="button"
                          onClick={() => handleRemoverItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Remover item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={5} className="px-4 py-3 text-right">VALOR TOTAL:</td>
                    <td className="px-4 py-3">
                      {calcularTotalPedido().toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Nenhum item adicionado ao pedido.</p>
              <p className="text-sm mt-2">Use o formulário acima para adicionar itens.</p>
            </div>
          )}
        </div>
        
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
                        {formatarDataBrasil(parcela.data_prevista)}
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
                    {formatarValor(calcularTotalParcelas())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md flex items-center gap-2 transition-colors"
            disabled={salvando}
          >
            {salvando ? (
              <>Salvando...</>
            ) : (
              <>
                <Save size={18} />
                <span>SALVAR PEDIDO</span>
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
} 