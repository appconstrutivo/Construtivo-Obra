'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  Pencil,
  Trash2,
  PlusCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  EyeOff,
  ArrowLeft,
  ChevronLeft
} from 'lucide-react';
import {
  fetchCentrosCusto,
  fetchGruposByCentroCusto,
  CentroCusto,
  Grupo,
  deleteGrupo,
  atualizarTodosTotais
} from '@/lib/supabase';
import { useObra } from '@/contexts/ObraContext';
import NovoGrupoModal from '@/components/financeiro/NovoGrupoModal';
import EditarGrupoModal from '@/components/financeiro/EditarGrupoModal';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';

// Adicione log para debugging
console.log('NovoGrupoModal foi importado:', !!NovoGrupoModal);

export default function Grupos() {
  const { obraSelecionada } = useObra();
  const searchParams = useSearchParams();
  const centroCustoIdParam = searchParams.get('centroCustoId');

  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [centroCustoSelecionadoId, setCentroCustoSelecionadoId] = useState<number | null>(
    centroCustoIdParam ? parseInt(centroCustoIdParam) : null
  );
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState<CentroCusto | null>(null);
  const [mostrarBDI, setMostrarBDI] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<Grupo | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Totais
  const totalOrcado = grupos.reduce((acc, grupo) => acc + (grupo.orcado || 0), 0);
  const totalRealizado = grupos.reduce((acc, grupo) => acc + (grupo.realizado || 0), 0);
  const totalComBDI = grupos.reduce((acc, grupo) => acc + (grupo.com_bdi || 0), 0);
  const totalCusto = grupos.reduce((acc, grupo) => acc + (grupo.custo || 0), 0);
  const saldoTotal = totalCusto - totalRealizado;
  const progressoTotal = totalCusto > 0 ? Math.round((totalRealizado / totalCusto) * 100) : 0;

  // Carregar centros de custo
  useEffect(() => {
    async function carregarCentrosCusto() {
      const data = await fetchCentrosCusto(obraSelecionada?.id);
      setCentrosCusto(data);

      // Se temos um centroCustoId na URL, sempre use-o
      if (centroCustoIdParam) {
        const id = parseInt(centroCustoIdParam);
        setCentroCustoSelecionadoId(id);
        const centro = data.find(c => c.id === id) || null;
        setCentroCustoSelecionado(centro);
      } else if (data.length > 0 && !centroCustoSelecionadoId) {
        // Se não temos centro de custo selecionado, selecione o primeiro
        setCentroCustoSelecionadoId(data[0].id);
        setCentroCustoSelecionado(data[0]);
      }
    }

    carregarCentrosCusto();
  }, [centroCustoIdParam, obraSelecionada]);

  // Carregar grupos quando o centro de custo selecionado ou obra selecionada mudar
  useEffect(() => {
    if (centroCustoSelecionadoId) {
      carregarGrupos(centroCustoSelecionadoId);
    }
  }, [centroCustoSelecionadoId, obraSelecionada]);

  // Função para carregar grupos do centro de custo selecionado
  async function carregarGrupos(centroCustoId: number) {
    if (!obraSelecionada) {
      setGrupos([]);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);

      // Carregar dados imediatamente para exibição rápida
      const data = await fetchGruposByCentroCusto(centroCustoId);

      // Filtrar apenas grupos da obra selecionada (garantir isolamento)
      const gruposFiltrados = data.filter(grupo => grupo.obra_id === obraSelecionada.id);

      setGrupos(gruposFiltrados);
      setCarregando(false);

      // Depois, executar a atualização de totais em segundo plano
      atualizarTodosTotais().then(() => {
        // Recarregar grupos após a atualização ser concluída
        fetchGruposByCentroCusto(centroCustoId).then(dataAtualizada => {
          // Filtrar novamente por obra
          const gruposFiltradosAtualizados = dataAtualizada.filter(grupo => grupo.obra_id === obraSelecionada.id);
          setGrupos(gruposFiltradosAtualizados);
        });
      });
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      setCarregando(false);
    }
  }

  // Função para lidar com a mudança de centro de custo no dropdown
  function handleChangeCentroCusto(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value);
    setCentroCustoSelecionadoId(id);
    const centro = centrosCusto.find(c => c.id === id) || null;
    setCentroCustoSelecionado(centro);

    // Atualizar a URL sem recarregar a página
    const url = new URL(window.location.href);
    url.searchParams.set('centroCustoId', id.toString());
    window.history.pushState({}, '', url.toString());
  }

  // Funções para manipulação de grupos
  async function handleExcluirGrupo() {
    if (!grupoSelecionado) return;

    try {
      await deleteGrupo(grupoSelecionado.id);
      await carregarGrupos(centroCustoSelecionadoId!);
      setModalExcluirAberto(false);
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
    }
  }

  function abrirModalEditar(grupo: Grupo) {
    setGrupoSelecionado(grupo);
    setModalEditarAberto(true);
  }

  function abrirModalExcluir(grupo: Grupo) {
    setGrupoSelecionado(grupo);
    setModalExcluirAberto(true);
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  }

  // Função para abrir o modal de novo grupo
  function abrirModalNovoGrupo() {
    console.log('Abrindo modal de novo grupo...');
    setModalNovoAberto(true);
  }

  return (
    <main className="w-full p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div className="space-y-3 md:space-y-4">
            <Link
              href="/financeiro"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm touch-manipulation"
            >
              <ArrowLeft size={16} className="mr-1 shrink-0" />
              <span>Voltar para Etapa</span>
            </Link>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <span className="text-sm text-gray-600">Etapa selecionada:</span>
              <select
                className="border border-gray-300 rounded-md py-2 md:py-1.5 pl-3 pr-8 text-sm w-full md:w-auto touch-manipulation"
                value={centroCustoSelecionadoId?.toString() || ''}
                onChange={handleChangeCentroCusto}
              >
                {centrosCusto.map((centro) => (
                  <option key={centro.id} value={centro.id}>
                    {centro.descricao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 md:gap-4 flex-shrink-0 self-end md:self-auto">
            <button
              onClick={() => setMostrarBDI(!mostrarBDI)}
              className="inline-flex items-center gap-1.5 md:gap-2 rounded-md bg-gray-600 px-3 py-2.5 md:px-4 md:py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 touch-manipulation whitespace-nowrap"
            >
              {mostrarBDI ? <EyeOff size={16} className="md:w-[18px] md:h-[18px] shrink-0" /> : <Eye size={16} className="md:w-[18px] md:h-[18px] shrink-0" />}
              {mostrarBDI ? 'Ocultar BDI' : 'Mostrar BDI'}
            </button>

            <button
              onClick={abrirModalNovoGrupo}
              className="inline-flex items-center gap-1.5 md:gap-2 rounded-md bg-blue-600 px-3 py-2.5 md:px-4 md:py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation disabled:opacity-60 whitespace-nowrap"
              disabled={!centroCustoSelecionadoId}
              title="Nova Composição"
              aria-label="Nova Composição"
            >
              <PlusCircle size={18} className="shrink-0 md:w-[18px] md:h-[18px]" />
              <span className="md:hidden">Composição</span>
              <span className="hidden md:inline">NOVA COMPOSIÇÃO</span>
            </button>
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
            <p className="text-3xl font-bold text-gray-900 mb-2">{formatarValor(totalOrcado)}</p>
            {mostrarBDI && (
              <p className="text-sm text-gray-600 mb-1">Com BDI: {formatarValor(totalComBDI)}</p>
            )}
            <p className="text-sm text-gray-600">Valor total planejado</p>
          </div>

          {/* Card Custo */}
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-700">Custo/Liberado</h3>
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
              {saldoTotal < 0 ? 'Acima do orçado' : 'Dentro do orçado'}
            </p>
          </div>
        </div>

        {/* Lista de Composições */}
        {/* Mobile: layout em cards (somente abaixo de md) */}
        <div className="md:hidden space-y-3">
          {!centroCustoSelecionadoId ? (
            <div className="bg-white rounded-lg border p-6 text-center text-sm text-gray-500">
              Selecione uma etapa para visualizar as composições
            </div>
          ) : carregando ? (
            <div className="bg-white rounded-lg border p-6 text-center text-sm text-gray-500">
              Carregando...
            </div>
          ) : grupos.length === 0 ? (
            <div className="bg-white rounded-lg border p-6 text-center text-sm text-gray-500">
              Nenhuma composição encontrada para esta etapa
            </div>
          ) : (
            grupos.map((grupo) => {
              const saldo = (grupo.custo || 0) - (grupo.realizado || 0);
              const progresso = grupo.custo > 0
                ? Math.round((grupo.realizado / grupo.custo) * 100)
                : 0;

              return (
                <div
                  key={grupo.id}
                  className="bg-white rounded-lg border shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {grupo.codigo}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900 mt-0.5 break-words">
                          {grupo.descricao}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/financeiro/itens?grupoId=${grupo.id}`}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 touch-manipulation"
                          aria-label={`Ver itens de ${grupo.descricao}`}
                        >
                          <Eye size={18} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(grupo)}
                          className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 touch-manipulation"
                          aria-label={`Editar ${grupo.descricao}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModalExcluir(grupo)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 touch-manipulation"
                          aria-label={`Excluir ${grupo.descricao}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 block text-xs">Orçado</span>
                        <span className="font-medium text-gray-900">{formatarValor(grupo.orcado || 0)}</span>
                      </div>
                      {mostrarBDI && (
                        <div>
                          <span className="text-gray-500 block text-xs">C/ BDI</span>
                          <span className="font-medium text-gray-900">{formatarValor(grupo.com_bdi || 0)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 block text-xs">Custo</span>
                        <span className="font-medium text-gray-900">{formatarValor(grupo.custo || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Realizado</span>
                        <span className="font-medium text-gray-900">
                          {formatarValor(grupo.realizado || 0)}{' '}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${progresso >= 100 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                            {progresso}%
                          </span>
                        </span>
                      </div>
                      <div className={mostrarBDI ? 'col-span-2' : ''}>
                        <span className="text-gray-500 block text-xs">Saldo</span>
                        <span className={`font-medium ${saldo < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {saldo < 0 ? '-' : ''}{formatarValor(Math.abs(saldo))}
                          <span className="text-xs ml-1">{saldo < 0 ? '↓' : '↑'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Progresso:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${progresso >= 100 ? 'bg-red-500' : 'bg-purple-500'}`}
                            style={{ width: `${Math.min(progresso, 100)}%` }}
                          />
                        </div>
                        <span>{progresso}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop: tabela (somente md e acima) */}
        <div className="hidden md:block bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0 w-2/5">
                    COMPOSIÇÃO
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orçamento
                  </th>
                  {mostrarBDI && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      C/ BDI
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Realizado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!centroCustoSelecionadoId ? (
                  <tr>
                    <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                      Selecione uma etapa para visualizar as composições
                    </td>
                  </tr>
                ) : carregando ? (
                  <tr>
                    <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : grupos.length === 0 ? (
                  <tr>
                    <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhuma composição encontrada para esta etapa
                    </td>
                  </tr>
                ) : (
                  grupos.map((grupo) => {
                    const saldo = (grupo.custo || 0) - (grupo.realizado || 0);
                    const progresso = grupo.custo > 0
                      ? Math.round((grupo.realizado / grupo.custo) * 100)
                      : 0;

                    return (
                      <tr key={grupo.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {grupo.codigo}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words align-top min-w-0">
                          {grupo.descricao}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatarValor(grupo.orcado || 0)}
                        </td>
                        {mostrarBDI && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatarValor(grupo.com_bdi || 0)}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatarValor(grupo.custo || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            {formatarValor(grupo.realizado || 0)}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${progresso >= 100 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                              {progresso}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={saldo < 0 ? 'text-red-600' : 'text-green-600'}>
                            {saldo < 0 ? '-' : ''}{formatarValor(Math.abs(saldo))}
                            <span className="text-xs ml-1">
                              {saldo < 0 ? '↓' : '↑'}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            <Link
                              href={`/financeiro/itens?grupoId=${grupo.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye size={18} />
                            </Link>
                            <button
                              onClick={() => abrirModalEditar(grupo)}
                              className="text-amber-600 hover:text-amber-900"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => abrirModalExcluir(grupo)}
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
          </div>
        </div>
      </div>

      {/* Modal para adicionar novo grupo - Sempre renderizado, independente do centroCustoSelecionadoId */}
      <NovoGrupoModal
        isOpen={modalNovoAberto}
        onClose={() => {
          console.log('Fechando modal de novo grupo...');
          setModalNovoAberto(false);
        }}
        onSuccess={() => {
          console.log('Sucesso ao criar grupo...');
          setModalNovoAberto(false);
          if (centroCustoSelecionadoId) {
            carregarGrupos(centroCustoSelecionadoId);
          }
        }}
        centroCustoId={centroCustoSelecionadoId || 0}
        centroCustoNome={centroCustoSelecionado?.descricao || ''}
      />

      {/* Modal para editar grupo */}
      {grupoSelecionado && centroCustoSelecionado && (
        <EditarGrupoModal
          isOpen={modalEditarAberto}
          onClose={() => setModalEditarAberto(false)}
          onSuccess={() => {
            setModalEditarAberto(false);
            carregarGrupos(centroCustoSelecionadoId!);
          }}
          grupo={grupoSelecionado}
          centroCustoNome={centroCustoSelecionado.descricao}
        />
      )}

      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleExcluirGrupo}
        titulo="Excluir Composição"
        mensagem={`Tem certeza que deseja excluir a composição "${grupoSelecionado?.descricao}"? Esta ação não pode ser desfeita.`}
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />
    </main>
  );
} 