'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Eye, 
  Pencil, 
  Trash2, 
  PlusCircle, 
  ArrowLeft,
  EyeOff,
  ChevronLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Link2
} from 'lucide-react';
import { 
  fetchGruposByCentroCusto, 
  Grupo, 
  fetchItensOrcamentoByGrupo,
  fetchItensCustoByGrupo,
  ItemOrcamento,
  ItemCusto,
  deleteItemOrcamento,
  deleteItemCusto,
  atualizarTodosTotais
} from '@/lib/supabase';
import { useObra } from '@/contexts/ObraContext';
import NovoItemOrcamentoModal from '@/components/financeiro/itens/NovoItemOrcamentoModal';
import NovoItemCustoModal from '@/components/financeiro/itens/NovoItemCustoModal';
import EditarItemOrcamentoModal from '@/components/financeiro/itens/EditarItemOrcamentoModal';
import EditarItemCustoModal from '@/components/financeiro/itens/EditarItemCustoModal';
import { RelacionamentosItemModal } from '@/components/financeiro/itens/RelacionamentosItemModal';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import { supabase } from '@/lib/supabaseClient';

export default function Itens() {
  const { obraSelecionada } = useObra();
  const searchParams = useSearchParams();
  const grupoIdParam = searchParams.get('grupoId');
  
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<number | null>(
    grupoIdParam ? parseInt(grupoIdParam) : null
  );
  const [grupoSelecionado, setGrupoSelecionado] = useState<Grupo | null>(null);
  const [mostrarBDI, setMostrarBDI] = useState(false);
  const [carregando, setCarregando] = useState(true);
  
  // Estados para as abas
  const [tabAtiva, setTabAtiva] = useState<'orcamento' | 'custo'>('orcamento');
  
  // Estado para controlar visibilidade da coluna de orçamento
  const [ocultarColunaOrcamento, setOcultarColunaOrcamento] = useState(true);
  
  // Estados para os itens
  const [itensOrcamento, setItensOrcamento] = useState<ItemOrcamento[]>([]);
  const [itensCusto, setItensCusto] = useState<ItemCusto[]>([]);
  
  // Estados para os modais
  const [modalNovoOrcamentoAberto, setModalNovoOrcamentoAberto] = useState(false);
  const [modalNovoCustoAberto, setModalNovoCustoAberto] = useState(false);
  const [modalEditarOrcamentoAberto, setModalEditarOrcamentoAberto] = useState(false);
  const [modalEditarCustoAberto, setModalEditarCustoAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [modalRelacionamentosAberto, setModalRelacionamentosAberto] = useState(false);
  
  // Estados para o item selecionado
  const [itemOrcamentoSelecionado, setItemOrcamentoSelecionado] = useState<ItemOrcamento | null>(null);
  const [itemCustoSelecionado, setItemCustoSelecionado] = useState<ItemCusto | null>(null);
  const [itemRelacionamentosId, setItemRelacionamentosId] = useState<number | null>(null);
  const [itemRelacionamentosCodigo, setItemRelacionamentosCodigo] = useState<string>('');
  const [itemRelacionamentosDescricao, setItemRelacionamentosDescricao] = useState<string>('');
  
  // Totais
  const totalOrcamento = itensOrcamento.reduce((acc, item) => acc + (item.total || 0), 0);
  const totalComBDI = itensOrcamento.reduce((acc, item) => acc + (item.com_bdi || 0), 0);
  const totalCusto = itensCusto.reduce((acc, item) => acc + (item.total || 0), 0);
  const totalRealizado = itensCusto.reduce((acc, item) => acc + (item.realizado || 0), 0);
  const saldoTotal = totalCusto - totalRealizado;
  const progressoTotal = totalCusto > 0 ? Math.round((totalRealizado / totalCusto) * 100) : 0;

  // Carregar grupos inicialmente (apenas grupos do mesmo centro de custo do grupo atual)
  useEffect(() => {
    if (grupoIdParam) {
      setGrupoSelecionadoId(parseInt(grupoIdParam));
    }
  }, [grupoIdParam]);

  // Carregar dados do grupo selecionado
  useEffect(() => {
    async function carregarDadosGrupo() {
      if (!grupoSelecionadoId) return;
      
      try {
        setCarregando(true);
        
        // Buscar informações do grupo selecionado diretamente (filtrado por obra)
        let query = supabase
          .from('grupos')
          .select('*')
          .eq('id', grupoSelecionadoId);
        
        if (obraSelecionada) {
          query = query.eq('obra_id', obraSelecionada.id);
        }
        
        const { data: grupoData, error } = await query.single();
        
        if (error) {
          console.error('Erro ao buscar grupo:', error);
          return;
        }
        
        if (grupoData) {
          const grupo = grupoData as Grupo;
          setGrupoSelecionado(grupo);
          
          // Buscar todos os grupos do mesmo centro de custo
          const gruposMesmoCentro = await fetchGruposByCentroCusto(grupo.centro_custo_id);
          setGrupos(gruposMesmoCentro);
          
          // Buscar itens do grupo selecionado
          await carregarItens(grupoSelecionadoId);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do grupo:', error);
      } finally {
        setCarregando(false);
      }
    }
    
    carregarDadosGrupo();
  }, [grupoSelecionadoId, obraSelecionada]);

  // Função para carregar itens do grupo selecionado
  async function carregarItens(grupoId: number) {
    try {
      setCarregando(true);
      
      // Carregar dados rapidamente para exibição
      const [dataOrcamento, dataCusto] = await Promise.all([
        fetchItensOrcamentoByGrupo(grupoId),
        fetchItensCustoByGrupo(grupoId)
      ]);
      
      setItensOrcamento(dataOrcamento);
      setItensCusto(dataCusto);
      setCarregando(false);
      
      // Depois, executar a atualização de totais em segundo plano
      atualizarTodosTotais().then(() => {
        // Recarregar dados após a atualização ser concluída
        Promise.all([
          fetchItensOrcamentoByGrupo(grupoId),
          fetchItensCustoByGrupo(grupoId)
        ]).then(([dataOrcamentoAtualizada, dataCustoAtualizada]) => {
          setItensOrcamento(dataOrcamentoAtualizada);
          setItensCusto(dataCustoAtualizada);
        });
      });
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      setCarregando(false);
    }
  }

  // Função para lidar com a mudança de grupo no dropdown
  function handleChangeGrupo(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value);
    setGrupoSelecionadoId(id);
    const grupo = grupos.find(g => g.id === id) || null;
    setGrupoSelecionado(grupo);
    
    // Atualizar a URL sem recarregar a página
    const url = new URL(window.location.href);
    url.searchParams.set('grupoId', id.toString());
    window.history.pushState({}, '', url.toString());
  }

  // Funções para manipulação de itens de orçamento
  function abrirModalNovoItemOrcamento() {
    console.log('Abrindo modal de novo item orçamento...');
    console.log('grupoSelecionado:', grupoSelecionado);
    console.log('grupoSelecionadoId:', grupoSelecionadoId);
    setModalNovoOrcamentoAberto(true);
    console.log('Estado modalNovoOrcamentoAberto após atualização:', true);
  }

  function abrirModalEditarItemOrcamento(item: ItemOrcamento) {
    console.log('Abrindo modal de edição de item de orçamento:', item);
    setItemOrcamentoSelecionado(item);
    setItemCustoSelecionado(null);
    setModalEditarOrcamentoAberto(true);
    console.log('Estado do modal após atualização:', true);
  }

  function abrirModalExcluirItemOrcamento(item: ItemOrcamento) {
    setItemOrcamentoSelecionado(item);
    setItemCustoSelecionado(null);
    setModalExcluirAberto(true);
  }

  async function handleExcluirItemOrcamento() {
    if (!itemOrcamentoSelecionado) return;
    
    try {
      await deleteItemOrcamento(itemOrcamentoSelecionado.id);
      
      if (grupoSelecionadoId) {
        await carregarItens(grupoSelecionadoId);
      }
      
      setModalExcluirAberto(false);
    } catch (error) {
      console.error('Erro ao excluir item de orçamento:', error);
    }
  }

  // Funções para manipulação de itens de custo
  function abrirModalNovoItemCusto() {
    console.log('Abrindo modal de novo item custo...');
    console.log('grupoSelecionado:', grupoSelecionado);
    console.log('grupoSelecionadoId:', grupoSelecionadoId);
    setModalNovoCustoAberto(true);
    console.log('Estado modalNovoCustoAberto após atualização:', true);
  }

  function abrirModalEditarItemCusto(item: ItemCusto) {
    console.log('Abrindo modal de edição de item de custo:', item);
    setItemCustoSelecionado(item);
    setItemOrcamentoSelecionado(null);
    setModalEditarCustoAberto(true);
    console.log('Estado do modal após atualização:', true);
  }

  function abrirModalExcluirItemCusto(item: ItemCusto) {
    setItemCustoSelecionado(item);
    setItemOrcamentoSelecionado(null);
    setModalExcluirAberto(true);
  }

  function abrirModalRelacionamentos(item: ItemCusto) {
    setItemRelacionamentosId(item.id);
    setItemRelacionamentosCodigo(item.codigo);
    setItemRelacionamentosDescricao(item.descricao);
    setModalRelacionamentosAberto(true);
  }

  async function handleExcluirItemCusto() {
    if (!itemCustoSelecionado) return;
    
    try {
      await deleteItemCusto(itemCustoSelecionado.id);
      
      if (grupoSelecionadoId) {
        await carregarItens(grupoSelecionadoId);
      }
      
      setModalExcluirAberto(false);
    } catch (error) {
      console.error('Erro ao excluir item de custo:', error);
    }
  }

  // Função para formatar valores monetários
  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  }

  return (
    <main className="w-full p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href={`/financeiro/grupos?centroCustoId=${grupoSelecionado?.centro_custo_id || ''}`} className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft size={16} className="mr-1" />
              <span>Voltar para Grupos</span>
            </Link>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">Grupo selecionado:</span>
              <select 
                className="border border-gray-300 rounded-md py-1.5 pl-3 pr-8 text-sm"
                value={grupoSelecionadoId?.toString() || ''}
                onChange={handleChangeGrupo}
              >
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.descricao}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setMostrarBDI(!mostrarBDI)}
              className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {mostrarBDI ? <EyeOff size={18} /> : <Eye size={18} />}
              {mostrarBDI ? 'Ocultar BDI' : 'Mostrar BDI'}
            </button>
            
            {tabAtiva === 'orcamento' ? (
              <button
                onClick={abrirModalNovoItemOrcamento}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={!grupoSelecionadoId}
              >
                <PlusCircle size={18} />
                NOVO ITEM ORÇAMENTO
              </button>
            ) : (
              <button
                onClick={abrirModalNovoItemCusto}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={!grupoSelecionadoId}
              >
                <PlusCircle size={18} />
                NOVO ITEM CUSTO
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card Orçado */}
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-700">Orçamento/Venda</h3>
              <div className="bg-blue-100 p-2 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{formatarValor(totalOrcamento)}</p>
            {mostrarBDI && (
              <p className="text-sm text-gray-600 mb-1">Com BDI: {formatarValor(totalComBDI)}</p>
            )}
            <p className="text-sm text-gray-600">Valor total planejado</p>
          </div>

          {/* Card Custo */}
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-700">Custo</h3>
              <div className="bg-orange-100 p-2 rounded-full">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{formatarValor(totalCusto)}</p>
            <p className="text-sm text-gray-600">Valor total de custo</p>
          </div>

          {/* Card Realizado */}
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-700">Realizado</h3>
              <div className="bg-purple-100 p-2 rounded-full">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{formatarValor(totalRealizado)}</p>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
              <span>Progresso:</span>
              <span>{progressoTotal}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple-600 h-2.5 rounded-full" 
                style={{ width: `${progressoTotal}%` }}
              ></div>
            </div>
          </div>

          {/* Card Saldo */}
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-700">Saldo</h3>
              <div className="bg-green-100 p-2 rounded-full">
                <TrendingDown className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className={`text-3xl font-bold mb-2 ${saldoTotal < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {saldoTotal < 0 ? '-' : ''}{formatarValor(Math.abs(saldoTotal))}
            </p>
            <p className={`text-sm ${saldoTotal < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {saldoTotal < 0 ? 'Acima do custo' : 'Dentro do custo'}
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>{progressoTotal}% realizado</span>
          <span>{100 - progressoTotal}% disponível</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${progressoTotal}%` }}
          ></div>
        </div>

        {/* Tabs Orçamento/Custo */}
        <div className="border-b border-gray-200">
          <div className="flex justify-between items-center">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setTabAtiva('orcamento')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  tabAtiva === 'orcamento'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Orçamento
              </button>
              <button
                onClick={() => setTabAtiva('custo')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  tabAtiva === 'custo'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Custo
              </button>
            </nav>
            
            {/* Botão para ocultar coluna orçamento - só aparece na aba de custo */}
            {tabAtiva === 'custo' && (
              <button
                onClick={() => setOcultarColunaOrcamento(!ocultarColunaOrcamento)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {ocultarColunaOrcamento ? (
                  <>
                    <Eye size={16} className="mr-2" />
                    Mostrar Coluna Orçamento
                  </>
                ) : (
                  <>
                    <EyeOff size={16} className="mr-2" />
                    Ocultar Coluna Orçamento
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            {tabAtiva === 'orcamento' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UN
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QTDE
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Unit.
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    {mostrarBDI && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        C/ BDI
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!grupoSelecionadoId ? (
                    <tr>
                      <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Selecione um grupo para visualizar os itens
                      </td>
                    </tr>
                  ) : carregando ? (
                    <tr>
                      <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Carregando...
                      </td>
                    </tr>
                  ) : itensOrcamento.length === 0 ? (
                    <tr>
                      <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhum item de orçamento encontrado
                      </td>
                    </tr>
                  ) : (
                    itensOrcamento.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.codigo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.descricao}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.unidade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatarValor(item.preco_unitario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatarValor(item.total)}
                        </td>
                        {mostrarBDI && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatarValor(item.com_bdi)}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <button 
                              onClick={() => abrirModalEditarItemOrcamento(item)}
                              className="text-amber-600 hover:text-amber-900"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={() => abrirModalExcluirItemOrcamento(item)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    {!ocultarColunaOrcamento && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Orçamento
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UN
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QTDE
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Unit.
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gasto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Realizado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!grupoSelecionadoId ? (
                    <tr>
                      <td colSpan={ocultarColunaOrcamento ? 9 : 10} className="px-6 py-4 text-center text-sm text-gray-500">
                        Selecione um grupo para visualizar os itens
                      </td>
                    </tr>
                  ) : carregando ? (
                    <tr>
                      <td colSpan={ocultarColunaOrcamento ? 9 : 10} className="px-6 py-4 text-center text-sm text-gray-500">
                        Carregando...
                      </td>
                    </tr>
                  ) : itensCusto.length === 0 ? (
                    <tr>
                      <td colSpan={ocultarColunaOrcamento ? 9 : 10} className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhum item de custo encontrado
                      </td>
                    </tr>
                  ) : (
                    itensCusto.map((item) => {
                      // Encontrar o item de orçamento correspondente, se houver
                      const itemOrcamento = item.item_orcamento_id 
                        ? itensOrcamento.find(i => i.id === item.item_orcamento_id) 
                        : null;
                      
                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.codigo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.descricao}
                          </td>
                          {!ocultarColunaOrcamento && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {itemOrcamento ? itemOrcamento.codigo : '-'}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.unidade}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatarValor(item.preco_unitario)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatarValor(item.total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatarValor(item.realizado)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <span 
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  item.realizado_percentual >= 100 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                }`}
                                title={`Realizado: ${formatarValor(item.realizado)} / Orçado: ${formatarValor(item.total)} = ${item.realizado_percentual.toFixed(1)}%${item.realizado_percentual > 100 ? ' (Acima do orçado)' : ''}`}
                              >
                                {item.realizado_percentual.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-3">
                              <button 
                                onClick={() => abrirModalRelacionamentos(item)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Ver pedidos e medições relacionados"
                              >
                                <Link2 size={18} />
                              </button>
                              <button 
                                onClick={() => abrirModalEditarItemCusto(item)}
                                className="text-amber-600 hover:text-amber-900"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => abrirModalExcluirItemCusto(item)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal para adicionar novo item de orçamento */}
      {grupoSelecionado && (
        <NovoItemOrcamentoModal
          isOpen={modalNovoOrcamentoAberto}
          onClose={() => {
            console.log('Fechando modal de novo item orçamento...');
            setModalNovoOrcamentoAberto(false);
          }}
          onSuccess={() => {
            console.log('Sucesso na criação do item de orçamento...');
            setModalNovoOrcamentoAberto(false);
            if (grupoSelecionadoId) {
              carregarItens(grupoSelecionadoId);
            }
          }}
          onItemAdded={() => {
            console.log('Item de orçamento adicionado, recarregando dados...');
            if (grupoSelecionadoId) {
              carregarItens(grupoSelecionadoId);
            }
          }}
          grupoId={grupoSelecionado.id}
          grupoNome={grupoSelecionado.descricao}
        />
      )}

      {/* Modal para adicionar novo item de custo */}
      {grupoSelecionado && (
        <NovoItemCustoModal
          isOpen={modalNovoCustoAberto}
          onClose={() => {
            console.log('Fechando modal de novo item custo...');
            setModalNovoCustoAberto(false);
          }}
          onSuccess={() => {
            console.log('Sucesso na criação do item de custo...');
            setModalNovoCustoAberto(false);
            if (grupoSelecionadoId) {
              carregarItens(grupoSelecionadoId);
            }
          }}
          onItemAdded={() => {
            console.log('Item de custo adicionado, recarregando dados...');
            if (grupoSelecionadoId) {
              carregarItens(grupoSelecionadoId);
            }
          }}
          grupoId={grupoSelecionado.id}
          grupoNome={grupoSelecionado.descricao}
        />
      )}

      {/* Modal para editar item de orçamento */}
      {modalEditarOrcamentoAberto && itemOrcamentoSelecionado && grupoSelecionado && (
        <EditarItemOrcamentoModal
          isOpen={modalEditarOrcamentoAberto}
          onClose={() => setModalEditarOrcamentoAberto(false)}
          onSuccess={() => {
            setModalEditarOrcamentoAberto(false);
            if (grupoSelecionadoId) {
              carregarItens(grupoSelecionadoId);
            }
          }}
          item={itemOrcamentoSelecionado}
          grupoNome={grupoSelecionado.descricao}
        />
      )}

      {/* Modal para editar item de custo */}
      {modalEditarCustoAberto && itemCustoSelecionado && grupoSelecionado && (
        <EditarItemCustoModal
          isOpen={modalEditarCustoAberto}
          onClose={() => setModalEditarCustoAberto(false)}
          onSuccess={() => {
            setModalEditarCustoAberto(false);
            if (grupoSelecionadoId) {
              carregarItens(grupoSelecionadoId);
            }
          }}
          item={itemCustoSelecionado}
          grupoNome={grupoSelecionado.descricao}
        />
      )}

      {/* Modal de relacionamentos do item */}
      {itemRelacionamentosId && (
        <RelacionamentosItemModal
          isOpen={modalRelacionamentosAberto}
          onClose={() => setModalRelacionamentosAberto(false)}
          itemId={itemRelacionamentosId}
          itemCodigo={itemRelacionamentosCodigo}
          itemDescricao={itemRelacionamentosDescricao}
        />
      )}

      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={itemOrcamentoSelecionado ? handleExcluirItemOrcamento : handleExcluirItemCusto}
        titulo={`Excluir Item ${itemOrcamentoSelecionado ? 'de Orçamento' : 'de Custo'}`}
        mensagem={`Tem certeza que deseja excluir o item "${itemOrcamentoSelecionado?.descricao || itemCustoSelecionado?.descricao}"? Esta ação não pode ser desfeita.`}
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />
    </main>
  );
} 