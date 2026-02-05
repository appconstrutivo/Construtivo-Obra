'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchCentrosCusto, CentroCusto, deleteCentroCusto, atualizarTodosTotais } from '@/lib/supabase';
import { useObra } from '@/contexts/ObraContext';
import {
  Eye,
  Pencil,
  Trash2,
  PlusCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  EyeOff
} from 'lucide-react';
import NovoCentroCustoModal from '@/components/financeiro/NovoCentroCustoModal';
import EditarCentroCustoModal from '@/components/financeiro/EditarCentroCustoModal';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';

export default function ControleFinanceiro() {
  const { obraSelecionada } = useObra();
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [mostrarBDI, setMostrarBDI] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState<CentroCusto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const totalOrcado = centrosCusto.reduce((acc, centro) => acc + (centro.orcado || 0), 0);
  const totalRealizado = centrosCusto.reduce((acc, centro) => acc + (centro.realizado || 0), 0);
  const totalComBDI = centrosCusto.reduce((acc, centro) => acc + (centro.com_bdi || 0), 0);
  const totalCusto = centrosCusto.reduce((acc, centro) => acc + (centro.custo || 0), 0);
  const saldoTotal = totalCusto - totalRealizado;
  const progressoTotal = totalCusto > 0 ? Math.round((totalRealizado / totalCusto) * 100) : 0;

  useEffect(() => {
    carregarCentrosCusto();
  }, [obraSelecionada]);

  async function carregarCentrosCusto() {
    if (!obraSelecionada) {
      setCentrosCusto([]);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);

      // Primeiro carregar os dados sem atualizar totais para exibição rápida
      // Filtrar por obra selecionada para garantir isolamento
      const data = await fetchCentrosCusto(obraSelecionada.id);
      setCentrosCusto(data);
      setCarregando(false);

      // Depois, executar a atualização de totais em segundo plano
      // Isso permite que a UI seja mostrada rapidamente
      atualizarTodosTotais().then(() => {
        // Recarregar dados após a atualização ser concluída
        fetchCentrosCusto(obraSelecionada.id).then(dataAtualizada => {
          setCentrosCusto(dataAtualizada);
        });
      });
    } catch (error) {
      console.error('Erro ao carregar centros de custo:', error);
      setCarregando(false);
    }
  }

  async function handleExcluirCentroCusto() {
    if (!centroCustoSelecionado) return;

    try {
      await deleteCentroCusto(centroCustoSelecionado.id);
      await carregarCentrosCusto();
      setModalExcluirAberto(false);
      setCentroCustoSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir centro de custo:', error);
      const err = error as any;
      // 23503 = violação de FK (há grupos/itens vinculados)
      if (err?.code === '23503') {
        setErroExcluir(
          'Não foi possível excluir: esta etapa possui vínculos (ex.: grupos/itens/lançamentos). Remova os registros vinculados antes de excluir.'
        );
      } else if (err?.code === 'RLS_DENY_DELETE') {
        setErroExcluir(
          'Exclusão não permitida para seu usuário. Apenas administradores podem excluir centros de custo.'
        );
      } else {
        setErroExcluir('Não foi possível excluir a etapa. Verifique o console para detalhes.');
      }
    }
  }

  function abrirModalEditar(centro: CentroCusto) {
    setCentroCustoSelecionado(centro);
    setModalEditarAberto(true);
  }

  function abrirModalExcluir(centro: CentroCusto) {
    setCentroCustoSelecionado(centro);
    setModalExcluirAberto(true);
    setErroExcluir(null);
  }

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
        <div className="flex justify-end items-center">
          <div className="flex gap-4">
            <button
              onClick={() => setMostrarBDI(!mostrarBDI)}
              className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {mostrarBDI ? <EyeOff size={18} /> : <Eye size={18} />}
              {mostrarBDI ? 'Ocultar BDI' : 'Mostrar BDI'}
            </button>

            <button
              onClick={() => setModalNovoAberto(true)}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PlusCircle size={18} />
              NOVA ETAPA
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

        {/* Tabela de Centros de Custo */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ETAPA
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
              {carregando ? (
                <tr>
                  <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : centrosCusto.length === 0 ? (
                <tr>
                  <td colSpan={mostrarBDI ? 8 : 7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhuma etapa encontrada
                  </td>
                </tr>
              ) : (
                centrosCusto.map((centro) => {
                  const saldo = (centro.custo || 0) - (centro.realizado || 0);
                  const progresso = centro.custo > 0
                    ? Math.round((centro.realizado / centro.custo) * 100)
                    : 0;

                  return (
                    <tr key={centro.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {centro.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {centro.descricao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarValor(centro.orcado || 0)}
                      </td>
                      {mostrarBDI && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatarValor(centro.com_bdi || 0)}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarValor(centro.custo || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {formatarValor(centro.realizado || 0)}
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
                          <Link href={`/financeiro/grupos?centroCustoId=${centro.id}`} className="text-blue-600 hover:text-blue-900">
                            <Eye size={18} />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              abrirModalEditar(centro);
                            }}
                            className="text-amber-600 hover:text-amber-900"
                            aria-label={`Editar centro de custo ${centro.descricao}`}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              abrirModalExcluir(centro);
                            }}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Excluir etapa ${centro.descricao}`}
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

      {/* Modal para adicionar novo centro de custo */}
      <NovoCentroCustoModal
        isOpen={modalNovoAberto}
        onClose={() => setModalNovoAberto(false)}
        onSuccess={() => {
          setModalNovoAberto(false);
          carregarCentrosCusto();
        }}
      />

      {/* Modal para editar centro de custo */}
      {centroCustoSelecionado && (
        <EditarCentroCustoModal
          isOpen={modalEditarAberto}
          onClose={() => setModalEditarAberto(false)}
          centroCusto={centroCustoSelecionado}
          onSuccess={() => {
            setModalEditarAberto(false);
            carregarCentrosCusto();
          }}
        />
      )}

      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => {
          setModalExcluirAberto(false);
          setErroExcluir(null);
        }}
        onConfirm={handleExcluirCentroCusto}
        titulo="Excluir Etapa"
        mensagem={
          erroExcluir
            ? erroExcluir
            : `Tem certeza que deseja excluir a etapa "${centroCustoSelecionado?.descricao}"? Esta ação não pode ser desfeita.`
        }
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />
    </main>
  );
} 