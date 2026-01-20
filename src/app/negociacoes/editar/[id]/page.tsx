"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileText, Plus, Trash2 } from 'lucide-react';
import {
  fetchFornecedores,
  fetchItensCusto,
  fetchNegociacaoById,
  fetchItensNegociacao,
  fetchParcelasPagamentoByNegociacao,
  updateNegociacao,
  insertItemNegociacao,
  updateItemNegociacao,
  deleteItemNegociacao,
  insertParcelaPagamento,
  updateParcelaPagamento,
  deleteParcelaPagamento,
  fetchObras,
  Fornecedor,
  Negociacao,
  ItemNegociacao,
  ParcelaPagamento
} from '@/lib/supabase';
import PDFModal from '@/components/ui/PDFModal';
import PDFContrato from '@/components/negociacoes/PDFContrato';
import { useNotification } from '@/components/ui/notification';
import { formatarDataBrasil } from '@/lib/utils';

type ItemCusto = {
  id: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  realizado_percentual: number;
  grupo: {
    codigo: string;
    descricao: string;
    centro_custo: {
      codigo: string;
      descricao: string;
    };
  };
};

type ItemNegociacaoState = {
  id?: number;
  item_custo_id: number | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  codigo_item?: string;
};

type ParcelaPagamentoState = {
  id?: number;
  data_prevista: string;
  valor: number;
  descricao: string;
  status?: string;
};

// Definindo a interface para os parâmetros da rota
interface PageParams {
  id: string;
}

