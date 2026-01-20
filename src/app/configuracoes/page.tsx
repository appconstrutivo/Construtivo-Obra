'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertTriangle, PlusCircle, Building2, Lock, Users, Mail, Shield, UserX, UserCheck, Edit2, X } from 'lucide-react';
import FormularioObra, { ObraFormData } from '@/components/obras/FormularioObra';
import ModalPlanoProObras from '@/components/obras/ModalPlanoProObras';
import { fetchObras, Obra } from '@/lib/supabase';

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'membro' | 'visualizador';
  ativo: boolean;
  cargo: string | null;
  avatar_url: string | null;
  data_convite: string | null;
  ultimo_acesso: string | null;
  created_at: string;
};

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'seguranca' | 'obras' | 'usuarios'>('seguranca');
  
  // Estados para alteração de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  
  // Estados para cadastro de obras
  const [obras, setObras] = useState<Obra[]>([]);
  const [carregandoObras, setCarregandoObras] = useState(false);
  const [modalNovaObraAberto, setModalNovaObraAberto] = useState(false);
  const [modalPlanoProAberto, setModalPlanoProAberto] = useState(false);

  // Estados para gerenciamento de usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [roleUsuarioAtual, setRoleUsuarioAtual] = useState<'admin' | 'membro' | 'visualizador' | null>(null);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [modalConvidarUsuario, setModalConvidarUsuario] = useState(false);
  const [emailConvite, setEmailConvite] = useState('');
  const [roleConvite, setRoleConvite] = useState<'admin' | 'membro' | 'visualizador'>('membro');
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);

  // Carregar dados ao iniciar
  useEffect(() => {
    if (user) {
      carregarObras();
      carregarDadosUsuario();
    }
  }, [user]);

  const carregarDadosUsuario = async () => {
    if (!user) return;

    try {
      // Buscar dados do usuário atual para obter role e empresa_id
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('role, empresa_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (usuario) {
        setRoleUsuarioAtual(usuario.role as 'admin' | 'membro' | 'visualizador');
        setEmpresaId(usuario.empresa_id);

        // Se for admin, carregar lista de usuários
        if (usuario.role === 'admin' && usuario.empresa_id) {
          carregarUsuarios(usuario.empresa_id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const carregarUsuarios = async (empresaIdParam: number) => {
    try {
      setCarregandoUsuarios(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaIdParam)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar lista de usuários' });
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  const carregarObras = async () => {
    try {
      setCarregandoObras(true);
      const data = await fetchObras();
      setObras(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    } finally {
      setCarregandoObras(false);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    // Validar se as senhas coincidem
    if (novaSenha !== confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'As senhas não coincidem' });
      return;
    }

    // Validar comprimento mínimo da senha
    if (novaSenha.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    setCarregando(true);

    try {
      // Primeiro, verificar a senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: senhaAtual,
      });

      if (signInError) {
        throw new Error('Senha atual incorreta');
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        throw updateError;
      }

      // Limpar campos
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao alterar senha' });
    } finally {
      setCarregando(false);
    }
  };

  const handleNovaObra = async () => {
    if (!user) return;

    try {
      // Buscar dados do usuário para obter empresa_id
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (usuarioError || !usuario?.empresa_id) {
        console.error('Erro ao buscar dados do usuário:', usuarioError);
        setMensagem({ tipo: 'erro', texto: 'Erro ao verificar permissões. Tente novamente.' });
        return;
      }

      // Buscar assinatura ativa da empresa
      const { data: assinatura, error: assinaturaError } = await supabase
        .from('assinaturas')
        .select(`
          *,
          plano:planos(*)
        `)
        .eq('empresa_id', usuario.empresa_id)
        .eq('status', 'active')
        .single();

      if (assinaturaError || !assinatura) {
        console.error('Erro ao buscar assinatura:', assinaturaError);
        setMensagem({ tipo: 'erro', texto: 'Nenhuma assinatura ativa encontrada.' });
        return;
      }

      const plano = assinatura.plano;
      if (!plano) {
        console.error('Plano não encontrado na assinatura');
        setMensagem({ tipo: 'erro', texto: 'Erro ao verificar plano. Tente novamente.' });
        return;
      }

      // Verificar se já atingiu o limite de obras
      const obrasAtuais = obras.length;
      
      // Se limite_obras é NULL, significa ilimitado - sempre permite
      if (plano.limite_obras === null) {
        // Plano ilimitado, pode criar
        setModalNovaObraAberto(true);
        return;
      }

      // Verificar se já atingiu o limite
      if (obrasAtuais >= plano.limite_obras) {
        // Limite atingido - mostrar modal para upgrade
        setModalPlanoProAberto(true);
        return;
      }

      // Ainda não atingiu o limite, pode criar nova obra
      setModalNovaObraAberto(true);
    } catch (error: any) {
      console.error('Erro ao verificar plano:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao verificar permissões. Tente novamente.' });
    }
  };

  const handleSalvarObra = async (formData: ObraFormData) => {
    try {
      setCarregando(true);
      
      // Obter empresa_id do usuário autenticado
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (usuarioError || !usuario?.empresa_id) {
        throw new Error('Erro ao obter empresa_id do usuário');
      }
      
      const { data, error } = await supabase
        .from('obras')
        .insert([
          {
            ...formData,
            usuario_id: user.id,
            empresa_id: usuario.empresa_id,
            orcamento_total: 0 // Mantendo compatibilidade com o banco de dados
          }
        ])
        .select();

      if (error) throw error;
      
      await carregarObras();
      setModalNovaObraAberto(false);
      
      setMensagem({ tipo: 'sucesso', texto: 'Obra cadastrada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao cadastrar obra:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao cadastrar obra' });
    } finally {
      setCarregando(false);
    }
  };

  // Funções para gerenciamento de usuários
  const handleConvidarUsuario = async () => {
    if (!user || !empresaId) return;

    if (!emailConvite || !emailConvite.includes('@')) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, informe um email válido' });
      return;
    }

    setCarregando(true);
    try {
      // Chamar API route para criar usuário via Admin API
      const response = await fetch('/api/convidar-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailConvite,
          role: roleConvite,
          empresa_id: empresaId,
          convidado_por: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao convidar usuário');
      }

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `Convite enviado para ${emailConvite}. O usuário receberá um email para ativar a conta e definir sua senha.` 
      });
      
      setEmailConvite('');
      setRoleConvite('membro');
      setModalConvidarUsuario(false);
      
      if (empresaId) {
        await carregarUsuarios(empresaId);
      }
    } catch (error: any) {
      console.error('Erro ao convidar usuário:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao convidar usuário' });
    } finally {
      setCarregando(false);
    }
  };

  const handleAlterarRole = async (usuarioId: string, novaRole: 'admin' | 'membro' | 'visualizador') => {
    if (!empresaId) return;

    setCarregando(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ role: novaRole })
        .eq('id', usuarioId)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      setMensagem({ tipo: 'sucesso', texto: 'Permissão alterada com sucesso!' });
      await carregarUsuarios(empresaId);
      setEditandoUsuario(null);
    } catch (error: any) {
      console.error('Erro ao alterar role:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao alterar permissão' });
    } finally {
      setCarregando(false);
    }
  };

  const handleToggleAtivo = async (usuarioId: string, ativoAtual: boolean) => {
    if (!empresaId) return;

    setCarregando(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo: !ativoAtual })
        .eq('id', usuarioId)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `Usuário ${!ativoAtual ? 'ativado' : 'desativado'} com sucesso!` 
      });
      await carregarUsuarios(empresaId);
    } catch (error: any) {
      console.error('Erro ao alterar status do usuário:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao alterar status do usuário' });
    } finally {
      setCarregando(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      membro: 'Membro',
      visualizador: 'Visualizador'
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      membro: 'bg-blue-100 text-blue-800',
      visualizador: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-blue-100">Gerencie suas configurações de conta</p>
        </div>

        {mensagem && (
          <div className={`p-4 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {mensagem.texto}
          </div>
        )}

        {/* Abas para navegação */}
        <div className="flex border-b">
          <button
            className={`flex items-center gap-2 py-3 px-4 ${
              activeTab === 'seguranca'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('seguranca')}
          >
            <Lock size={18} />
            <span>Segurança</span>
          </button>
          <button
            className={`flex items-center gap-2 py-3 px-4 ${
              activeTab === 'obras'
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('obras')}
          >
            <Building2 size={18} />
            <span>Cadastro de Obra</span>
          </button>
          {roleUsuarioAtual === 'admin' && (
            <button
              className={`flex items-center gap-2 py-3 px-4 ${
                activeTab === 'usuarios'
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('usuarios')}
            >
              <Users size={18} />
              <span>Usuários e Permissões</span>
            </button>
          )}
        </div>

        {/* Conteúdo da aba de segurança */}
        {activeTab === 'seguranca' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Segurança</h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Ao alterar sua senha, você será desconectado de todos os dispositivos, exceto este.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAlterarSenha} className="space-y-6">
              <div>
                <label htmlFor="senhaAtual" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha atual
                </label>
                <input
                  id="senhaAtual"
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="novaSenha" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Mínimo de 6 caracteres</p>
              </div>

              <div>
                <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nova senha
                </label>
                <input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={carregando}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center space-x-2 disabled:opacity-70"
                >
                  {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{carregando ? 'Alterando senha...' : 'Alterar senha'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Conteúdo da aba de obras */}
        {activeTab === 'obras' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Cadastro de Obra</h2>
              <button
                onClick={handleNovaObra}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center gap-2"
              >
                <PlusCircle size={18} />
                <span>Nova Obra</span>
              </button>
            </div>

            {carregandoObras ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Carregando obras...</span>
              </div>
            ) : obras.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma obra cadastrada</h3>
                <p className="text-gray-500 mb-4">
                  Você ainda não tem nenhuma obra cadastrada. Clique no botão "Nova Obra" para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {obras.map((obra) => (
                  <div key={obra.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-medium text-gray-900">{obra.nome}</h3>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Endereço:</span>
                        <p className="text-gray-700">{obra.endereco || 'Não informado'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Cliente:</span>
                        <p className="text-gray-700">{obra.cliente || 'Não informado'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Responsável Técnico:</span>
                        <p className="text-gray-700">{obra.responsavel_tecnico || 'Não informado'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Status:</span>
                        <p className="text-gray-700">{obra.status}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Data de Início:</span>
                        <p className="text-gray-700">
                          {obra.data_inicio ? (() => {
                    if (obra.data_inicio.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      const [ano, mes, dia] = obra.data_inicio.split('-').map(Number);
                      return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                    }
                    return new Date(obra.data_inicio).toLocaleDateString('pt-BR');
                  })() : 'Não informada'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Data Prevista de Término:</span>
                        <p className="text-gray-700">
                          {obra.data_prevista_fim ? (() => {
                    if (obra.data_prevista_fim.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      const [ano, mes, dia] = obra.data_prevista_fim.split('-').map(Number);
                      return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                    }
                    return new Date(obra.data_prevista_fim).toLocaleDateString('pt-BR');
                  })() : 'Não informada'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Área Construída:</span>
                        <p className="text-gray-700">
                          {obra.area_construida ? `${obra.area_construida} m²` : 'Não informada'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da aba de usuários e permissões */}
        {activeTab === 'usuarios' && roleUsuarioAtual === 'admin' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Usuários e Permissões</h2>
                <p className="text-sm text-gray-500 mt-1">Gerencie os usuários e permissões da sua empresa</p>
              </div>
              <button
                onClick={() => setModalConvidarUsuario(true)}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center gap-2"
              >
                <PlusCircle size={18} />
                <span>Convidar Usuário</span>
              </button>
            </div>

            {carregandoUsuarios ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Carregando usuários...</span>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
                <p className="text-gray-500 mb-4">
                  Você ainda não tem usuários cadastrados. Clique em "Convidar Usuário" para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {usuarios.map((usuario) => (
                  <div 
                    key={usuario.id} 
                    className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {usuario.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium text-gray-900">{usuario.nome}</h3>
                              {usuario.id === user?.id && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Você</span>
                              )}
                              {!usuario.ativo && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Inativo</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Mail size={14} className="text-gray-400" />
                              <p className="text-sm text-gray-600">{usuario.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="ml-13 mt-3 flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-500">Permissão:</span>
                            {editandoUsuario?.id === usuario.id ? (
                              <select
                                value={editandoUsuario.role}
                                onChange={(e) => setEditandoUsuario({
                                  ...editandoUsuario,
                                  role: e.target.value as 'admin' | 'membro' | 'visualizador'
                                })}
                                className="text-sm border rounded px-2 py-1"
                                onBlur={() => {
                                  if (editandoUsuario.role !== usuario.role) {
                                    handleAlterarRole(usuario.id, editandoUsuario.role);
                                  } else {
                                    setEditandoUsuario(null);
                                  }
                                }}
                                autoFocus
                              >
                                <option value="admin">Administrador</option>
                                <option value="membro">Membro</option>
                                <option value="visualizador">Visualizador</option>
                              </select>
                            ) : (
                              <>
                                <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(usuario.role)}`}>
                                  {getRoleLabel(usuario.role)}
                                </span>
                                {usuario.id !== user?.id && (
                                  <button
                                    onClick={() => setEditandoUsuario(usuario)}
                                    className="text-blue-600 hover:text-blue-700"
                                    title="Editar permissão"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {usuario.cargo && (
                            <div>
                              <span className="text-sm text-gray-500">Cargo: </span>
                              <span className="text-sm text-gray-700">{usuario.cargo}</span>
                            </div>
                          )}

                          {usuario.ultimo_acesso && (
                            <div>
                              <span className="text-sm text-gray-500">Último acesso: </span>
                              <span className="text-sm text-gray-700">
                                {new Date(usuario.ultimo_acesso).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {usuario.id !== user?.id && (
                          <button
                            onClick={() => handleToggleAtivo(usuario.id, usuario.ativo)}
                            className={`p-2 rounded-md transition-colors ${
                              usuario.ativo
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                          >
                            {usuario.ativo ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de cadastro de nova obra usando o componente personalizado */}
      {modalNovaObraAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-3xl mx-auto">
            <FormularioObra 
              onSalvar={handleSalvarObra}
              onCancelar={() => setModalNovaObraAberto(false)}
              carregando={carregando}
            />
          </div>
        </div>
      )}

      {/* Modal de plano pro usando o componente personalizado */}
      {modalPlanoProAberto && (
        <ModalPlanoProObras
          onFechar={() => setModalPlanoProAberto(false)}
          onContratar={() => {
            setModalPlanoProAberto(false);
            // Lógica para contratar o plano
            alert('Implementar contratação do plano');
          }}
        />
      )}

      {/* Modal de convidar usuário */}
      {modalConvidarUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Convidar Novo Usuário</h3>
              <button
                onClick={() => {
                  setModalConvidarUsuario(false);
                  setEmailConvite('');
                  setRoleConvite('membro');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="emailConvite" className="block text-sm font-medium text-gray-700 mb-1">
                  Email do usuário
                </label>
                <input
                  id="emailConvite"
                  type="email"
                  value={emailConvite}
                  onChange={(e) => setEmailConvite(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="roleConvite" className="block text-sm font-medium text-gray-700 mb-1">
                  Permissão
                </label>
                <select
                  id="roleConvite"
                  value={roleConvite}
                  onChange={(e) => setRoleConvite(e.target.value as 'admin' | 'membro' | 'visualizador')}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                >
                  <option value="visualizador">Visualizador - Apenas visualização</option>
                  <option value="membro">Membro - Visualização e edição</option>
                  <option value="admin">Administrador - Acesso total</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {roleConvite === 'visualizador' && 'Pode apenas visualizar dados'}
                  {roleConvite === 'membro' && 'Pode visualizar e editar dados'}
                  {roleConvite === 'admin' && 'Acesso completo, incluindo gerenciamento de usuários'}
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <p className="text-sm text-yellow-700">
                  O usuário receberá um email com instruções para ativar a conta e definir sua senha.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setModalConvidarUsuario(false);
                    setEmailConvite('');
                    setRoleConvite('membro');
                  }}
                  className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConvidarUsuario}
                  disabled={carregando || !emailConvite}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center space-x-2 disabled:opacity-70"
                >
                  {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{carregando ? 'Enviando...' : 'Enviar Convite'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 