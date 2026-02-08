"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, User, Pencil, Trash2, Search, X } from 'lucide-react';
import { fetchFornecedores, deleteFornecedor, Fornecedor } from '@/lib/supabase';
import { useObra } from '@/contexts/ObraContext';
import ConfirmacaoModal from '@/components/ui/ConfirmacaoModal';
import { useNotification } from '@/components/ui/notification';

export default function FornecedoresPage() {
  const { obraSelecionada } = useObra();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresFiltrados, setFornecedoresFiltrados] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const { showNotification } = useNotification();

  // Estados para os filtros
  const [codigoFiltro, setCodigoFiltro] = useState("");
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [contatoFiltro, setContatoFiltro] = useState("");
  const [telefoneFiltro, setTelefoneFiltro] = useState("");
  const [emailFiltro, setEmailFiltro] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const carregarFornecedores = async () => {
    setLoading(true);
    try {
      const data = await fetchFornecedores(obraSelecionada?.id);
      setFornecedores(data);
      setFornecedoresFiltrados(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, [obraSelecionada]);

  useEffect(() => {
    aplicarFiltros();
  }, [codigoFiltro, nomeFiltro, contatoFiltro, telefoneFiltro, emailFiltro, fornecedores]);

  const aplicarFiltros = () => {
    let resultados = [...fornecedores];
    
    if (codigoFiltro) {
      resultados = resultados.filter(f => 
        f.codigo?.toLowerCase().includes(codigoFiltro.toLowerCase())
      );
    }
    
    if (nomeFiltro) {
      resultados = resultados.filter(f => 
        f.nome?.toLowerCase().includes(nomeFiltro.toLowerCase())
      );
    }
    
    if (contatoFiltro) {
      resultados = resultados.filter(f => 
        f.contato?.toLowerCase().includes(contatoFiltro.toLowerCase())
      );
    }
    
    if (telefoneFiltro) {
      resultados = resultados.filter(f => 
        f.telefone?.toLowerCase().includes(telefoneFiltro.toLowerCase())
      );
    }
    
    if (emailFiltro) {
      resultados = resultados.filter(f => 
        f.email?.toLowerCase().includes(emailFiltro.toLowerCase())
      );
    }
    
    setFornecedoresFiltrados(resultados);
  };
  
  const limparFiltros = () => {
    setCodigoFiltro("");
    setNomeFiltro("");
    setContatoFiltro("");
    setTelefoneFiltro("");
    setEmailFiltro("");
  };

  const abrirModalExcluir = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setModalExcluirAberto(true);
  };

  const handleDelete = async () => {
    if (!fornecedorSelecionado) return;
    
    try {
      await deleteFornecedor(fornecedorSelecionado.id);
      setModalExcluirAberto(false);
      showNotification({
        title: "Sucesso",
        message: "Fornecedor excluído com sucesso",
        type: "success"
      });
      carregarFornecedores();
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      setModalExcluirAberto(false);
      
      // Exibir mensagem de erro amigável
      let mensagemErro = "Ocorreu um erro ao excluir o fornecedor.";
      if (error instanceof Error) {
        mensagemErro = error.message;
      }
      
      showNotification({
        title: "Erro ao excluir fornecedor",
        message: mensagemErro,
        type: "error"
      });
    }
  };

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">FORNECEDORES</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Search size={18} />
            <span>Filtros</span>
          </button>
          <Link 
            href="/fornecedores/novo" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>NOVO FORNECEDOR</span>
          </Link>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="bg-white shadow-sm rounded-lg mb-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Filtros</h2>
            <button
              onClick={limparFiltros}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
            >
              <X size={16} />
              Limpar filtros
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                type="text"
                value={codigoFiltro}
                onChange={(e) => setCodigoFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por código"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={nomeFiltro}
                onChange={(e) => setNomeFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
              <input
                type="text"
                value={contatoFiltro}
                onChange={(e) => setContatoFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por contato"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={telefoneFiltro}
                onChange={(e) => setTelefoneFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por telefone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="text"
                value={emailFiltro}
                onChange={(e) => setEmailFiltro(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Filtrar por e-mail"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">NOME</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">CONTATO</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">TELEFONE</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">E-MAIL</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Carregando fornecedores...</td>
                </tr>
              ) : fornecedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Nenhum fornecedor encontrado</td>
                </tr>
              ) : (
                fornecedoresFiltrados.map((fornecedor, index) => (
                  <tr key={fornecedor.id} className="hover:bg-gray-50">
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      title={`Código na empresa: ${fornecedor.codigo}`}
                    >
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{fornecedor.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{fornecedor.contato || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{fornecedor.telefone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{fornecedor.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {}} 
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        title="Visualizar"
                      >
                        <User size={18} />
                      </button>
                      <Link
                        href={`/fornecedores/editar/${fornecedor.id}`}
                        className="text-amber-600 hover:text-amber-900 inline-flex items-center"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </Link>
                      <button
                        onClick={() => abrirModalExcluir(fornecedor)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Dicas</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          <li>Cadastre todos os fornecedores antes de criar contratos ou pedidos de compra.</li>
          <li>Mantenha os dados de contato atualizados para facilitar a comunicação.</li>
          <li>Certifique-se de incluir informações fiscais corretas para emissão de documentos.</li>
        </ul>
      </div>

      {/* Modal de confirmação para excluir */}
      <ConfirmacaoModal
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleDelete}
        titulo="Excluir Fornecedor"
        mensagem={fornecedorSelecionado ? `Tem certeza que deseja excluir este fornecedor?` : ''}
        confirmButtonText="Excluir"
        cancelButtonText="Cancelar"
      />
    </main>
  );
} 