export default function EditarNegociacaoPage({ params }: any) {
  const router = useRouter();
  const resolvedParams = React.use(params) as PageParams;
  const id = Number(resolvedParams.id);
  
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const { showNotification } = useNotification();
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [itensCusto, setItensCusto] = useState<ItemCusto[]>([]);
  const [itensFiltrados, setItensFiltrados] = useState<ItemCusto[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<ItemCusto | null>(null);
  const [exibirDropdown, setExibirDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo: 'Contrato',
    fornecedor_id: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    obra: '',
    engenheiro_responsavel: '',
  });
  
  const [itensNegociacao, setItensNegociacao] = useState<ItemNegociacaoState[]>([]);
  const [itensExcluidos, setItensExcluidos] = useState<number[]>([]);
  const [itemForm, setItemForm] = useState({
    item_custo_id: null as number | null,
    descricao: '',
    unidade: '',
    quantidade: 0,
    valor_unitario: 0
  });

  const [parcelas, setParcelas] = useState<ParcelaPagamentoState[]>([]);
  const [parcelasExcluidas, setParcelasExcluidas] = useState<number[]>([]);
  const [parcelaForm, setParcelaForm] = useState({
    data_prevista: '',
    valor: 0,
    descricao: ''
  });

  const [negociacao, setNegociacao] = useState<Negociacao | null>(null);

  // Estados para PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [modalPDFAberto, setModalPDFAberto] = useState(false);
  const [urlPDF, setUrlPDF] = useState('');
  const [obraInfo, setObraInfo] = useState<{ nome: string; endereco: string; responsavel_tecnico: string } | null>(null);

  // Carregar negociação, itens, fornecedores e itens de custo
  useEffect(() => {
    const carregarDados = async () => {
      setLoadingDados(true);
      try {
        // Carregar dados em paralelo para ser mais rápido
        const [negociacao, itensNeg, fornecedoresData, itensCustoData, parcelasData, obrasData] = await Promise.all([
          fetchNegociacaoById(id),
          fetchItensNegociacao(id),
          fetchFornecedores(),
          fetchItensCusto(),
          fetchParcelasPagamentoByNegociacao(id),
          fetchObras()
        ]);
        
        if (!negociacao) {
          showNotification({
            title: "Erro",
            message: "Negociação não encontrada",
            type: "error"
          });
          router.push('/negociacoes');
          return;
        }
        
        setNegociacao(negociacao);
        
        // Formatar datas para o formato esperado pelo input date
        const formatarDataISO = (dataString: string | null) => {
          if (!dataString) return '';
          return new Date(dataString).toISOString().split('T')[0];
        };
        
        setFormData({
          tipo: negociacao.tipo,
          fornecedor_id: negociacao.fornecedor_id.toString(),
          descricao: negociacao.descricao,
          data_inicio: formatarDataISO(negociacao.data_inicio),
          data_fim: formatarDataISO(negociacao.data_fim),
          obra: negociacao.obra || '',
          engenheiro_responsavel: negociacao.engenheiro_responsavel || ''
        });
        
        // Buscar códigos dos itens de custo para os itens da negociação
        const itensMap = new Map();
        itensCustoData.forEach((item: ItemCusto) => {
          itensMap.set(item.id, item.codigo);
        });
        
        // Mapear itens da negociação para o formato interno
        const itensFormatados = itensNeg.map(item => ({
          id: item.id,
          item_custo_id: item.item_custo_id,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          codigo_item: item.item_custo_id ? itensMap.get(item.item_custo_id) : undefined
        }));
        
        // Mapear parcelas de pagamento para o formato interno
        const parcelasFormatadas = parcelasData.map(parcela => ({
          id: parcela.id,
          data_prevista: formatarDataISO(parcela.data_prevista),
          valor: parcela.valor,
          descricao: parcela.descricao || '',
          status: parcela.status
        }));
        
        setItensNegociacao(itensFormatados);
        setParcelas(parcelasFormatadas);
        setFornecedores(fornecedoresData);
        setItensCusto(itensCustoData as ItemCusto[]);

        // Configurar informações da obra
        if (obrasData && obrasData.length > 0) {
          const obraPrincipal = obrasData[0];
          setObraInfo({
            nome: obraPrincipal.nome,
            endereco: obraPrincipal.endereco || '',
            responsavel_tecnico: obraPrincipal.responsavel_tecnico || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showNotification({
          title: "Erro",
          message: "Erro ao carregar dados da negociação",
          type: "error"
        });
        router.push('/negociacoes');
      } finally {
        setLoadingDados(false);
      }
    };

    carregarDados();
  }, [id, router, showNotification]);

  // Filtrar itens de custo com base no termo de busca
  useEffect(() => {
    if (!termoBusca.trim()) {
      setItensFiltrados([]);
      return;
    }

    const termoLowerCase = termoBusca.toLowerCase();
    const filtrados = itensCusto.filter(
      item => 
        item.codigo.toLowerCase().includes(termoLowerCase) ||
        item.descricao.toLowerCase().includes(termoLowerCase)
    );
    
    setItensFiltrados(filtrados.slice(0, 10)); // Limitar a 10 resultados
  }, [termoBusca, itensCusto]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Atualizar o valor total quando quantidade ou valor unitário mudam
    if (name === 'quantidade' || name === 'valor_unitario') {
      const novoValor = name === 'quantidade' 
        ? parseFloat(value) * itemForm.valor_unitario
        : itemForm.quantidade * parseFloat(value);
      
      setItemForm(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setItemForm(prev => ({ ...prev, [name]: value }));
    }
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
        message: `O item "${item.codigo} - ${item.descricao}" já atingiu 100% de realização (${item.realizado_percentual.toFixed(1)}%) e não pode ser adicionado ao contrato.`,
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
      quantidade: item.quantidade,
      valor_unitario: 0 // Valor unitário precisa ser definido pelo usuário
    });
    
    // Atualizar o termo de busca com o código do item
    setTermoBusca(`${item.codigo} - ${item.descricao}`);
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
    
    const novoItem: ItemNegociacaoState = {
      item_custo_id: itemForm.item_custo_id,
      descricao: itemForm.descricao,
      unidade: itemForm.unidade,
      quantidade: itemForm.quantidade,
      valor_unitario: itemForm.valor_unitario,
      valor_total: itemForm.quantidade * itemForm.valor_unitario,
      codigo_item: itemSelecionado ? itemSelecionado.codigo : undefined
    };
    
    setItensNegociacao([...itensNegociacao, novoItem]);
    
    // Resetar form do item
    setItemForm({
      item_custo_id: null,
      descricao: '',
      unidade: '',
      quantidade: 0,
      valor_unitario: 0
    });
    setItemSelecionado(null);
    setTermoBusca('');
  };

  const removerItem = (index: number) => {
    const item = itensNegociacao[index];
    
    // Se o item já existe no banco (tem ID), adicione-o à lista de itens a excluir
    if (item.id) {
      setItensExcluidos([...itensExcluidos, item.id]);
    }
    
    const novosItens = [...itensNegociacao];
    novosItens.splice(index, 1);
    setItensNegociacao(novosItens);
  };

  const calcularValorTotal = () => {
    return itensNegociacao.reduce((total, item) => total + item.valor_total, 0);
  };

  const adicionarParcela = () => {
    // Validação básica
    if (!parcelaForm.data_prevista || parcelaForm.valor <= 0) {
      showNotification({
        title: "Aviso",
        message: "Preencha a data e o valor da parcela corretamente",
        type: "warning"
      });
      return;
    }
    
    const novaParcela: ParcelaPagamentoState = {
      data_prevista: parcelaForm.data_prevista,
      valor: parcelaForm.valor,
      descricao: parcelaForm.descricao
    };
    
    setParcelas([...parcelas, novaParcela]);
    
    // Resetar form da parcela
    setParcelaForm({
      data_prevista: '',
      valor: 0,
      descricao: ''
    });
  };

  const removerParcela = (index: number) => {
    const parcela = parcelas[index];
    
    // Se a parcela já existe no banco (tem ID), adicione-a à lista de parcelas a excluir
    if (parcela.id) {
      setParcelasExcluidas([...parcelasExcluidas, parcela.id]);
    }
    
    const novasParcelas = [...parcelas];
    novasParcelas.splice(index, 1);
    setParcelas(novasParcelas);
  };

  const calcularTotalParcelas = () => {
    return parcelas.reduce((total, parcela) => total + parcela.valor, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação campos básicos obrigatórios
    if (
      !formData.tipo || 
      !formData.fornecedor_id || 
      !formData.descricao || 
      !formData.data_inicio
    ) {
      showNotification({
        title: "Aviso",
        message: "Por favor, preencha os campos obrigatórios: Tipo, Fornecedor, Descrição e Data Início",
        type: "warning"
      });
      return;
    }
    
    // Verifica se há itens na negociação
    if (itensNegociacao.length === 0) {
      showNotification({
        title: "Aviso",
        message: "Adicione pelo menos um item ao contrato",
        type: "warning"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Atualizar a negociação
      await updateNegociacao(
        id,
        formData.tipo,
        parseInt(formData.fornecedor_id),
        formData.descricao,
        formData.data_inicio,
        formData.data_fim || undefined,
        formData.obra || undefined,
        formData.engenheiro_responsavel || undefined
      );
      
      // Processar os itens da negociação
      
      // 1. Excluir itens removidos
      for (const itemId of itensExcluidos) {
        await deleteItemNegociacao(itemId);
      }
      
      // 2. Atualizar ou inserir itens
      for (const item of itensNegociacao) {
        if (item.id) {
          // Item existente, atualizar
          await updateItemNegociacao(
            item.id,
            item.descricao,
            item.unidade,
            item.quantidade,
            item.valor_unitario
          );
        } else {
          // Novo item, inserir
          await insertItemNegociacao(
            id,
            item.item_custo_id,
            item.descricao,
            item.unidade,
            item.quantidade,
            item.valor_unitario
          );
        }
      }

      // Processar as parcelas de pagamento
      
      // 1. Excluir parcelas removidas
      for (const parcelaId of parcelasExcluidas) {
        await deleteParcelaPagamento(parcelaId);
      }
      
      // 2. Atualizar ou inserir parcelas
      for (const parcela of parcelas) {
        if (parcela.id) {
          // Parcela existente, atualizar
          await updateParcelaPagamento(
            parcela.id,
            parcela.data_prevista,
            parcela.valor,
            parcela.descricao
          );
        } else {
          // Nova parcela, inserir
          await insertParcelaPagamento(
            id,
            parcela.data_prevista,
            parcela.valor,
            parcela.descricao
          );
        }
      }
      
      showNotification({
        title: "Sucesso",
        message: "Contrato atualizado com sucesso",
        type: "success"
      });
      router.push('/negociacoes');
    } catch (error) {
      console.error('Erro ao atualizar negociação:', error);
      showNotification({
        title: "Erro",
        message: "Erro ao atualizar o contrato",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDFReady = (url: string) => {
    console.log('PDF pronto, abrindo modal com URL:', url);
    setUrlPDF(url);
    setModalPDFAberto(true);
    setGerandoPDF(false);
  };

  const handleGerarPDF = async () => {
    try {
      setGerandoPDF(true);
      
      console.log('Iniciando geração de PDF para contrato:', negociacao?.numero);
      console.log('Dados disponíveis:', {
        contrato: !!negociacao,
        itensCount: itensNegociacao.length,
        parcelasCount: parcelas.length
      });
      
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        console.log('Estados atualizados, PDF deve gerar automaticamente');
      }, 100);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setGerandoPDF(false);
      showNotification({
        title: "Erro",
        message: "Erro ao gerar PDF. Tente novamente.",
        type: "error"
      });
    }
  };

  if (loadingDados) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Link href="/negociacoes" className="hover:text-primary">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold">EDITAR CONTRATO</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              onClick={handleGerarPDF}
            >
              <FileText size={18} />
              <span>Gerar PDF</span>
            </button>
            <button
              type="submit"
              form="form-contrato"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              disabled={loading}
            >
              <Save size={18} />
              <span>{loading ? 'Salvando...' : 'Atualizar Contrato'}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center h-64">
          <p>Carregando dados do contrato...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/negociacoes" className="hover:text-primary">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">EDITAR CONTRATO</h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            onClick={handleGerarPDF}
          >
            <FileText size={18} />
            <span>Gerar PDF</span>
          </button>
          <button
            type="submit"
            form="form-contrato"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            disabled={loading}
          >
            <Save size={18} />
            <span>{loading ? 'Salvando...' : 'Atualizar Contrato'}</span>
          </button>
        </div>
      </div>

      <form id="form-contrato" onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText size={24} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold">Informações do Contrato</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="tipo" className="block text-sm font-medium">
                Tipo de Negociação<span className="text-red-500">*</span>
              </label>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleFormChange}
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Contrato">Contrato</option>
                <option value="Pedido de Compra">Pedido de Compra</option>
                <option value="Locação de Equipamento">Locação de Equipamento</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="fornecedor_id" className="block text-sm font-medium">
                Fornecedor<span className="text-red-500">*</span>
              </label>
              <select
                id="fornecedor_id"
                name="fornecedor_id"
                value={formData.fornecedor_id}
                onChange={handleFormChange}
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um fornecedor</option>
                {fornecedores.map(fornecedor => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="data_inicio" className="block text-sm font-medium">
                Data Início<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="data_inicio"
                name="data_inicio"
                value={formData.data_inicio}
                onChange={handleFormChange}
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="data_fim" className="block text-sm font-medium">
                Data Fim
              </label>
              <input
                type="date"
                id="data_fim"
                name="data_fim"
                value={formData.data_fim}
                onChange={handleFormChange}
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="obra" className="block text-sm font-medium">
                Obra<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="obra"
                name="obra"
                value={formData.obra}
                onChange={handleFormChange}
                placeholder="Código ou nome da obra"
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="engenheiro_responsavel" className="block text-sm font-medium">
                Engenheiro Responsável<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="engenheiro_responsavel"
                name="engenheiro_responsavel"
                value={formData.engenheiro_responsavel}
                onChange={handleFormChange}
                placeholder="Nome do engenheiro responsável"
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="descricao" className="block text-sm font-medium">
                Descrição<span className="text-red-500">*</span>
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleFormChange}
                placeholder="Descreva o objetivo desta negociação"
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Itens do Contrato</h2>

          <div className="mb-6 border-b pb-6">
            <h3 className="font-medium mb-3">Adicionar Item</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  form="form-adicionar-item"
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
                  form="form-adicionar-item"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="descricao_item" className="block text-sm font-medium">
                  Descrição<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="descricao_item"
                  name="descricao"
                  value={itemForm.descricao}
                  onChange={handleItemFormChange}
                  placeholder="Descrição do item"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  form="form-adicionar-item"
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
                  form="form-adicionar-item"
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
                  step="0.01"
                  min="0"
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  form="form-adicionar-item"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  <Plus size={18} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>

          {itensNegociacao.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>Nenhum item adicionado à negociação.</p>
              <p className="text-sm mt-2">Use o formulário acima para adicionar itens.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unid.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Unit.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {itensNegociacao.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-sm text-gray-500">
                        Nenhum item adicionado
                      </td>
                    </tr>
                  ) : (
                    itensNegociacao.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {item.codigo_item || "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.descricao}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.unidade}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {item.quantidade}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {`R$ ${item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {`R$ ${item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <button
                            type="button"
                            onClick={() => removerItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="text-right px-4 py-2 font-medium">
                      VALOR TOTAL:
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap font-bold text-blue-700">
                      {`R$ ${calcularValorTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Seção de Previsão de Desembolso */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Previsão de Desembolso</h2>
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
                step="0.01"
                min="0"
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
                    Data Prevista
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parcelas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">
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
                        {parcela.status ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            parcela.status === 'Pago' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {parcela.status}
                          </span>
                        ) : '-'}
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
                  <td colSpan={4} className="px-4 py-2 font-bold">
                    {calcularTotalParcelas().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </form>
      <div className="flex justify-end gap-4 mt-6">
        <Link 
          href="/negociacoes" 
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          form="form-contrato"
          disabled={loading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          <span>Atualizar Contrato</span>
        </button>
      </div>

      {/* Formulário invisível para adição de itens, não interfere no formulário principal */}
      <form id="form-adicionar-item" onSubmit={(e) => e.preventDefault()} className="hidden"></form>

      {/* Componente PDF oculto - usado para gerar o PDF */}
      {negociacao && gerandoPDF && (
        <div style={{ display: 'none' }}>
          <PDFContrato
            contrato={negociacao}
            itens={itensNegociacao.map(item => ({
              id: item.id || 0,
              negociacao_id: negociacao.id,
              item_custo_id: item.item_custo_id,
              descricao: item.descricao,
              unidade: item.unidade,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
              created_at: '',
              updated_at: ''
            }))}
            parcelas={parcelas.map(parcela => ({
              id: parcela.id || 0,
              negociacao_id: negociacao.id,
              data_prevista: parcela.data_prevista,
              valor: parcela.valor,
              descricao: parcela.descricao,
              status: parcela.status || 'Pendente',
              created_at: '',
              updated_at: ''
            }))}
            obraInfo={obraInfo}
            onPDFReady={handlePDFReady}
          >
            <span>Gerando PDF...</span>
          </PDFContrato>
        </div>
      )}

      {/* Modal para visualização do PDF */}
      <PDFModal
        isOpen={modalPDFAberto}
        onClose={() => {
          setModalPDFAberto(false);
          setGerandoPDF(false);
        }}
        pdfUrl={urlPDF}
        fileName={`Contrato ${negociacao?.numero || ''}`}
      />
    </main>
  );
} 