import { supabase } from './supabaseClient';
import { Cliente, ParcelaReceber } from './supabase';

// ==================== HELPER FUNCTIONS ====================

/**
 * Obter empresa_id do usuário autenticado
 */
async function getEmpresaId(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (error || !usuario) {
    throw new Error('Erro ao obter empresa_id do usuário');
  }

  return usuario.empresa_id;
}

// ==================== CLIENTES ====================

/**
 * Buscar todos os clientes ativos
 */
export async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }

  return data as Cliente[];
}

/**
 * Buscar cliente por ID
 */
export async function fetchClienteById(id: number) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }

  return data as Cliente;
}

/**
 * Inserir novo cliente
 */
export async function insertCliente(
  codigo: string,
  nome: string,
  tipo: 'Pessoa Física' | 'Pessoa Jurídica' | 'Investidor',
  documento: string,
  contato?: string,
  telefone?: string,
  email?: string,
  endereco?: string,
  observacoes?: string
) {
  // Obter empresa_id do usuário autenticado
  const empresa_id = await getEmpresaId();

  const { data, error } = await supabase
    .from('clientes')
    .insert([
      {
        codigo,
        nome,
        tipo,
        documento,
        contato,
        telefone,
        email,
        endereco,
        observacoes,
        ativo: true,
        empresa_id
      }
    ])
    .select();

  if (error) {
    console.error('Erro ao inserir cliente:', error);
    throw error;
  }

  return data[0] as Cliente;
}

/**
 * Atualizar cliente existente
 */
export async function updateCliente(
  id: number,
  nome: string,
  tipo: 'Pessoa Física' | 'Pessoa Jurídica' | 'Investidor',
  documento: string,
  contato?: string,
  telefone?: string,
  email?: string,
  endereco?: string,
  observacoes?: string
) {
  const { data, error } = await supabase
    .from('clientes')
    .update({
      nome,
      tipo,
      documento,
      contato,
      telefone,
      email,
      endereco,
      observacoes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw error;
  }

  return data[0] as Cliente;
}

/**
 * Desativar cliente (soft delete)
 */
export async function deleteCliente(id: number) {
  const { error } = await supabase
    .from('clientes')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Erro ao desativar cliente:', error);
    throw error;
  }

  return true;
}

/**
 * Gerar próximo código de cliente
 */
export async function gerarProximoCodigoCliente(): Promise<string> {
  const { data, error } = await supabase
    .from('clientes')
    .select('codigo')
    .order('codigo', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar último código:', error);
    return 'CLI001';
  }

  if (!data || data.length === 0) {
    return 'CLI001';
  }

  const ultimoCodigo = data[0].codigo;
  const numero = parseInt(ultimoCodigo.replace('CLI', '')) + 1;
  return `CLI${numero.toString().padStart(3, '0')}`;
}

// ==================== PARCELAS A RECEBER ====================

/**
 * Buscar todas as parcelas a receber
 * @param obraId - ID da obra para filtrar (opcional)
 */
export async function fetchParcelasReceber(obraId?: number) {
  let query = supabase
    .from('parcelas_receber')
    .select(`
      *,
      cliente:cliente_id(*)
    `);

  if (obraId) {
    query = query.eq('obra_id', obraId);
  }

  const { data, error } = await query.order('data_vencimento', { ascending: true });

  if (error) {
    console.error('Erro ao buscar parcelas a receber:', error);
    return [];
  }

  return data;
}

/**
 * Buscar parcelas por cliente
 */
export async function fetchParcelasReceberByCliente(cliente_id: number) {
  const { data, error } = await supabase
    .from('parcelas_receber')
    .select('*')
    .eq('cliente_id', cliente_id)
    .order('data_vencimento');

  if (error) {
    console.error('Erro ao buscar parcelas do cliente:', error);
    return [];
  }

  return data as ParcelaReceber[];
}

/**
 * Inserir nova parcela a receber
 * @param obraId - ID da obra selecionada; obrigatório para o lançamento aparecer na listagem por obra
 */
export async function insertParcelaReceber(
  cliente_id: number,
  descricao: string,
  valor: number,
  data_vencimento: string,
  categoria?: string,
  numero_documento?: string,
  observacoes?: string,
  obraId?: number | null
) {
  const empresa_id = await getEmpresaId();

  const { data, error } = await supabase
    .from('parcelas_receber')
    .insert([
      {
        cliente_id,
        descricao,
        valor,
        data_vencimento,
        categoria,
        numero_documento,
        observacoes,
        status: 'Pendente',
        empresa_id,
        obra_id: obraId ?? null
      }
    ])
    .select();

  if (error) {
    console.error('Erro ao inserir parcela a receber:', error);
    throw error;
  }

  return data[0] as ParcelaReceber;
}

/**
 * Atualizar parcela a receber
 */
export async function updateParcelaReceber(
  id: number,
  cliente_id: number,
  descricao: string,
  valor: number,
  data_vencimento: string,
  categoria?: string,
  numero_documento?: string,
  observacoes?: string
) {
  const { data, error } = await supabase
    .from('parcelas_receber')
    .update({
      cliente_id,
      descricao,
      valor,
      data_vencimento,
      categoria,
      numero_documento,
      observacoes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao atualizar parcela a receber:', error);
    throw error;
  }

  return data[0] as ParcelaReceber;
}

/**
 * Marcar parcela como recebida
 */
export async function marcarParcelaComoRecebida(
  id: number,
  data_recebimento: string,
  forma_recebimento: string
) {
  const { data, error } = await supabase
    .from('parcelas_receber')
    .update({
      status: 'Recebido',
      data_recebimento,
      forma_recebimento,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao marcar parcela como recebida:', error);
    throw error;
  }

  return data[0] as ParcelaReceber;
}

/**
 * Cancelar parcela a receber
 */
export async function cancelarParcelaReceber(id: number) {
  const { data, error } = await supabase
    .from('parcelas_receber')
    .update({
      status: 'Cancelado',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Erro ao cancelar parcela:', error);
    throw error;
  }

  return data[0] as ParcelaReceber;
}

/**
 * Deletar parcela a receber
 */
export async function deleteParcelaReceber(id: number) {
  const { error } = await supabase
    .from('parcelas_receber')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir parcela:', error);
    throw error;
  }

  return true;
}

/**
 * Atualizar status de parcelas atrasadas automaticamente
 */
export async function atualizarParcelasAtrasadas() {
  const hoje = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('parcelas_receber')
    .update({ status: 'Atrasado' })
    .eq('status', 'Pendente')
    .lt('data_vencimento', hoje);

  if (error) {
    console.error('Erro ao atualizar parcelas atrasadas:', error);
    return false;
  }

  return true;
}
