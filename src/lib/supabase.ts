import { supabase } from './supabaseClient';

export type CentroCusto = {
  id: number;
  codigo: string;
  descricao: string;
  orcado: number;
  custo: number;
  realizado: number;
  com_bdi: number;
  created_at: string;
  updated_at: string;
};

export type Grupo = {
  id: number;
  centro_custo_id: number;
  codigo: string;
  descricao: string;
  orcado: number;
  custo: number;
  realizado: number;
  com_bdi: number;
  created_at: string;
  updated_at: string;
};

export type ItemOrcamento = {
  id: number;
  grupo_id: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  com_bdi: number;
  created_at: string;
  updated_at: string;
};

export type ItemCusto = {
  id: number;
  grupo_id: number;
  item_orcamento_id: number | null;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  realizado: number;
  realizado_percentual: number;
  created_at: string;
  updated_at: string;
};

export type Fornecedor = {
  id: number;
  codigo: string;
  nome: string;
  documento: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Cliente = {
  id: number;
  codigo: string;
  nome: string;
  tipo: 'Pessoa Física' | 'Pessoa Jurídica' | 'Investidor';
  documento: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type ParcelaReceber = {
  id: number;
  cliente_id: number;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: 'Pendente' | 'Recebido' | 'Atrasado' | 'Cancelado';
  forma_recebimento: string | null;
  categoria: string | null;
  observacoes: string | null;
  numero_documento: string | null;
  created_at: string;
  updated_at: string;
};

export type Negociacao = {
  id: number;
  numero: string;
  tipo: string;
  fornecedor_id: number;
  descricao: string;
  data_inicio: string;
  data_fim: string | null;
  obra: string | null;
  engenheiro_responsavel: string | null;
  valor_total: number;
  created_at: string;
  updated_at: string;
  // Campos virtuais para exibição
  fornecedor?: Fornecedor;
};

export type ItemNegociacao = {
  id: number;
  negociacao_id: number;
  item_custo_id: number | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
  // Campos virtuais para controle de medições
  quantidade_ja_medida?: number;
  quantidade_disponivel?: number;
  percentual_executado?: number;
  totalmente_medido?: boolean;
};

export type Medicao = {
  id: number;
  negociacao_id: number;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: string; // "Aprovado" | "Pendente"
  desconto?: number;
  observacao?: string;
  created_at: string;
  updated_at: string;
  // Campos virtuais para exibição
  negociacao?: Negociacao;
  numero_ordem?: number;
};

export type ItemMedicao = {
  id: number;
  medicao_id: number;
  item_negociacao_id: number;
  descricao: string;
  unidade: string;
  quantidade_total: number;
  quantidade_medida: number;
  percentual_executado: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
};

export type PedidoCompra = {
  id: number;
  fornecedor_id: number;
  data_compra: string;
  valor_total: number;
  status: string; // "Aprovado" | "Pendente"
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Campos virtuais para exibição
  fornecedor?: Fornecedor;
  numero_ordem?: number;
};

export type ItemPedidoCompra = {
  id: number;
  pedido_compra_id: number;
  item_custo_id: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
  // Campos virtuais para exibição
  item_custo?: {
    codigo: string;
  };
};

export type ParcelaPagamento = {
  id: number;
  negociacao_id: number;
  data_prevista: string;
  valor: number;
  descricao: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ParcelaPedidoCompra = {
  id: number;
  pedido_compra_id: number;
  data_prevista: string;
  valor: number;
  descricao: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ParcelaMedicao = {
  id: number;
  medicao_id: number;
  data_prevista: string;
  valor: number;
  descricao: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

// Tipo auxiliar para a consulta que inclui o status da medição
type ItemMedicaoComStatus = {
  quantidade_medida: number;
  medicao_id: number;
  medicoes: {
    status: string;
  };
};

export async function fetchCentrosCusto(obraId?: number) {
  let query = supabase
    .from('centros_custo')
    .select('*');
  
  if (obraId) {
    query = query.eq('obra_id', obraId);
  }
  
  const { data, error } = await query.order('codigo');
  
  if (error) {
    console.error('Erro ao buscar centros de custo:', error);
    return [];
  }
  
  return data as CentroCusto[];
}

export async function insertCentroCusto(descricao: string) {
  // Buscar o último código para incrementar
  const { data: ultimoCentro, error: errorUltimo } = await supabase
    .from('centros_custo')
    .select('codigo')
    .order('codigo', { ascending: false })
    .limit(1);

  let novoCodigo = '01';
  
  if (!errorUltimo && ultimoCentro && ultimoCentro.length > 0) {
    const ultimoCodigo = parseInt(ultimoCentro[0].codigo);
    novoCodigo = (ultimoCodigo + 1).toString().padStart(2, '0');
  }
  
  const { data, error } = await supabase
    .from('centros_custo')
    .insert([
      { 
        codigo: novoCodigo,
        descricao,
        orcado: 0,
        custo: 0,
        realizado: 0,
        com_bdi: 0
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir centro de custo:', error);
    throw error;
  }
  
  // Atualizar totais do sistema após inserir um novo centro de custo
  await atualizarTodosTotais();
  
  return data[0] as CentroCusto;
}

export async function updateCentroCusto(id: number, descricao: string) {
  const { data, error } = await supabase
    .from('centros_custo')
    .update({ descricao, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar centro de custo:', error);
    throw error;
  }
  
  // Atualizar totais do sistema após atualizar um centro de custo
  await atualizarTodosTotais();
  
  return data[0] as CentroCusto;
}

export async function deleteCentroCusto(id: number) {
  const { error } = await supabase
    .from('centros_custo')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir centro de custo:', error);
    throw error;
  }
  
  // Atualizar totais do sistema após excluir um centro de custo
  await atualizarTodosTotais();
  
  return true;
}

// Funções para manipulação de grupos

export async function fetchGruposByCentroCusto(centroCustoId: number) {
  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .eq('centro_custo_id', centroCustoId)
    .order('codigo');
  
  if (error) {
    console.error('Erro ao buscar grupos:', error);
    return [];
  }
  
  return data as Grupo[];
}

export async function insertGrupo(centroCustoId: number, descricao: string) {
  // Buscar o código do centro de custo
  const { data: centroCusto, error: errorCentroCusto } = await supabase
    .from('centros_custo')
    .select('codigo')
    .eq('id', centroCustoId)
    .single();
  
  if (errorCentroCusto || !centroCusto) {
    console.error('Erro ao buscar centro de custo:', errorCentroCusto);
    throw errorCentroCusto;
  }

  // Buscar o último código de grupo para este centro de custo
  const { data: ultimoGrupo, error: errorUltimoGrupo } = await supabase
    .from('grupos')
    .select('codigo')
    .eq('centro_custo_id', centroCustoId)
    .order('codigo', { ascending: false })
    .limit(1);

  let novoCodigoSequencial = '01';
  
  if (!errorUltimoGrupo && ultimoGrupo && ultimoGrupo.length > 0) {
    // Extrair a parte sequencial (últimos 2 dígitos)
    const ultimoCodigoCompleto = ultimoGrupo[0].codigo;
    const partesUltimoCodigo = ultimoCodigoCompleto.split('.');
    const ultimoCodigoSequencial = partesUltimoCodigo.length > 1 ? partesUltimoCodigo[1] : '00';
    
    const novoSequencial = parseInt(ultimoCodigoSequencial) + 1;
    novoCodigoSequencial = novoSequencial.toString().padStart(2, '0');
  }
  
  // Construir o código completo: codigoCentroCusto.sequencial
  const novoCodigo = `${centroCusto.codigo}.${novoCodigoSequencial}`;
  
  const { data, error } = await supabase
    .from('grupos')
    .insert([
      { 
        centro_custo_id: centroCustoId,
        codigo: novoCodigo,
        descricao,
        orcado: 0,
        custo: 0,
        realizado: 0,
        com_bdi: 0
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir grupo:', error);
    throw error;
  }
  
  // Atualizar totais após inserir novo grupo
  await updateCentroCustoTotais(centroCustoId);
  
  return data[0] as Grupo;
}

export async function updateGrupo(id: number, descricao: string) {
  // Buscar o centro_custo_id do grupo para atualizar depois
  const { data: grupoAtual, error: errorGrupo } = await supabase
    .from('grupos')
    .select('centro_custo_id')
    .eq('id', id)
    .single();
    
  if (errorGrupo) {
    console.error('Erro ao buscar grupo:', errorGrupo);
    throw errorGrupo;
  }
  
  const { data, error } = await supabase
    .from('grupos')
    .update({ descricao, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar grupo:', error);
    throw error;
  }
  
  // Atualizar totais após atualizar grupo
  await updateGrupoTotais(id);
  await updateCentroCustoTotais(grupoAtual.centro_custo_id);
  
  return data[0] as Grupo;
}

export async function deleteGrupo(id: number) {
  // Buscar o centro_custo_id do grupo para atualizar depois
  const { data: grupoAtual, error: errorGrupo } = await supabase
    .from('grupos')
    .select('centro_custo_id')
    .eq('id', id)
    .single();
    
  if (errorGrupo) {
    console.error('Erro ao buscar grupo:', errorGrupo);
    throw errorGrupo;
  }
  
  const { error } = await supabase
    .from('grupos')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir grupo:', error);
    throw error;
  }
  
  // Atualizar totais após excluir grupo
  await updateCentroCustoTotais(grupoAtual.centro_custo_id);
  
  return true;
}

// Funções para manipulação de itens de orçamento

export async function fetchItensOrcamentoByGrupo(grupoId: number) {
  const { data, error } = await supabase
    .from('itens_orcamento')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('codigo');
  
  if (error) {
    console.error('Erro ao buscar itens de orçamento:', error);
    return [];
  }
  
  return data as ItemOrcamento[];
}

export async function insertItemOrcamento(
  grupoId: number, 
  descricao: string, 
  unidade: string, 
  quantidade: number, 
  precoUnitario: number,
  bdiPercentual: number = 0
) {
  const { data: grupo, error: errorGrupo } = await supabase
    .from('grupos')
    .select('codigo')
    .eq('id', grupoId)
    .single();
  
  if (errorGrupo || !grupo) {
    console.error('Erro ao buscar grupo:', errorGrupo);
    throw errorGrupo;
  }

  // Buscar o último código de item para este grupo
  const { data: ultimoItem, error: errorUltimoItem } = await supabase
    .from('itens_orcamento')
    .select('codigo')
    .eq('grupo_id', grupoId)
    .order('codigo', { ascending: false })
    .limit(1);

  let novoCodigoSequencial = '01';
  
  if (!errorUltimoItem && ultimoItem && ultimoItem.length > 0) {
    // Extrair a parte sequencial (últimos 2 dígitos)
    const ultimoCodigoCompleto = ultimoItem[0].codigo;
    const partesUltimoCodigo = ultimoCodigoCompleto.split('.');
    const ultimoCodigoSequencial = partesUltimoCodigo.length > 2 ? partesUltimoCodigo[2].replace('o', '') : '00';
    
    const novoSequencial = parseInt(ultimoCodigoSequencial) + 1;
    novoCodigoSequencial = novoSequencial.toString().padStart(2, '0');
  }
  
  // Construir o código completo: codigoGrupo.sequencial
  const novoCodigo = `${grupo.codigo}.${novoCodigoSequencial}o`;
  
  // Calcular total e total com BDI
  const total = quantidade * precoUnitario;
  const comBdi = total * (1 + (bdiPercentual / 100));
  
  const { data, error } = await supabase
    .from('itens_orcamento')
    .insert([
      { 
        grupo_id: grupoId,
        codigo: novoCodigo,
        descricao,
        unidade,
        quantidade,
        preco_unitario: precoUnitario,
        total,
        com_bdi: comBdi
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir item de orçamento:', error);
    throw error;
  }
  
  // Atualizar totais do grupo e centro de custo
  await updateGrupoTotais(grupoId);
  
  return data[0] as ItemOrcamento;
}

export async function updateItemOrcamento(
  id: number, 
  descricao: string, 
  unidade: string, 
  quantidade: number, 
  precoUnitario: number,
  bdiPercentual: number = 0
) {
  // Buscar o grupo_id do item para atualizar os totais depois
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_orcamento')
    .select('grupo_id')
    .eq('id', id)
    .single();
    
  if (errorItem) {
    console.error('Erro ao buscar item de orçamento:', errorItem);
    throw errorItem;
  }
  
  // Calcular total e total com BDI
  const total = quantidade * precoUnitario;
  const comBdi = total * (1 + (bdiPercentual / 100));
  
  const { data, error } = await supabase
    .from('itens_orcamento')
    .update({ 
      descricao, 
      unidade,
      quantidade,
      preco_unitario: precoUnitario,
      total,
      com_bdi: comBdi,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar item de orçamento:', error);
    throw error;
  }
  
  // Atualizar totais do grupo e centro de custo
  await updateGrupoTotais(itemAtual.grupo_id);
  
  return data[0] as ItemOrcamento;
}

export async function deleteItemOrcamento(id: number) {
  // Buscar o grupo_id do item para atualizar os totais depois
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_orcamento')
    .select('grupo_id')
    .eq('id', id)
    .single();
    
  if (errorItem) {
    console.error('Erro ao buscar item de orçamento:', errorItem);
    throw errorItem;
  }
  
  const { error } = await supabase
    .from('itens_orcamento')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir item de orçamento:', error);
    throw error;
  }
  
  // Atualizar totais do grupo e centro de custo
  await updateGrupoTotais(itemAtual.grupo_id);
  
  return true;
}

// Funções para manipulação de itens de custo

export async function fetchItensCustoByGrupo(grupoId: number) {
  const { data, error } = await supabase
    .from('itens_custo')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('codigo');
  
  if (error) {
    console.error('Erro ao buscar itens de custo:', error);
    return [];
  }
  
  return data as ItemCusto[];
}

export async function insertItemCusto(
  grupoId: number, 
  itemOrcamentoId: number | null,
  descricao: string, 
  unidade: string, 
  quantidade: number, 
  precoUnitario: number,
  realizado: number = 0,
  realizadoPercentual: number = 0
) {
  const { data: grupo, error: errorGrupo } = await supabase
    .from('grupos')
    .select('codigo')
    .eq('id', grupoId)
    .single();
  
  if (errorGrupo || !grupo) {
    console.error('Erro ao buscar grupo:', errorGrupo);
    throw errorGrupo;
  }

  // Buscar o último código de item de custo para este grupo
  const { data: ultimoItem, error: errorUltimoItem } = await supabase
    .from('itens_custo')
    .select('codigo')
    .eq('grupo_id', grupoId)
    .order('codigo', { ascending: false })
    .limit(1);

  let novoCodigoSequencial = '01';
  
  if (!errorUltimoItem && ultimoItem && ultimoItem.length > 0) {
    // Extrair a parte sequencial (últimos 2 dígitos)
    const ultimoCodigoCompleto = ultimoItem[0].codigo;
    const partesUltimoCodigo = ultimoCodigoCompleto.split('.');
    const ultimoCodigoSequencial = partesUltimoCodigo.length > 2 ? partesUltimoCodigo[2].replace('c', '') : '00';
    
    const novoSequencial = parseInt(ultimoCodigoSequencial) + 1;
    novoCodigoSequencial = novoSequencial.toString().padStart(2, '0');
  }
  
  // Construir o código completo: codigoGrupo.sequencial
  const novoCodigo = `${grupo.codigo}.${novoCodigoSequencial}c`;
  
  // Calcular total
  const total = quantidade * precoUnitario;
  
  const { data, error } = await supabase
    .from('itens_custo')
    .insert([
      { 
        grupo_id: grupoId,
        item_orcamento_id: itemOrcamentoId,
        codigo: novoCodigo,
        descricao,
        unidade,
        quantidade,
        preco_unitario: precoUnitario,
        total,
        realizado,
        realizado_percentual: realizadoPercentual
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir item de custo:', error);
    throw error;
  }
  
  // Atualizar totais do grupo e centro de custo
  await updateGrupoTotais(grupoId);
  
  return data[0] as ItemCusto;
}

export async function updateItemCusto(
  id: number, 
  descricao: string, 
  unidade: string, 
  quantidade: number, 
  precoUnitario: number,
  realizado: number,
  realizadoPercentual: number
) {
  // Buscar o grupo_id do item para atualizar os totais depois
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_custo')
    .select('grupo_id')
    .eq('id', id)
    .single();
    
  if (errorItem) {
    console.error('Erro ao buscar item de custo:', errorItem);
    throw errorItem;
  }
  
  // Calcular total
  const total = quantidade * precoUnitario;
  
  const { data, error } = await supabase
    .from('itens_custo')
    .update({ 
      descricao, 
      unidade,
      quantidade,
      preco_unitario: precoUnitario,
      total,
      realizado,
      realizado_percentual: realizadoPercentual,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar item de custo:', error);
    throw error;
  }
  
  // Atualizar totais do grupo e centro de custo
  await updateGrupoTotais(itemAtual.grupo_id);
  
  return data[0] as ItemCusto;
}

export async function deleteItemCusto(id: number) {
  // Buscar o grupo_id do item para atualizar os totais depois
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_custo')
    .select('grupo_id')
    .eq('id', id)
    .single();
    
  if (errorItem) {
    console.error('Erro ao buscar item de custo:', errorItem);
    throw errorItem;
  }
  
  const { error } = await supabase
    .from('itens_custo')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir item de custo:', error);
    throw error;
  }
  
  // Atualizar totais do grupo e centro de custo
  await updateGrupoTotais(itemAtual.grupo_id);
  
  return true;
}

export async function updateCentroCustoTotais(centroCustoId: number) {
  try {
    // Buscar todos os grupos deste centro de custo com os valores necessários
    const { data: grupos, error: errorGrupos } = await supabase
      .from('grupos')
      .select('orcado, custo, realizado, com_bdi')
      .eq('centro_custo_id', centroCustoId);
    
    if (errorGrupos) {
      console.error('Erro ao buscar grupos para atualização de totais:', errorGrupos);
      throw errorGrupos;
    }
    
    if (!grupos || grupos.length === 0) {
      console.warn(`Nenhum grupo encontrado para o centro de custo ${centroCustoId}`);
      // Se não houver grupos, zerar os valores do centro de custo
      await supabase
        .from('centros_custo')
        .update({
          orcado: 0,
          custo: 0,
          realizado: 0,
          com_bdi: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', centroCustoId);
      return;
    }
    
    // Calcular os totais (somando valores dos grupos)
    const orcadoTotal = grupos.reduce((sum, grupo) => sum + (grupo.orcado || 0), 0);
    const custoTotal = grupos.reduce((sum, grupo) => sum + (grupo.custo || 0), 0);
    const realizadoTotal = grupos.reduce((sum, grupo) => sum + (grupo.realizado || 0), 0);
    const comBdiTotal = grupos.reduce((sum, grupo) => sum + (grupo.com_bdi || 0), 0);
    
    // Atualizar o centro de custo
    await supabase
      .from('centros_custo')
      .update({
        orcado: orcadoTotal,
        custo: custoTotal,
        realizado: realizadoTotal,
        com_bdi: comBdiTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', centroCustoId);
    
    return {
      orcado: orcadoTotal,
      custo: custoTotal,
      realizado: realizadoTotal,
      com_bdi: comBdiTotal
    };
  } catch (error) {
    console.error('Erro ao atualizar totais do centro de custo:', error);
    throw error;
  }
}

export async function updateGrupoTotais(grupoId: number) {
  try {
    // Buscar dados em paralelo para reduzir tempo de espera
    const [resultOrcamento, resultCusto, grupoInfo] = await Promise.all([
      supabase
        .from('itens_orcamento')
        .select('total, com_bdi')
        .eq('grupo_id', grupoId),
      supabase
        .from('itens_custo')
        .select('total, realizado')
        .eq('grupo_id', grupoId),
      supabase
        .from('grupos')
        .select('centro_custo_id')
        .eq('id', grupoId)
        .single()
    ]);
    
    if (resultOrcamento.error) {
      console.error('Erro ao buscar itens de orçamento para atualização de totais:', resultOrcamento.error);
      throw resultOrcamento.error;
    }
    
    if (resultCusto.error) {
      console.error('Erro ao buscar itens de custo para atualização de totais:', resultCusto.error);
      throw resultCusto.error;
    }
    
    if (!grupoInfo.data) {
      console.error('Grupo não encontrado:', grupoId);
      return;
    }
    
    // Calcular os totais
    const orcadoTotal = resultOrcamento.data?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
    const comBdiTotal = resultOrcamento.data?.reduce((sum, item) => sum + (item.com_bdi || 0), 0) || 0;
    const custoTotal = resultCusto.data?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
    const realizadoTotal = resultCusto.data?.reduce((sum, item) => sum + (item.realizado || 0), 0) || 0;
    
    // Atualizar o grupo
    await supabase
      .from('grupos')
      .update({
        orcado: orcadoTotal,
        custo: custoTotal,
        realizado: realizadoTotal,
        com_bdi: comBdiTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', grupoId);
    
    // Após atualizar o grupo, atualizar o centro de custo pai em background
    if (grupoInfo.data.centro_custo_id) {
      // Executar em background sem bloquear o retorno da função
      updateCentroCustoTotais(grupoInfo.data.centro_custo_id).catch(error => {
        console.error('Erro ao atualizar centro de custo em background:', error);
      });
    }
    
    return {
      orcado: orcadoTotal,
      custo: custoTotal,
      realizado: realizadoTotal,
      com_bdi: comBdiTotal
    };
  } catch (error) {
    console.error('Erro ao atualizar totais do grupo:', error);
    throw error;
  }
}

export async function atualizarTodosTotais() {
  try {
    console.log('Iniciando atualização de todos os totais do sistema...');

    // Usar transações para reduzir o número de chamadas ao banco de dados
    const { data: grupos, error: errorGrupos } = await supabase
      .from('grupos')
      .select('id, centro_custo_id');
    
    if (errorGrupos) {
      console.error('Erro ao buscar grupos para atualização completa:', errorGrupos);
      throw errorGrupos;
    }
    
    if (!grupos || grupos.length === 0) {
      console.warn('Nenhum grupo encontrado no sistema');
      return;
    }

    // Agrupar grupos por centro de custo para reduzir consultas
    const grupoPorCentroCusto: Record<number, number[]> = {};
    
    grupos.forEach(grupo => {
      if (!grupoPorCentroCusto[grupo.centro_custo_id]) {
        grupoPorCentroCusto[grupo.centro_custo_id] = [];
      }
      grupoPorCentroCusto[grupo.centro_custo_id].push(grupo.id);
    });

    // Buscar todos os itens de orçamento e custo em uma só consulta por grupo
    for (const grupo of grupos) {
      // Buscar dados em paralelo para cada grupo
      const [resultOrcamento, resultCusto] = await Promise.all([
        supabase
          .from('itens_orcamento')
          .select('total, com_bdi')
          .eq('grupo_id', grupo.id),
        supabase
          .from('itens_custo')
          .select('total, realizado')
          .eq('grupo_id', grupo.id)
      ]);

      // Calcular os totais
      const orcadoTotal = resultOrcamento.data?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
      const comBdiTotal = resultOrcamento.data?.reduce((sum, item) => sum + (item.com_bdi || 0), 0) || 0;
      const custoTotal = resultCusto.data?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
      const realizadoTotal = resultCusto.data?.reduce((sum, item) => sum + (item.realizado || 0), 0) || 0;
      
      // Atualizar o grupo
      await supabase
        .from('grupos')
        .update({ 
          orcado: orcadoTotal,
          custo: custoTotal,
          realizado: realizadoTotal,
          com_bdi: comBdiTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', grupo.id);
    }

    // Atualizar centros de custo em uma única iteração
    const centrosCustoIds = Object.keys(grupoPorCentroCusto).map(id => parseInt(id));
    
    // Para cada centro de custo, calcular totais dos grupos
    for (const centroCustoId of centrosCustoIds) {
      const { data: gruposCentro } = await supabase
        .from('grupos')
        .select('orcado, custo, realizado, com_bdi')
        .eq('centro_custo_id', centroCustoId);
      
      if (!gruposCentro || gruposCentro.length === 0) {
        continue;
      }
      
      // Calcular os totais
      const orcadoTotal = gruposCentro.reduce((sum, grupo) => sum + (grupo.orcado || 0), 0);
      const custoTotal = gruposCentro.reduce((sum, grupo) => sum + (grupo.custo || 0), 0);
      const realizadoTotal = gruposCentro.reduce((sum, grupo) => sum + (grupo.realizado || 0), 0);
      const comBdiTotal = gruposCentro.reduce((sum, grupo) => sum + (grupo.com_bdi || 0), 0);
      
      // Atualizar o centro de custo
      await supabase
        .from('centros_custo')
        .update({ 
          orcado: orcadoTotal,
          custo: custoTotal,
          realizado: realizadoTotal,
          com_bdi: comBdiTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', centroCustoId);
    }
    
    console.log('Atualização de todos os totais concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao atualizar todos os totais do sistema:', error);
    throw error;
  }
}

// Versão leve da atualização para carregamentos iniciais
export async function carregarTotaisSemAtualizar() {
  try {
    // Esta função apenas carrega os dados, sem atualizar os totais
    // É usada para exibição rápida quando a página é carregada
    return true;
  } catch (error) {
    console.error('Erro ao carregar totais do sistema:', error);
    return false;
  }
}

export async function fetchFornecedores(obraId?: number) {
  let query = supabase
    .from('fornecedores')
    .select('*');
  
  if (obraId) {
    query = query.eq('obra_id', obraId);
  }
  
  const { data, error } = await query.order('codigo');
  
  if (error) {
    console.error('Erro ao buscar fornecedores:', error);
    return [];
  }
  
  return data as Fornecedor[];
}

export async function fetchFornecedorById(id: number) {
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Erro ao buscar fornecedor:', error);
    return null;
  }
  
  return data as Fornecedor;
}

export async function insertFornecedor(
  nome: string, 
  documento: string, 
  contato?: string, 
  telefone?: string, 
  email?: string
) {
  // Buscar o último código para incrementar
  const { data: ultimoFornecedor, error: errorUltimo } = await supabase
    .from('fornecedores')
    .select('codigo')
    .order('codigo', { ascending: false })
    .limit(1);

  let novoCodigo = '001';
  
  if (!errorUltimo && ultimoFornecedor && ultimoFornecedor.length > 0) {
    const ultimoCodigo = parseInt(ultimoFornecedor[0].codigo);
    novoCodigo = (ultimoCodigo + 1).toString().padStart(3, '0');
  }
  
  const { data, error } = await supabase
    .from('fornecedores')
    .insert([
      { 
        codigo: novoCodigo,
        nome,
        documento,
        contato,
        telefone,
        email
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir fornecedor:', error);
    throw error;
  }
  
  return data[0] as Fornecedor;
}

export async function updateFornecedor(
  id: number, 
  nome: string, 
  documento: string, 
  contato?: string, 
  telefone?: string, 
  email?: string
) {
  const { data, error } = await supabase
    .from('fornecedores')
    .update({ 
      nome, 
      documento, 
      contato, 
      telefone, 
      email, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    throw error;
  }
  
  return data[0] as Fornecedor;
}

// Função para verificar se um fornecedor possui negociações ou pedidos de compra
export async function verificarFornecedorPossuiRelacionamentos(id: number) {
  // Verificar se o fornecedor tem negociações
  const { data: negociacoes, error: errorNegociacoes } = await supabase
    .from('negociacoes')
    .select('id')
    .eq('fornecedor_id', id)
    .limit(1);
  
  if (errorNegociacoes) {
    console.error('Erro ao verificar negociações do fornecedor:', errorNegociacoes);
    throw errorNegociacoes;
  }
  
  if (negociacoes && negociacoes.length > 0) {
    return {
      possuiRelacionamentos: true,
      tipo: 'negociações'
    };
  }
  
  // Verificar se o fornecedor tem pedidos de compra
  const { data: pedidosCompra, error: errorPedidos } = await supabase
    .from('pedidos_compra')
    .select('id')
    .eq('fornecedor_id', id)
    .limit(1);
  
  if (errorPedidos) {
    console.error('Erro ao verificar pedidos de compra do fornecedor:', errorPedidos);
    throw errorPedidos;
  }
  
  if (pedidosCompra && pedidosCompra.length > 0) {
    return {
      possuiRelacionamentos: true,
      tipo: 'pedidos de compra'
    };
  }
  
  return {
    possuiRelacionamentos: false
  };
}

export async function deleteFornecedor(id: number) {
  // Verificar relacionamentos antes de excluir
  const { possuiRelacionamentos, tipo } = await verificarFornecedorPossuiRelacionamentos(id);
  
  if (possuiRelacionamentos) {
    throw new Error(`Não é possível excluir este fornecedor porque ele possui ${tipo} vinculados. Exclua primeiro todas as negociações ou pedidos associados a este fornecedor.`);
  }
  
  const { error } = await supabase
    .from('fornecedores')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir fornecedor:', error);
    throw error;
  }
  
  return true;
}

export async function fetchNegociacoes(obraId?: number) {
  let query = supabase
    .from('negociacoes')
    .select(`
      *,
      fornecedor:fornecedor_id(*)
    `);
  
  if (obraId) {
    query = query.eq('obra_id', obraId);
  }
  
  const { data, error } = await query.order('numero');
  
  if (error) {
    console.error('Erro ao buscar negociações:', error);
    return [];
  }
  
  return data as Negociacao[];
}

export async function fetchNegociacaoById(id: number) {
  const { data, error } = await supabase
    .from('negociacoes')
    .select(`
      *,
      fornecedor:fornecedor_id(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Erro ao buscar negociação:', error);
    return null;
  }
  
  return data as Negociacao;
}

export async function insertNegociacao(
  tipo: string,
  fornecedor_id: number,
  descricao: string,
  data_inicio: string,
  data_fim?: string,
  obra?: string,
  engenheiro_responsavel?: string
) {
  // Gerar número baseado no tipo e sequence
  const prefixo = tipo === 'Contrato' ? 'CT' : tipo === 'Pedido de Compra' ? 'PC' : 'LOC';
  
  // Buscar o último número para este tipo
  const { data: ultimaNegociacao, error: errorUltima } = await supabase
    .from('negociacoes')
    .select('numero')
    .ilike('numero', `${prefixo}%`)
    .order('numero', { ascending: false })
    .limit(1);

  let sequencial = 1;
  
  if (!errorUltima && ultimaNegociacao && ultimaNegociacao.length > 0) {
    // Extrair o número da última negociação (ex: PC/0123 -> 123)
    const ultimoNumero = ultimaNegociacao[0].numero;
    const match = ultimoNumero.match(/\/(\d+)$/);
    
    if (match && match[1]) {
      sequencial = parseInt(match[1]) + 1;
    }
  }
  
  const numero = `${prefixo}/${sequencial.toString().padStart(4, '0')}`;
  
  const { data, error } = await supabase
    .from('negociacoes')
    .insert([
      { 
        numero,
        tipo,
        fornecedor_id,
        descricao,
        data_inicio,
        data_fim,
        obra,
        engenheiro_responsavel,
        valor_total: 0
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir negociação:', error);
    throw error;
  }
  
  return data[0] as Negociacao;
}

export async function updateNegociacao(
  id: number,
  tipo: string,
  fornecedor_id: number,
  descricao: string,
  data_inicio: string,
  data_fim?: string,
  obra?: string,
  engenheiro_responsavel?: string
) {
  const { data, error } = await supabase
    .from('negociacoes')
    .update({ 
      tipo,
      fornecedor_id,
      descricao,
      data_inicio,
      data_fim,
      obra,
      engenheiro_responsavel,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar negociação:', error);
    throw error;
  }
  
  return data[0] as Negociacao;
}

export async function deleteNegociacao(id: number) {
  const { error } = await supabase
    .from('negociacoes')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir negociação:', error);
    throw error;
  }
  
  return true;
}

export async function fetchParcelasPagamentoByNegociacao(negociacao_id: number) {
  const { data, error } = await supabase
    .from('parcelas_pagamento')
    .select('*')
    .eq('negociacao_id', negociacao_id)
    .order('data_prevista');
  
  if (error) {
    console.error('Erro ao buscar parcelas de pagamento:', error);
    return [];
  }
  
  return data as ParcelaPagamento[];
}

export async function insertParcelaPagamento(
  negociacao_id: number,
  data_prevista: string,
  valor: number,
  descricao?: string
) {
  const { data, error } = await supabase
    .from('parcelas_pagamento')
    .insert([
      { 
        negociacao_id,
        data_prevista,
        valor,
        descricao,
        status: 'Pendente'
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir parcela de pagamento:', error);
    throw error;
  }
  
  return data[0] as ParcelaPagamento;
}

export async function updateParcelaPagamento(
  id: number,
  data_prevista: string,
  valor: number,
  descricao?: string,
  status?: string
) {
  const { data, error } = await supabase
    .from('parcelas_pagamento')
    .update({ 
      data_prevista,
      valor,
      descricao,
      status,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar parcela de pagamento:', error);
    throw error;
  }
  
  return data[0] as ParcelaPagamento;
}

export async function deleteParcelaPagamento(id: number) {
  const { error } = await supabase
    .from('parcelas_pagamento')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir parcela de pagamento:', error);
    throw error;
  }
  
  return true;
}

export async function fetchItensNegociacao(negociacaoId: number) {
  const { data, error } = await supabase
    .from('itens_negociacao')
    .select('*')
    .eq('negociacao_id', negociacaoId)
    .order('id');
  
  if (error) {
    console.error('Erro ao buscar itens da negociação:', error);
    return [];
  }
  
  return data as ItemNegociacao[];
}

export async function insertItemNegociacao(
  negociacao_id: number,
  item_custo_id: number | null,
  descricao: string,
  unidade: string,
  quantidade: number,
  valor_unitario: number
) {
  const valor_total = quantidade * valor_unitario;
  
  const { data, error } = await supabase
    .from('itens_negociacao')
    .insert([
      { 
        negociacao_id,
        item_custo_id,
        descricao,
        unidade,
        quantidade,
        valor_unitario,
        valor_total
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir item de negociação:', error);
    throw error;
  }
  
  // Atualizar o valor total da negociação
  await atualizarValorTotalNegociacao(negociacao_id);
  
  return data[0] as ItemNegociacao;
}

export async function updateItemNegociacao(
  id: number,
  descricao: string,
  unidade: string,
  quantidade: number,
  valor_unitario: number
) {
  // Buscar a negociação_id para atualizar seu valor total depois
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_negociacao')
    .select('negociacao_id')
    .eq('id', id)
    .single();
    
  if (errorItem) {
    console.error('Erro ao buscar item de negociação:', errorItem);
    throw errorItem;
  }
  
  const valor_total = quantidade * valor_unitario;
  
  const { data, error } = await supabase
    .from('itens_negociacao')
    .update({ 
      descricao,
      unidade,
      quantidade,
      valor_unitario,
      valor_total,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar item de negociação:', error);
    throw error;
  }
  
  // Atualizar o valor total da negociação
  await atualizarValorTotalNegociacao(itemAtual.negociacao_id);
  
  return data[0] as ItemNegociacao;
}

export async function deleteItemNegociacao(id: number) {
  // Buscar a negociação_id para atualizar seu valor total depois
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_negociacao')
    .select('negociacao_id')
    .eq('id', id)
    .single();
    
  if (errorItem) {
    console.error('Erro ao buscar item de negociação:', errorItem);
    throw errorItem;
  }
  
  const { error } = await supabase
    .from('itens_negociacao')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir item de negociação:', error);
    throw error;
  }
  
  // Atualizar o valor total da negociação
  await atualizarValorTotalNegociacao(itemAtual.negociacao_id);
  
  return true;
}

export async function atualizarValorTotalNegociacao(negociacaoId: number) {
  try {
    // Buscar todos os itens desta negociação
    const { data: itens, error: errorItens } = await supabase
      .from('itens_negociacao')
      .select('valor_total')
      .eq('negociacao_id', negociacaoId);
    
    if (errorItens) {
      console.error('Erro ao buscar itens para atualização de valor total:', errorItens);
      throw errorItens;
    }
    
    // Calcular o valor total da negociação
    const valorTotal = itens.reduce((sum, item) => sum + (item.valor_total || 0), 0);
    
    // Atualizar a negociação
    await supabase
      .from('negociacoes')
      .update({
        valor_total: valorTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', negociacaoId);
    
    return valorTotal;
  } catch (error) {
    console.error('Erro ao atualizar valor total da negociação:', error);
    throw error;
  }
}

export async function fetchItensCusto() {
  const { data, error } = await supabase
    .from('itens_custo')
    .select(`
      *,
      grupo:grupo_id(
        codigo,
        descricao,
        centro_custo:centro_custo_id(
          codigo,
          descricao
        )
      )
    `)
    .order('codigo');
  
  if (error) {
    console.error('Erro ao buscar itens de custo:', error);
    return [];
  }
  
  return data;
}

// Funções para manipulação de medições

export async function fetchMedicoes(obraId?: number) {
  let query = supabase
    .from('medicoes')
    .select(`
      *,
      negociacao:negociacao_id (
        *,
        fornecedor:fornecedor_id (*)
      )
    `);
  
  if (obraId) {
    query = query.eq('obra_id', obraId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar medições:', error);
    return [];
  }
  
  // Agrupar medições por negociação_id e atribuir número de ordem por contrato
  const negociacoesMap = new Map<number, any[]>();
  
  // Primeiro passo: agrupar medições por negociação
  data.forEach(medicao => {
    if (!negociacoesMap.has(medicao.negociacao_id)) {
      negociacoesMap.set(medicao.negociacao_id, []);
    }
    negociacoesMap.get(medicao.negociacao_id)!.push(medicao);
  });
  
  // Segundo passo: atribuir números de ordem por negociação
  const medicoesComOrdem: any[] = [];
  
  negociacoesMap.forEach(medicoes => {
    // Ordenar as medições de cada negociação por data de criação (do mais antigo para o mais recente)
    const medicoesOrdenadas = [...medicoes].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Atribuir número de ordem dentro do contexto da negociação
    medicoesOrdenadas.forEach((medicao, index) => {
      medicoesComOrdem.push({
        ...medicao,
        numero_ordem: index + 1
      });
    });
  });
  
  // Manter a ordenação original (created_at decrescente)
  return medicoesComOrdem.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) as Medicao[];
}

export async function fetchMedicaoById(id: number) {
  const { data, error } = await supabase
    .from('medicoes')
    .select(`
      *,
      negociacao:negociacao_id (
        *,
        fornecedor:fornecedor_id (*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Erro ao buscar medição:', error);
    throw error;
  }
  
  return data as Medicao;
}

export async function insertMedicao(
  negociacao_id: number,
  data_inicio: string,
  data_fim: string,
  observacao?: string,
  desconto?: number
) {
  const { data, error } = await supabase
    .from('medicoes')
    .insert([
      { 
        negociacao_id,
        data_inicio,
        data_fim,
        valor_total: 0,
        status: 'Pendente',
        observacao,
        desconto: desconto || 0
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir medição:', error);
    throw error;
  }
  
  return data[0] as Medicao;
}

export async function updateMedicao(
  id: number,
  data_inicio: string,
  data_fim: string,
  status?: string,
  desconto?: number
) {
  try {
    console.log('📋 Iniciando atualização da medição:', id, status ? `-> ${status}` : '');
    
    const updateData: any = {
      data_inicio,
      data_fim,
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
    }
    
    if (desconto !== undefined) {
      updateData.desconto = desconto;
    }

    // Atualizar a medição
    const { data, error } = await supabase
      .from('medicoes')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar medição:', error);
      throw error;
    }
    
    console.log('✅ Medição atualizada com sucesso');
    
    // Se o status foi alterado para "Aprovado", atualizar itens de custo em background
    if (status === 'Aprovado') {
      console.log('🔄 Processando aprovação em background...');
      
      // Executar atualizações em background sem bloquear o retorno
      (async () => {
        try {
          // Buscar todos os itens desta medição
          const { data: itensMedicao, error: errorItens } = await supabase
            .from('itens_medicao')
            .select('item_negociacao_id')
            .eq('medicao_id', id);
          
          if (errorItens) {
            console.error('Erro ao buscar itens da medição para atualização em background:', errorItens);
            return;
          }
          
          // Filtrar IDs únicos
          const itemNegociacaoIds: number[] = [];
          itensMedicao?.forEach(item => {
            if (item.item_negociacao_id && !itemNegociacaoIds.includes(item.item_negociacao_id)) {
              itemNegociacaoIds.push(item.item_negociacao_id);
            }
          });
          
          console.log('🔄 Atualizando', itemNegociacaoIds.length, 'itens de custo em background...');
          
          // Atualizar itens de custo em paralelo
          const atualizacoes = itemNegociacaoIds.map(itemId => 
            atualizarRealizadoItemCusto(itemId).catch(error => {
              console.error('Erro ao atualizar item de custo em background:', error);
            })
          );
          
          await Promise.all(atualizacoes);
          
          // Atualizar totais do sistema
          console.log('🔄 Atualizando totais do sistema em background...');
          await atualizarTodosTotais().catch(error => {
            console.error('Erro ao atualizar totais em background:', error);
          });
          
          console.log('🎉 Processamento de aprovação concluído em background!');
          
        } catch (err) {
          console.error('💥 Erro durante processamento em background:', err);
        }
      })();
    }
    
    console.log('🎉 Atualização da medição concluída!');
    return data[0] as Medicao;
    
  } catch (error) {
    console.error('💥 Erro durante atualização da medição:', error);
    throw error;
  }
}

export async function deleteMedicao(id: number) {
  try {
    console.log('🗑️ Iniciando exclusão da medição:', id);
    
    // Buscar itens da medição
    const { data: itensMedicao, error: errorItens } = await supabase
      .from('itens_medicao')
      .select('item_negociacao_id')
      .eq('medicao_id', id);
    
    if (errorItens) {
      console.error('Erro ao buscar itens da medição para exclusão:', errorItens);
      throw errorItens;
    }
    
    const itemNegociacaoIds = itensMedicao?.map(item => item.item_negociacao_id) || [];
    console.log('📦 Itens da medição encontrados:', itemNegociacaoIds.length);
    
    // Executar exclusões em paralelo
    const [deleteItensResult, deleteMedicaoResult] = await Promise.all([
      supabase
        .from('itens_medicao')
        .delete()
        .eq('medicao_id', id),
      supabase
        .from('medicoes')
        .delete()
        .eq('id', id)
    ]);
    
    if (deleteItensResult.error) {
      console.error('Erro ao excluir itens da medição:', deleteItensResult.error);
      throw deleteItensResult.error;
    }
    
    if (deleteMedicaoResult.error) {
      console.error('Erro ao excluir medição:', deleteMedicaoResult.error);
      throw deleteMedicaoResult.error;
    }
    
    console.log('✅ Exclusão da medição concluída com sucesso');
    
    // Atualizar valores realizados em background
    if (itemNegociacaoIds.length > 0) {
      console.log('🔄 Atualizando valores realizados em background...');
      
      // Executar atualizações em background sem bloquear o retorno
      Promise.all([
        // Atualizar itens de custo afetados em paralelo
        ...itemNegociacaoIds.map(itemId => 
          atualizarRealizadoItemCusto(itemId).catch(error => {
            console.error('Erro ao atualizar item de custo em background:', error);
          })
        )
      ]).then(() => {
        console.log('🔄 Atualizando totais do sistema em background...');
        // Atualizar totais do sistema por último
        return atualizarTodosTotais().catch(error => {
          console.error('Erro ao atualizar totais em background:', error);
        });
      }).catch(error => {
        console.error('Erro durante atualizações em background:', error);
      });
    }
    
    console.log('🎉 Exclusão da medição concluída!');
    return true;
    
  } catch (error) {
    console.error('💥 Erro durante exclusão da medição:', error);
    throw error;
  }
}

export async function fetchItensMedicao(medicaoId: number) {
  const { data, error } = await supabase
    .from('itens_medicao')
    .select('*')
    .eq('medicao_id', medicaoId)
    .order('id');
  
  if (error) {
    console.error('Erro ao buscar itens da medição:', error);
    return [];
  }
  
  return data as ItemMedicao[];
}

export async function fetchItensNegociacaoDisponiveisParaMedicao(negociacaoId: number, medicaoId?: number) {
  // Primeiro buscamos todos os itens da negociação
  const { data: itensNegociacao, error: errorItens } = await supabase
    .from('itens_negociacao')
    .select('*')
    .eq('negociacao_id', negociacaoId);
  
  if (errorItens) {
    console.error('Erro ao buscar itens da negociação:', errorItens);
    return [];
  }
  
  // Buscar medições aprovadas uma única vez para otimização
  const { data: medicoesAprovadas, error: errorMedicoes } = await supabase
    .from('medicoes')
    .select('id')
    .eq('negociacao_id', negociacaoId)
    .eq('status', 'Aprovado');
  
  if (errorMedicoes) {
    console.error('Erro ao buscar medições aprovadas:', errorMedicoes);
    return itensNegociacao;
  }
  
  const medicoesAprovadasIds = medicoesAprovadas.map(m => m.id);
  
  // Se estamos editando uma medição, incluir também essa medição na busca (mesmo que não aprovada)
  let medicoesParaBuscar = medicoesAprovadasIds;
  if (medicaoId) {
    medicoesParaBuscar = [...medicoesAprovadasIds, medicaoId];
  }
  
  // Para cada item da negociação, calcular as quantidades já medidas
  const itensComInformacoes = [];
  
  for (const item of itensNegociacao) {
    let somaQuantidadesJaMedidas = 0;
    
    if (medicoesParaBuscar.length > 0) {
      const { data: itensMedicao, error: errorItensMedicao } = await supabase
        .from('itens_medicao')
        .select('quantidade_medida')
        .eq('item_negociacao_id', item.id)
        .in('medicao_id', medicoesParaBuscar);
      
      if (errorItensMedicao) {
        console.error('Erro ao buscar itens de medição:', errorItensMedicao);
        somaQuantidadesJaMedidas = 0;
      } else {
        somaQuantidadesJaMedidas = itensMedicao.reduce((total, itemMedicao) => {
          return total + itemMedicao.quantidade_medida;
        }, 0);
      }
    }
    
    const quantidadeRestante = item.quantidade - somaQuantidadesJaMedidas;
    const percentualExecutado = (somaQuantidadesJaMedidas / item.quantidade) * 100;
    const totalmente_medido = percentualExecutado >= 100;
    
    // Sempre incluir o item, mas com informações sobre sua situação
    itensComInformacoes.push({
      ...item,
      quantidade_ja_medida: somaQuantidadesJaMedidas,
      quantidade_disponivel: Math.max(0, quantidadeRestante),
      percentual_executado: percentualExecutado,
      totalmente_medido: totalmente_medido
    });
  }
  
  return itensComInformacoes;
}

export async function insertItemMedicao(
  medicao_id: number,
  item_negociacao_id: number,
  descricao: string,
  unidade: string,
  quantidade_total: number,
  quantidade_medida: number,
  valor_unitario: number
) {
  const percentual_executado = (quantidade_medida / quantidade_total) * 100;
  const valor_total = quantidade_medida * valor_unitario;
  
  const { data, error } = await supabase
    .from('itens_medicao')
    .insert([
      { 
        medicao_id,
        item_negociacao_id,
        descricao,
        unidade,
        quantidade_total,
        quantidade_medida,
        percentual_executado,
        valor_unitario,
        valor_total
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir item de medição:', error);
    throw error;
  }
  
  // Atualiza o valor total da medição
  await atualizarValorTotalMedicao(medicao_id);
  
  // Atualiza o valor realizado no item de custo original
  await atualizarRealizadoItemCusto(item_negociacao_id);
  
  return data[0] as ItemMedicao;
}

export async function updateItemMedicao(
  id: number,
  quantidade_medida: number
) {
  // Primeiro obtemos os dados atuais do item
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_medicao')
    .select('medicao_id, item_negociacao_id, quantidade_total, valor_unitario')
    .eq('id', id)
    .single();
  
  if (errorItem || !itemAtual) {
    console.error('Erro ao buscar item de medição:', errorItem);
    throw errorItem;
  }
  
  // Calcular percentual e valor total
  // IMPORTANTE: Usar o valor_unitario já salvo na medição, não buscar o atual da negociação
  // Isso preserva o valor unitário original da medição, evitando recálculos indevidos
  const percentual_executado = (quantidade_medida / itemAtual.quantidade_total) * 100;
  const valor_total = quantidade_medida * itemAtual.valor_unitario;
  
  const { data, error } = await supabase
    .from('itens_medicao')
    .update({
      quantidade_medida,
      percentual_executado,
      valor_total,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar item de medição:', error);
    throw error;
  }
  
  // Atualiza o valor total da medição
  await atualizarValorTotalMedicao(itemAtual.medicao_id);
  
  // Atualiza o valor realizado no item de custo original
  await atualizarRealizadoItemCusto(itemAtual.item_negociacao_id);
  
  return data[0] as ItemMedicao;
}

/**
 * Atualiza um item de medição incluindo o valor unitário
 * Esta função deve ser usada apenas quando o usuário explicitamente quiser atualizar o valor unitário
 * Para atualizações normais (apenas quantidade), use updateItemMedicao
 */
export async function updateItemMedicaoComValorUnitario(
  id: number,
  quantidade_medida: number,
  valor_unitario: number
) {
  // Primeiro obtemos os dados atuais do item
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_medicao')
    .select('medicao_id, item_negociacao_id, quantidade_total')
    .eq('id', id)
    .single();
  
  if (errorItem || !itemAtual) {
    console.error('Erro ao buscar item de medição:', errorItem);
    throw errorItem;
  }
  
  // Calcular percentual e valor total com o novo valor unitário
  const percentual_executado = (quantidade_medida / itemAtual.quantidade_total) * 100;
  const valor_total = quantidade_medida * valor_unitario;
  
  const { data, error } = await supabase
    .from('itens_medicao')
    .update({
      quantidade_medida,
      percentual_executado,
      valor_unitario,
      valor_total,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar item de medição:', error);
    throw error;
  }
  
  // Atualiza o valor total da medição
  await atualizarValorTotalMedicao(itemAtual.medicao_id);
  
  // Atualiza o valor realizado no item de custo original
  await atualizarRealizadoItemCusto(itemAtual.item_negociacao_id);
  
  return data[0] as ItemMedicao;
}

export async function deleteItemMedicao(id: number) {
  // Primeiro obtemos o medicao_id para poder atualizar o total depois
  const { data: itemAtual, error: errorItem } = await supabase
    .from('itens_medicao')
    .select('medicao_id, item_negociacao_id')
    .eq('id', id)
    .single();
  
  if (errorItem || !itemAtual) {
    console.error('Erro ao buscar item de medição:', errorItem);
    throw errorItem;
  }
  
  const medicaoId = itemAtual.medicao_id;
  const itemNegociacaoId = itemAtual.item_negociacao_id;
  
  const { error } = await supabase
    .from('itens_medicao')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir item de medição:', error);
    throw error;
  }
  
  // Atualiza o valor total da medição
  await atualizarValorTotalMedicao(medicaoId);
  
  // Atualiza o valor realizado no item de custo original
  await atualizarRealizadoItemCusto(itemNegociacaoId);
  
  return true;
}

export async function atualizarValorTotalMedicao(medicaoId: number) {
  // Calcular a soma de todos os itens de medição
  const { data: itens, error: errorItens } = await supabase
    .from('itens_medicao')
    .select('valor_total')
    .eq('medicao_id', medicaoId);
  
  if (errorItens) {
    console.error('Erro ao buscar itens para cálculo do total:', errorItens);
    throw errorItens;
  }
  
  const valorTotal = itens.reduce((total, item) => total + item.valor_total, 0);
  
  // Atualizar o valor total da medição
  const { error: errorUpdate } = await supabase
    .from('medicoes')
    .update({ 
      valor_total: valorTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', medicaoId);
  
  if (errorUpdate) {
    console.error('Erro ao atualizar valor total da medição:', errorUpdate);
    throw errorUpdate;
  }
  
  return valorTotal;
}

/**
 * Atualiza o campo realizado de um item de custo com base nos itens medidos
 * Esta função é chamada sempre que um item de medição é criado, atualizado ou excluído
 * @param item_negociacao_id - ID do item de negociação que foi medido
 */
export async function atualizarRealizadoItemCusto(item_negociacao_id: number) {
  try {
    // 1. Buscar o item de negociação para obter o item_custo_id
    const { data: itemNegociacao, error: errorNegociacao } = await supabase
      .from('itens_negociacao')
      .select('item_custo_id, quantidade, valor_unitario')
      .eq('id', item_negociacao_id)
      .single();
    
    if (errorNegociacao || !itemNegociacao || !itemNegociacao.item_custo_id) {
      console.log('Item de negociação não encontrado ou não está vinculado a um item de custo');
      return null;
    }
    
    const item_custo_id = itemNegociacao.item_custo_id;
    
    // 2. Buscar TODOS os itens de negociação relacionados ao mesmo item_custo_id
    const { data: todosItensNegociacao, error: errorTodosItens } = await supabase
      .from('itens_negociacao')
      .select('id')
      .eq('item_custo_id', item_custo_id);
    
    if (errorTodosItens) {
      console.error('Erro ao buscar todos os itens de negociação:', errorTodosItens);
      return null;
    }
    
    const todosItensNegociacaoIds = todosItensNegociacao.map(item => item.id);
    
    // 3. Buscar todas as medições aprovadas
    const { data: medicoes, error: errorMedicoes } = await supabase
      .from('medicoes')
      .select('id, status')
      .eq('status', 'Aprovado');
    
    if (errorMedicoes) {
      console.error('Erro ao buscar medições:', errorMedicoes);
      return null;
    }
    
    // Obter IDs das medições aprovadas
    const medicoesAprovadasIds = medicoes.map(m => m.id);
    
    // 4. Buscar TODOS os itens de medição de TODOS os itens de negociação relacionados ao item_custo_id
    const { data: itensMedicao, error: errorItens } = await supabase
      .from('itens_medicao')
      .select('quantidade_medida, valor_total, item_negociacao_id')
      .in('item_negociacao_id', todosItensNegociacaoIds.length > 0 ? todosItensNegociacaoIds : [0])
      .in('medicao_id', medicoesAprovadasIds.length > 0 ? medicoesAprovadasIds : [0]);
    
    if (errorItens) {
      console.error('Erro ao buscar itens de medição:', errorItens);
      return null;
    }
    
    // Calcular o total medido (quantidade)
    const totalMedido = itensMedicao.reduce((total, item) => total + item.quantidade_medida, 0);
    
    // Calcular o valor monetário total realizado de TODAS as medições aprovadas
    const valorMonetarioRealizado = itensMedicao.reduce((total, item) => total + (item.valor_total || 0), 0);
    
    // 5. Buscar o item de custo para atualizar
    const { data: itemCusto, error: errorItemCusto } = await supabase
      .from('itens_custo')
      .select('quantidade, total, grupo_id')
      .eq('id', item_custo_id)
      .single();
    
    if (errorItemCusto || !itemCusto) {
      console.error('Erro ao buscar item de custo:', errorItemCusto);
      return null;
    }
    
    // 6. Calcular o percentual realizado com base no valor monetário
    const percentualRealizado = calcularPercentualRealizado(valorMonetarioRealizado, itemCusto.total);
    
    // 7. Atualizar o item de custo com os valores realizados
    const { data, error } = await supabase
      .from('itens_custo')
      .update({
        realizado: valorMonetarioRealizado, // Usar o valor monetário total de todas as medições
        realizado_percentual: percentualRealizado,
        updated_at: new Date().toISOString()
      })
      .eq('id', item_custo_id)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar realizado do item de custo:', error);
      return null;
    }
    
    // 8. Atualizar os totais do grupo e centro de custo
    await updateGrupoTotais(itemCusto.grupo_id);
    
    return data && data[0];
    
  } catch (error) {
    console.error('Erro ao atualizar realizado do item de custo:', error);
    return null;
  }
}

/**
 * Recalcula o valor realizado de um item de custo específico
 * Considera tanto pedidos de compra aprovados quanto medições aprovadas
 * @param item_custo_id - ID do item de custo para recalcular
 */
export async function recalcularRealizadoItemCusto(item_custo_id: number) {
  try {
    // 1. Calcular valor total de pedidos de compra aprovados
    const { data: pedidosData, error: errorPedidos } = await supabase
      .from('itens_pedido_compra')
      .select(`
        valor_total,
        pedidos_compra!inner(status)
      `)
      .eq('item_custo_id', item_custo_id)
      .eq('pedidos_compra.status', 'Aprovado');
    
    if (errorPedidos) {
      console.error('Erro ao buscar pedidos de compra:', errorPedidos);
      return null;
    }
    
    const valorPedidosAprovados = pedidosData?.reduce((total, item) => total + (item.valor_total || 0), 0) || 0;
    
    // 2. Buscar TODOS os itens de negociação relacionados ao item_custo_id
    const { data: todosItensNegociacao, error: errorTodosItens } = await supabase
      .from('itens_negociacao')
      .select('id')
      .eq('item_custo_id', item_custo_id);
    
    if (errorTodosItens) {
      console.error('Erro ao buscar todos os itens de negociação:', errorTodosItens);
      return null;
    }
    
    const todosItensNegociacaoIds = todosItensNegociacao.map(item => item.id);
    
    // 3. Calcular valor total de medições aprovadas
    let valorMedicoesAprovadas = 0;
    if (todosItensNegociacaoIds.length > 0) {
      const { data: itensMedicao, error: errorItens } = await supabase
        .from('itens_medicao')
        .select(`
          valor_total,
          medicoes!inner(status)
        `)
        .in('item_negociacao_id', todosItensNegociacaoIds)
        .eq('medicoes.status', 'Aprovado');
      
      if (errorItens) {
        console.error('Erro ao buscar itens de medição:', errorItens);
        return null;
      }
      
      valorMedicoesAprovadas = itensMedicao?.reduce((total, item) => total + (item.valor_total || 0), 0) || 0;
    }
    
    // 4. Calcular valor total realizado (pedidos + medições)
    const valorTotalRealizado = valorPedidosAprovados + valorMedicoesAprovadas;
    
    // 5. Buscar o item de custo para atualizar
    const { data: itemCusto, error: errorItemCusto } = await supabase
      .from('itens_custo')
      .select('quantidade, total, grupo_id, codigo, descricao')
      .eq('id', item_custo_id)
      .single();
    
    if (errorItemCusto || !itemCusto) {
      console.error('Erro ao buscar item de custo:', errorItemCusto);
      return null;
    }
    
    // 6. Calcular o percentual realizado com base no valor monetário
    const percentualRealizado = calcularPercentualRealizado(valorTotalRealizado, itemCusto.total);
    
    // 7. Atualizar o item de custo com os valores realizados
    const { data, error } = await supabase
      .from('itens_custo')
      .update({
        realizado: valorTotalRealizado,
        realizado_percentual: percentualRealizado,
        updated_at: new Date().toISOString()
      })
      .eq('id', item_custo_id)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar realizado do item de custo:', error);
      return null;
    }
    
    // 8. Atualizar os totais do grupo e centro de custo
    await updateGrupoTotais(itemCusto.grupo_id);
    
    console.log(`Item ${itemCusto.codigo} - ${itemCusto.descricao}: Pedidos: R$ ${valorPedidosAprovados.toFixed(2)}, Medições: R$ ${valorMedicoesAprovadas.toFixed(2)}, Total: R$ ${valorTotalRealizado.toFixed(2)}`);
    
    return {
      item: data && data[0],
      valorPedidos: valorPedidosAprovados,
      valorMedicoes: valorMedicoesAprovadas,
      valorTotal: valorTotalRealizado
    };
    
  } catch (error) {
    console.error('Erro ao recalcular realizado do item de custo:', error);
    return null;
  }
}

/**
 * Recalcula todos os valores realizados do sistema com segurança
 * Executa em lotes para evitar sobrecarga do banco
 */
export async function recalcularTodosValoresRealizados() {
  try {
    // 1. Buscar todos os itens de custo
    const { data: itens, error: errorItens } = await supabase
      .from('itens_custo')
      .select('id, codigo, descricao')
      .order('id');
    
    if (errorItens) {
      console.error('Erro ao buscar itens de custo:', errorItens);
      throw errorItens;
    }
    
    if (!itens || itens.length === 0) {
      console.log('Nenhum item de custo encontrado');
      return { sucesso: true, processados: 0, erros: [] };
    }
    
    console.log(`Iniciando recálculo de ${itens.length} itens...`);
    
    const resultados = {
      sucesso: true,
      processados: 0,
      erros: [] as Array<{item: string, erro: string}>
    };
    
    // 2. Processar em lotes de 10 itens para não sobrecarregar o banco
    const tamanhoBatch = 10;
    
    for (let i = 0; i < itens.length; i += tamanhoBatch) {
      const batch = itens.slice(i, i + tamanhoBatch);
      console.log(`Processando lote ${Math.floor(i/tamanhoBatch) + 1}/${Math.ceil(itens.length/tamanhoBatch)}...`);
      
      // Processar itens do lote em paralelo
      const promessasBatch = batch.map(async (item) => {
        try {
          const resultado = await recalcularRealizadoItemCusto(item.id);
          if (resultado) {
            resultados.processados++;
            return { sucesso: true, item };
          } else {
            resultados.erros.push({
              item: `${item.codigo} - ${item.descricao}`,
              erro: 'Retorno nulo da função de recálculo'
            });
            return { sucesso: false, item };
          }
        } catch (error) {
          resultados.erros.push({
            item: `${item.codigo} - ${item.descricao}`,
            erro: error instanceof Error ? error.message : 'Erro desconhecido'
          });
          return { sucesso: false, item };
        }
      });
      
      await Promise.all(promessasBatch);
      
      // Pequena pausa entre lotes para não sobrecarregar
      if (i + tamanhoBatch < itens.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Recálculo concluído. Processados: ${resultados.processados}/${itens.length}, Erros: ${resultados.erros.length}`);
    
    if (resultados.erros.length > 0) {
      console.error('Erros encontrados:', resultados.erros);
      resultados.sucesso = false;
    }
    
    return resultados;
    
  } catch (error) {
    console.error('Erro ao recalcular todos os valores realizados:', error);
    throw error;
  }
}

// Funções para Pedidos de Compra

export async function fetchPedidosCompra(obraId?: number) {
  let query = supabase
    .from('pedidos_compra')
    .select(`
      *,
      fornecedor:fornecedor_id(*)
    `);
  
  if (obraId) {
    query = query.eq('obra_id', obraId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar pedidos de compra:', error);
    return [];
  }
  
  // Agrupar pedidos por fornecedor_id e atribuir número de ordem por fornecedor
  const fornecedoresMap = new Map<number, any[]>();
  
  // Primeiro passo: agrupar pedidos por fornecedor
  data.forEach(pedido => {
    if (!fornecedoresMap.has(pedido.fornecedor_id)) {
      fornecedoresMap.set(pedido.fornecedor_id, []);
    }
    fornecedoresMap.get(pedido.fornecedor_id)!.push(pedido);
  });
  
  // Segundo passo: atribuir números de ordem por fornecedor
  const pedidosComOrdem: any[] = [];
  
  fornecedoresMap.forEach(pedidos => {
    // Ordenar os pedidos de cada fornecedor por data de criação (do mais antigo para o mais recente)
    const pedidosOrdenados = [...pedidos].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Atribuir número de ordem dentro do contexto do fornecedor
    pedidosOrdenados.forEach((pedido, index) => {
      pedidosComOrdem.push({
        ...pedido,
        numero_ordem: index + 1
      });
    });
  });
  
  // Manter a ordenação original (created_at decrescente)
  return pedidosComOrdem.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) as PedidoCompra[];
}

export async function fetchPedidoCompraById(id: number) {
  const { data, error } = await supabase
    .from('pedidos_compra')
    .select(`
      *,
      fornecedor:fornecedor_id(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Erro ao buscar pedido de compra:', error);
    return null;
  }
  
  // Calcular o número de ordem para este pedido específico
  // Buscar todos os pedidos do mesmo fornecedor para calcular a ordem
  const { data: pedidosFornecedor, error: errorPedidos } = await supabase
    .from('pedidos_compra')
    .select('id, created_at')
    .eq('fornecedor_id', data.fornecedor_id)
    .order('created_at', { ascending: true });
  
  if (!errorPedidos && pedidosFornecedor) {
    const indice = pedidosFornecedor.findIndex(p => p.id === id);
    data.numero_ordem = indice + 1;
  }
  
  return data as PedidoCompra;
}

export async function insertPedidoCompra(
  fornecedor_id: number,
  data_compra: string,
  observacoes?: string
) {
  // Inserir o novo pedido
  const { data, error } = await supabase
    .from('pedidos_compra')
    .insert([
      { 
        fornecedor_id,
        data_compra,
        valor_total: 0,
        status: 'Pendente',
        observacoes: observacoes || null
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir pedido de compra:', error);
    throw error;
  }
  
  return data[0] as PedidoCompra;
}

export async function updatePedidoCompra(
  id: number,
  fornecedor_id: number,
  data_compra: string,
  status?: string,
  observacoes?: string
) {
  const updates: any = {
    fornecedor_id,
    data_compra,
    updated_at: new Date().toISOString()
  };
  
  if (status) {
    updates.status = status;
  }
  
  if (observacoes !== undefined) {
    updates.observacoes = observacoes;
  }
  
  const { data, error } = await supabase
    .from('pedidos_compra')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar pedido de compra:', error);
    throw error;
  }
  
  return data[0] as PedidoCompra;
}

export async function deletePedidoCompra(id: number) {
  try {
    console.log('🗑️ Iniciando exclusão do pedido de compra:', id);
    
    // Buscar dados do pedido e itens em paralelo
    const [pedidoResult, itensResult] = await Promise.all([
      supabase
        .from('pedidos_compra')
        .select('status')
        .eq('id', id)
        .single(),
      supabase
        .from('itens_pedido_compra')
        .select('*, item_custo:item_custo_id(*)')
        .eq('pedido_compra_id', id)
    ]);
    
    if (pedidoResult.error) {
      console.error('Erro ao buscar pedido de compra:', pedidoResult.error);
      throw pedidoResult.error;
    }
    
    if (itensResult.error) {
      console.error('Erro ao buscar itens do pedido de compra:', itensResult.error);
      throw itensResult.error;
    }
    
    const pedido = pedidoResult.data;
    const itens = itensResult.data || [];
    
    console.log('📦 Pedido encontrado, status:', pedido.status, '- Itens:', itens.length);
    
    // Preparar operações em paralelo
    const operacoes = [];
    const gruposAfetados = new Set<number>();
    
    // Se o pedido estiver aprovado, preparar estorno dos valores
    if (pedido.status === 'Aprovado') {
      console.log('💰 Preparando estorno de valores...');
      
      for (const item of itens) {
        if (item.item_custo_id && item.item_custo) {
          const itemCusto = item.item_custo;
          const novoRealizado = Math.max(0, itemCusto.realizado - item.valor_total);
          const novoRealizadoPercentual = itemCusto.total > 0 
            ? (novoRealizado / itemCusto.total) * 100 
            : 0;
          
          // Adicionar grupo afetado para atualização posterior
          if (itemCusto.grupo_id) {
            gruposAfetados.add(itemCusto.grupo_id);
          }
          
          operacoes.push(
            supabase
              .from('itens_custo')
              .update({ 
                realizado: novoRealizado,
                realizado_percentual: novoRealizadoPercentual,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.item_custo_id)
          );
        }
      }
    }
    
    // Adicionar exclusão de itens e pedido
    operacoes.push(
      supabase
        .from('itens_pedido_compra')
        .delete()
        .eq('pedido_compra_id', id)
    );
    
    operacoes.push(
      supabase
        .from('pedidos_compra')
        .delete()
        .eq('id', id)
    );
    
    console.log('⚡ Executando', operacoes.length, 'operações em paralelo...');
    
    // Executar todas as operações em paralelo
    const resultados = await Promise.all(operacoes);
    
    // Verificar se houve algum erro
    for (let i = 0; i < resultados.length; i++) {
      const { error } = resultados[i];
      if (error) {
        console.error(`Erro na operação ${i + 1}:`, error);
        throw error;
      }
    }
    
    console.log('✅ Exclusão concluída com sucesso');
    
    // Atualizar totais apenas dos grupos afetados em background
    if (gruposAfetados.size > 0) {
      console.log('🔄 Atualizando totais de', gruposAfetados.size, 'grupos afetados em background...');
      
      const atualizacaesTotais = Array.from(gruposAfetados).map(grupoId => 
        updateGrupoTotais(grupoId).catch(error => {
          console.error('Erro ao atualizar grupo em background:', error);
        })
      );
      
      // Executar em background sem bloquear o retorno
      Promise.all(atualizacaesTotais).catch(error => {
        console.error('Erro ao atualizar totais em background:', error);
      });
    }
    
    console.log('🎉 Exclusão do pedido de compra concluída!');
    return true;
    
  } catch (error) {
    console.error('💥 Erro durante exclusão do pedido de compra:', error);
    throw error;
  }
}

export async function fetchItensPedidoCompra(pedidoCompraId: number) {
  const { data, error } = await supabase
    .from('itens_pedido_compra')
    .select(`
      *,
      item_custo:item_custo_id(codigo)
    `)
    .eq('pedido_compra_id', pedidoCompraId)
    .order('id');
  
  if (error) {
    console.error('Erro ao buscar itens do pedido de compra:', error);
    return [];
  }
  
  return data as ItemPedidoCompra[];
}

export async function fetchItensCustoDisponiveisParaCompra() {
  const { data, error } = await supabase
    .from('itens_custo')
    .select('*')
    .order('codigo');
  
  if (error) {
    console.error('Erro ao buscar itens de custo disponíveis:', error);
    return [];
  }
  
  return data as ItemCusto[];
}

export async function insertItemPedidoCompra(
  pedido_compra_id: number,
  item_custo_id: number,
  descricao: string,
  unidade: string,
  quantidade: number,
  valor_unitario: number
) {
  const valor_total = quantidade * valor_unitario;
  
  const { data, error } = await supabase
    .from('itens_pedido_compra')
    .insert([
      { 
        pedido_compra_id,
        item_custo_id,
        descricao,
        unidade,
        quantidade,
        valor_unitario,
        valor_total
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir item do pedido de compra:', error);
    throw error;
  }
  
  // Atualizar o valor total do pedido de compra
  await atualizarValorTotalPedidoCompra(pedido_compra_id);
  
  return data[0] as ItemPedidoCompra;
}

export async function updateItemPedidoCompra(
  id: number,
  descricao: string,
  unidade: string,
  quantidade: number,
  valor_unitario: number
) {
  const valor_total = quantidade * valor_unitario;
  
  const { data, error } = await supabase
    .from('itens_pedido_compra')
    .update({
      descricao,
      unidade,
      quantidade,
      valor_unitario,
      valor_total,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar item do pedido de compra:', error);
    throw error;
  }
  
  // Buscar o pedido_compra_id para atualizar o valor total
  const pedido_compra_id = data[0].pedido_compra_id;
  
  // Atualizar o valor total do pedido de compra
  await atualizarValorTotalPedidoCompra(pedido_compra_id);
  
  return data[0] as ItemPedidoCompra;
}

export async function deleteItemPedidoCompra(id: number) {
  try {
    console.log('🗑️ Iniciando exclusão de item do pedido de compra:', id);
    
    // Primeiro buscar o item para obter o pedido_compra_id e item_custo_id
    const { data: item, error: errorBusca } = await supabase
      .from('itens_pedido_compra')
      .select('pedido_compra_id, item_custo_id, valor_total')
      .eq('id', id)
      .single();
    
    if (errorBusca) {
      console.error('Erro ao buscar item do pedido de compra:', errorBusca);
      throw errorBusca;
    }
    
    const pedido_compra_id = item.pedido_compra_id;
    const item_custo_id = item.item_custo_id;
    const valor_total = item.valor_total;
    
    // Verificar se o pedido está aprovado para fazer estorno
    const { data: pedido, error: errorPedido } = await supabase
      .from('pedidos_compra')
      .select('status')
      .eq('id', pedido_compra_id)
      .single();
    
    if (errorPedido) {
      console.error('Erro ao buscar status do pedido:', errorPedido);
      throw errorPedido;
    }
    
    // Preparar operações em paralelo
    const operacoes = [];
    
    // Se o pedido estiver aprovado, preparar estorno dos valores
    if (pedido.status === 'Aprovado' && item_custo_id) {
      console.log('💰 Preparando estorno de valores para item aprovado...');
      
      // Buscar o item de custo atual para calcular o novo valor realizado
      const { data: itemCusto, error: errorItemCusto } = await supabase
        .from('itens_custo')
        .select('realizado, total, grupo_id')
        .eq('id', item_custo_id)
        .single();
      
      if (errorItemCusto) {
        console.error('Erro ao buscar item de custo para estorno:', errorItemCusto);
        throw errorItemCusto;
      }
      
      // Calcular novo valor realizado (estornar o valor do item excluído)
      const novoRealizado = Math.max(0, itemCusto.realizado - valor_total);
      const novoRealizadoPercentual = itemCusto.total > 0 
        ? (novoRealizado / itemCusto.total) * 100 
        : 0;
      
      console.log(`🔄 Estornando R$ ${valor_total.toFixed(2)} do item de custo ${item_custo_id}`);
      console.log(`💰 Valor realizado anterior: R$ ${itemCusto.realizado.toFixed(2)}`);
      console.log(`💰 Novo valor realizado: R$ ${novoRealizado.toFixed(2)}`);
      
      // Adicionar atualização do item de custo
      operacoes.push(
        supabase
          .from('itens_custo')
          .update({ 
            realizado: novoRealizado,
            realizado_percentual: novoRealizadoPercentual,
            updated_at: new Date().toISOString()
          })
          .eq('id', item_custo_id)
      );
    }
    
    // Excluir o item do pedido
    operacoes.push(
      supabase
        .from('itens_pedido_compra')
        .delete()
        .eq('id', id)
    );
    
    console.log('⚡ Executando', operacoes.length, 'operações em paralelo...');
    
    // Executar todas as operações em paralelo
    const resultados = await Promise.all(operacoes);
    
    // Verificar se houve algum erro
    for (let i = 0; i < resultados.length; i++) {
      const { error } = resultados[i];
      if (error) {
        console.error(`Erro na operação ${i + 1}:`, error);
        throw error;
      }
    }
    
    // Atualizar o valor total do pedido de compra
    await atualizarValorTotalPedidoCompra(pedido_compra_id);
    
    // Se houve estorno, atualizar totais do grupo em background
    if (pedido.status === 'Aprovado' && item_custo_id) {
      console.log('🔄 Atualizando totais do grupo em background...');
      
      // Buscar o grupo_id do item de custo para atualizar totais
      const { data: itemCusto, error: errorItemCusto } = await supabase
        .from('itens_custo')
        .select('grupo_id')
        .eq('id', item_custo_id)
        .single();
      
      if (!errorItemCusto && itemCusto?.grupo_id) {
        // Executar em background sem bloquear o retorno
        updateGrupoTotais(itemCusto.grupo_id).catch(error => {
          console.error('Erro ao atualizar totais do grupo em background:', error);
        });
      }
    }
    
    console.log('✅ Exclusão do item concluída com sucesso');
    return true;
    
  } catch (error) {
    console.error('💥 Erro durante exclusão do item:', error);
    throw error;
  }
}

export async function atualizarValorTotalPedidoCompra(pedidoCompraId: number) {
  // Calcular o valor total somando todos os itens
  const { data: itens, error: errorItens } = await supabase
    .from('itens_pedido_compra')
    .select('valor_total')
    .eq('pedido_compra_id', pedidoCompraId);
  
  if (errorItens) {
    console.error('Erro ao buscar itens para cálculo do valor total:', errorItens);
    throw errorItens;
  }
  
  const valorTotal = itens.reduce((acc, item) => acc + item.valor_total, 0);
  
  // Atualizar o valor total do pedido de compra
  const { error } = await supabase
    .from('pedidos_compra')
    .update({ 
      valor_total: valorTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', pedidoCompraId);
  
  if (error) {
    console.error('Erro ao atualizar valor total do pedido de compra:', error);
    throw error;
  }
  
  return valorTotal;
}

/**
 * Calcula o valor total de um pedido de compra somando todos os seus itens
 * @param pedidoCompraId - ID do pedido de compra
 * @returns Valor total calculado
 */
export async function calcularValorTotalPedidoCompra(pedidoCompraId: number): Promise<number> {
  try {
    // Buscar todos os itens do pedido de compra
    const { data: itens, error } = await supabase
      .from('itens_pedido_compra')
      .select('valor_total')
      .eq('pedido_compra_id', pedidoCompraId);
    
    if (error) {
      console.error('Erro ao buscar itens para cálculo do valor total:', error);
      throw error;
    }
    
    if (!itens || itens.length === 0) {
      return 0;
    }
    
    // Somar todos os valores dos itens
    const valorTotal = itens.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    
    return valorTotal;
  } catch (error) {
    console.error('Erro ao calcular valor total do pedido de compra:', error);
    throw error;
  }
}

export async function aprovarPedidoCompra(id: number) {
  try {
    console.log('🚀 Iniciando aprovação do pedido:', id);
    
    // Buscar os itens do pedido de compra em uma única query
    const { data: itens, error: errorItens } = await supabase
      .from('itens_pedido_compra')
      .select('*, item_custo:item_custo_id(*)')
      .eq('pedido_compra_id', id);
    
    if (errorItens) {
      console.error('Erro ao buscar itens do pedido de compra:', errorItens);
      throw errorItens;
    }
    
    console.log('📦 Itens encontrados:', itens.length);
    
    // Preparar todas as atualizações em paralelo
    const atualizacoes = [];
    
    // 1. Preparar atualizações dos itens de custo
    for (const item of itens) {
      if (item.item_custo_id && item.item_custo) {
        const itemCusto = item.item_custo;
        const novoRealizado = itemCusto.realizado + item.valor_total;
        const novoRealizadoPercentual = calcularPercentualRealizado(novoRealizado, itemCusto.total);
        
        atualizacoes.push(
          supabase
            .from('itens_custo')
            .update({ 
              realizado: novoRealizado,
              realizado_percentual: novoRealizadoPercentual,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.item_custo_id)
        );
      }
    }
    
    // 2. Adicionar atualização do status do pedido
    atualizacoes.push(
      supabase
        .from('pedidos_compra')
        .update({ 
          status: 'Aprovado',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    );
    
    console.log('⚡ Executando', atualizacoes.length, 'atualizações em paralelo...');
    
    // Executar todas as atualizações em paralelo
    const resultados = await Promise.all(atualizacoes);
    
    // Verificar se houve algum erro
    for (let i = 0; i < resultados.length; i++) {
      const { error } = resultados[i];
      if (error) {
        console.error(`Erro na atualização ${i + 1}:`, error);
        throw error;
      }
    }
    
    console.log('✅ Todas as atualizações concluídas com sucesso');
    
    // Atualizar totais apenas dos grupos afetados (mais eficiente que atualizarTodosTotais)
    const gruposAfetados = new Set();
    for (const item of itens) {
      if (item.item_custo && item.item_custo.grupo_id) {
        gruposAfetados.add(item.item_custo.grupo_id);
      }
    }
    
    console.log('🔄 Atualizando totais de', gruposAfetados.size, 'grupos afetados...');
    
    // Atualizar totais apenas dos grupos afetados em paralelo
    const atualizacaesTotais = Array.from(gruposAfetados).map(grupoId => 
      updateGrupoTotais(grupoId as number)
    );
    
    await Promise.all(atualizacaesTotais);
    
    console.log('🎉 Aprovação concluída com sucesso!');
    return true;
    
  } catch (error) {
    console.error('💥 Erro durante aprovação do pedido:', error);
    throw error;
  }
}

// Função utilitária para calcular percentual realizado de forma consistente
export function calcularPercentualRealizado(realizado: number, total: number): number {
  if (total <= 0) return 0;
  return (realizado / total) * 100;
}

// Função para validar e corrigir percentuais realizados inconsistentes
export async function validarECorrigirPercentuaisRealizados() {
  try {
    console.log('🔍 Iniciando validação de percentuais realizados...');
    
    // Atualizar todos os percentuais que possam estar inconsistentes
    const { data, error } = await supabase
      .from('itens_custo')
      .select('id, realizado, total, realizado_percentual')
      .gt('realizado', 0)
      .gt('total', 0);
    
    if (error) {
      console.error('Erro ao buscar itens de custo:', error);
      return false;
    }
    
    let itensCorrigidos = 0;
    const atualizacoes = [];
    
    for (const item of data) {
      const percentualCorreto = calcularPercentualRealizado(item.realizado, item.total);
      const diferenca = Math.abs(percentualCorreto - item.realizado_percentual);
      
      if (diferenca > 0.1) { // Se a diferença for maior que 0.1%
        atualizacoes.push(
          supabase
            .from('itens_custo')
            .update({
              realizado_percentual: percentualCorreto,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
        );
        itensCorrigidos++;
      }
    }
    
    if (atualizacoes.length > 0) {
      console.log(`⚡ Corrigindo ${atualizacoes.length} itens com percentuais inconsistentes...`);
      const resultados = await Promise.all(atualizacoes);
      
      // Verificar se houve algum erro
      for (const { error } of resultados) {
        if (error) {
          console.error('Erro ao corrigir percentual:', error);
          return false;
        }
      }
      
      console.log(`✅ ${itensCorrigidos} percentuais corrigidos com sucesso!`);
    } else {
      console.log('✅ Todos os percentuais estão corretos!');
    }
    
    return true;
  } catch (error) {
    console.error('💥 Erro ao validar percentuais realizados:', error);
    return false;
  }
}

// Tipos para Obras
export type Obra = {
  id: number;
  nome: string;
  endereco: string | null;
  responsavel_tecnico: string | null;
  crea: string | null;
  data_inicio: string | null;
  data_prevista_fim: string | null;
  area_construida: number | null;
  orcamento_total: number | null;
  status: string | null;
  observacoes: string | null;
  usuario_id: string | null;
  cliente: string | null;
  empresa_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

// Funções para gerenciar obras
export const fetchObras = async (): Promise<Obra[]> => {
  try {
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar obras:', error);
    return [];
  }
};

// Funções para gerenciar parcelas de pedidos de compra
export async function fetchParcelasPedidoCompraByPedido(pedido_compra_id: number) {
  const { data, error } = await supabase
    .from('parcelas_pedido_compra')
    .select('*')
    .eq('pedido_compra_id', pedido_compra_id)
    .order('data_prevista');
  
  if (error) {
    console.error('Erro ao buscar parcelas do pedido de compra:', error);
    return [];
  }
  
  return data as ParcelaPedidoCompra[];
}

export async function insertParcelaPedidoCompra(
  pedido_compra_id: number,
  data_prevista: string,
  valor: number,
  descricao?: string
) {
  const { data, error } = await supabase
    .from('parcelas_pedido_compra')
    .insert([
      { 
        pedido_compra_id,
        data_prevista,
        valor,
        descricao,
        status: 'Pendente'
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir parcela do pedido de compra:', error);
    throw error;
  }
  
  return data[0] as ParcelaPedidoCompra;
}

export async function updateParcelaPedidoCompra(
  id: number,
  data_prevista: string,
  valor: number,
  descricao?: string,
  status?: string
) {
  const { data, error } = await supabase
    .from('parcelas_pedido_compra')
    .update({ 
      data_prevista,
      valor,
      descricao,
      status,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar parcela do pedido de compra:', error);
    throw error;
  }
  
  return data[0] as ParcelaPedidoCompra;
}

export async function deleteParcelaPedidoCompra(id: number) {
  const { error } = await supabase
    .from('parcelas_pedido_compra')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir parcela do pedido de compra:', error);
    throw error;
  }
  
  return true;
}

// Funções para gerenciar parcelas de medições
export async function fetchParcelasMedicaoByMedicao(medicao_id: number) {
  const { data, error } = await supabase
    .from('parcelas_medicao')
    .select('*')
    .eq('medicao_id', medicao_id)
    .order('data_prevista');
  
  if (error) {
    console.error('Erro ao buscar parcelas da medição:', error);
    return [];
  }
  
  return data as ParcelaMedicao[];
}

export async function insertParcelaMedicao(
  medicao_id: number,
  data_prevista: string,
  valor: number,
  descricao?: string
) {
  const { data, error } = await supabase
    .from('parcelas_medicao')
    .insert([
      { 
        medicao_id,
        data_prevista,
        valor,
        descricao,
        status: 'Pendente'
      }
    ])
    .select();
  
  if (error) {
    console.error('Erro ao inserir parcela da medição:', error);
    throw error;
  }
  
  return data[0] as ParcelaMedicao;
}

export async function updateParcelaMedicao(
  id: number,
  data_prevista: string,
  valor: number,
  descricao?: string,
  status?: string
) {
  const { data, error } = await supabase
    .from('parcelas_medicao')
    .update({ 
      data_prevista,
      valor,
      descricao,
      status,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erro ao atualizar parcela da medição:', error);
    throw error;
  }
  
  return data[0] as ParcelaMedicao;
}

export async function deleteParcelaMedicao(id: number) {
  const { error } = await supabase
    .from('parcelas_medicao')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao excluir parcela da medição:', error);
    throw error;
  }
  
  return true;
}

/**
 * Sistema de validação automática para manter dados sempre consistentes
 * Esta função é executada automaticamente em background para detectar e corrigir inconsistências
 */
export async function validacaoAutomaticaEmBackground() {
  try {
    console.log('🔍 Iniciando validação automática em background...');
    
    // Executar em background sem bloquear o sistema
    setInterval(async () => {
      try {
        await executarValidacaoAutomatica();
      } catch (error) {
        console.error('💥 Erro durante validação automática:', error);
      }
    }, 5 * 60 * 1000); // Executar a cada 5 minutos
    
    console.log('✅ Sistema de validação automática ativado');
    
  } catch (error) {
    console.error('💥 Erro ao ativar validação automática:', error);
  }
}

/**
 * Executa a validação automática dos dados
 */
async function executarValidacaoAutomatica() {
  try {
    console.log('🧹 Executando validação automática...');
    
    // 1. Validar itens de custo
    const resultadoItens = await validarItensCustoAutomaticamente();
    
    // 2. Validar pedidos de compra
    const resultadoPedidos = await validarPedidosCompraAutomaticamente();
    
    // 3. Validar medições
    const resultadoMedicoes = await validarMedicoesAutomaticamente();
    
    // 4. Se houver correções, atualizar totais
    if (resultadoItens.corrigidos > 0 || resultadoPedidos.corrigidos > 0 || resultadoMedicoes.corrigidos > 0) {
      console.log('🔄 Atualizando totais após correções automáticas...');
      await atualizarTodosTotais();
    }
    
    const totalCorrigidos = resultadoItens.corrigidos + resultadoPedidos.corrigidos + resultadoMedicoes.corrigidos;
    
    if (totalCorrigidos > 0) {
      console.log(`✅ Validação automática concluída: ${totalCorrigidos} correções aplicadas`);
    } else {
      console.log('✅ Validação automática: nenhuma inconsistência encontrada');
    }
    
  } catch (error) {
    console.error('💥 Erro durante validação automática:', error);
  }
}

/**
 * Valida automaticamente os itens de custo
 */
async function validarItensCustoAutomaticamente() {
  try {
    console.log('🔍 Validando itens de custo automaticamente...');
    
    // Buscar todos os itens de custo
    const { data: itens, error } = await supabase
      .from('itens_custo')
      .select('id, codigo, descricao, realizado, realizado_percentual, total, grupo_id')
      .not('realizado', 'is', null);
    
    if (error || !itens) {
      console.error('Erro ao buscar itens para validação:', error);
      return { corrigidos: 0, total: 0 };
    }
    
    let corrigidos = 0;
    const operacoes = [];
    
    for (const item of itens) {
      // Calcular valor realizado real
      const valorRealizadoReal = await calcularValorRealizadoReal(item.id);
      
      // Verificar se há inconsistência
      if (Math.abs(item.realizado - valorRealizadoReal) > 0.01) {
        console.log(`⚠️ Inconsistência detectada no item ${item.codigo}:`);
        console.log(`   💰 Valor atual: R$ ${item.realizado.toFixed(2)}`);
        console.log(`   💰 Valor real: R$ ${valorRealizadoReal.toFixed(2)}`);
        
        const percentualRealizadoReal = item.total > 0 ? (valorRealizadoReal / item.total) * 100 : 0;
        
        // Preparar correção automática
        operacoes.push(
          supabase
            .from('itens_custo')
            .update({
              realizado: valorRealizadoReal,
              realizado_percentual: percentualRealizadoReal,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
        );
        
        corrigidos++;
      }
    }
    
    // Executar correções em paralelo
    if (operacoes.length > 0) {
      console.log(`⚡ Aplicando ${operacoes.length} correções automáticas...`);
      await Promise.all(operacoes);
    }
    
    return { corrigidos, total: itens.length };
    
  } catch (error) {
    console.error('💥 Erro durante validação automática de itens:', error);
    return { corrigidos: 0, total: 0 };
  }
}

/**
 * Valida automaticamente os pedidos de compra
 */
async function validarPedidosCompraAutomaticamente() {
  try {
    console.log('🔍 Validando pedidos de compra automaticamente...');
    
    // Buscar pedidos aprovados
    const { data: pedidos, error } = await supabase
      .from('pedidos_compra')
      .select('id, status, valor_total')
      .eq('status', 'Aprovado');
    
    if (error || !pedidos) {
      console.error('Erro ao buscar pedidos para validação:', error);
      return { corrigidos: 0, total: 0 };
    }
    
    let corrigidos = 0;
    
    for (const pedido of pedidos) {
      // Verificar se o valor total está correto
      const valorTotalReal = await calcularValorTotalPedidoCompra(pedido.id);
      
      if (Math.abs(pedido.valor_total - valorTotalReal) > 0.01) {
        console.log(`⚠️ Inconsistência detectada no pedido ${pedido.id}:`);
        console.log(`   💰 Valor atual: R$ ${pedido.valor_total.toFixed(2)}`);
        console.log(`   💰 Valor real: R$ ${valorTotalReal.toFixed(2)}`);
        
        // Corrigir automaticamente
        await supabase
          .from('pedidos_compra')
          .update({
            valor_total: valorTotalReal,
            updated_at: new Date().toISOString()
          })
          .eq('id', pedido.id);
        
        corrigidos++;
      }
    }
    
    return { corrigidos, total: pedidos.length };
    
  } catch (error) {
    console.error('💥 Erro durante validação automática de pedidos:', error);
    return { corrigidos: 0, total: 0 };
  }
}

/**
 * Valida automaticamente as medições
 */
async function validarMedicoesAutomaticamente() {
  try {
    console.log('🔍 Validando medições automaticamente...');
    
    // Buscar medições aprovadas
    const { data: medicoes, error } = await supabase
      .from('medicoes')
      .select('id, status, valor_total')
      .eq('status', 'Aprovado');
    
    if (error || !medicoes) {
      console.error('Erro ao buscar medições para validação:', error);
      return { corrigidos: 0, total: 0 };
    }
    
    let corrigidos = 0;
    
    for (const medicao of medicoes) {
      // Verificar se o valor total está correto
      const valorTotalReal = await atualizarValorTotalMedicao(medicao.id);
      
      if (Math.abs(medicao.valor_total - valorTotalReal) > 0.01) {
        console.log(`⚠️ Inconsistência detectada na medição ${medicao.id}:`);
        console.log(`   💰 Valor atual: R$ ${medicao.valor_total.toFixed(2)}`);
        console.log(`   💰 Valor real: R$ ${valorTotalReal.toFixed(2)}`);
        
        // Corrigir automaticamente
        await supabase
          .from('medicoes')
          .update({
            valor_total: valorTotalReal,
            updated_at: new Date().toISOString()
          })
          .eq('id', medicao.id);
        
        corrigidos++;
      }
    }
    
    return { corrigidos, total: medicoes.length };
    
  } catch (error) {
    console.error('💥 Erro durante validação automática de medições:', error);
    return { corrigidos: 0, total: 0 };
  }
}

/**
 * Calcula o valor realizado real de um item de custo
 */
async function calcularValorRealizadoReal(itemCustoId: number): Promise<number> {
  try {
    // 1. Pedidos de compra aprovados
    const { data: pedidosData, error: errorPedidos } = await supabase
      .from('itens_pedido_compra')
      .select(`
        valor_total,
        pedidos_compra!inner(status)
      `)
      .eq('item_custo_id', itemCustoId)
      .eq('pedidos_compra.status', 'Aprovado');
    
    const valorPedidosAprovados = pedidosData?.reduce((total, p) => total + (p.valor_total || 0), 0) || 0;
    
    // 2. Medições aprovadas
    const { data: negociacoesData, error: errorNegociacoes } = await supabase
      .from('itens_negociacao')
      .select('id')
      .eq('item_custo_id', itemCustoId);
    
    let valorMedicoesAprovadas = 0;
    
    if (!errorNegociacoes && negociacoesData && negociacoesData.length > 0) {
      const negociacaoIds = negociacoesData.map(n => n.id);
      
      const { data: medicoesData, error: errorMedicoes } = await supabase
        .from('itens_medicao')
        .select(`
          valor_total,
          medicoes!inner(status)
        `)
        .in('item_negociacao_id', negociacaoIds)
        .eq('medicoes.status', 'Aprovado');
      
      if (!errorMedicoes) {
        valorMedicoesAprovadas = medicoesData?.reduce((total, m) => total + (m.valor_total || 0), 0) || 0;
      }
    }
    
    return valorPedidosAprovados + valorMedicoesAprovadas;
    
  } catch (error) {
    console.error('Erro ao calcular valor realizado real:', error);
    return 0;
  }
}

/**
 * Função para ativar o sistema de validação automática
 * Deve ser chamada na inicialização da aplicação
 */
export function ativarSistemaValidacaoAutomatica() {
  console.log('🚀 Ativando sistema de validação automática...');
  
  // Executar validação imediata
  executarValidacaoAutomatica();
  
  // Ativar validação periódica
  validacaoAutomaticaEmBackground();
  
  console.log('✅ Sistema de validação automática ativado com sucesso!');
}

/**
 * Limpa inconsistências dos itens de custo
 * @param grupoId - ID do grupo específico (opcional)
 * @returns Resultado da limpeza { limpos: number, total: number }
 */
export async function limparInconsistenciasItensCusto(grupoId?: number): Promise<{ limpos: number, total: number }> {
  try {
    console.log('🧹 Iniciando limpeza de inconsistências dos itens de custo...');
    
    // Construir query com filtro opcional por grupo
    let query = supabase
      .from('itens_custo')
      .select('id, codigo, descricao, realizado, realizado_percentual, total, grupo_id')
      .not('realizado', 'is', null);
    
    if (grupoId) {
      query = query.eq('grupo_id', grupoId);
      console.log(`🎯 Focando no grupo ${grupoId}`);
    }
    
    const { data: itens, error } = await query;
    
    if (error || !itens) {
      console.error('Erro ao buscar itens para limpeza:', error);
      return { limpos: 0, total: 0 };
    }
    
    let limpos = 0;
    const operacoes = [];
    
    for (const item of itens) {
      // Calcular valor realizado real
      const valorRealizadoReal = await calcularValorRealizadoReal(item.id);
      
      // Verificar se há inconsistência (diferença maior que 1 centavo)
      if (Math.abs(item.realizado - valorRealizadoReal) > 0.01) {
        console.log(`🔧 Corrigindo item ${item.codigo}:`);
        console.log(`   💰 Valor atual: R$ ${item.realizado.toFixed(2)}`);
        console.log(`   💰 Valor real: R$ ${valorRealizadoReal.toFixed(2)}`);
        
        const percentualRealizadoReal = item.total > 0 ? (valorRealizadoReal / item.total) * 100 : 0;
        
        // Preparar correção
        operacoes.push(
          supabase
            .from('itens_custo')
            .update({
              realizado: valorRealizadoReal,
              realizado_percentual: percentualRealizadoReal,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
        );
        
        limpos++;
      }
    }
    
    // Executar correções em paralelo
    if (operacoes.length > 0) {
      console.log(`⚡ Aplicando ${operacoes.length} correções...`);
      const resultados = await Promise.allSettled(operacoes);
      
      const falhas = resultados.filter(r => r.status === 'rejected').length;
      if (falhas > 0) {
        console.warn(`⚠️ ${falhas} correções falharam`);
      }
      
      console.log(`✅ ${operacoes.length - falhas} itens corrigidos com sucesso!`);
    } else {
      console.log('👌 Nenhuma inconsistência encontrada!');
    }
    
    return { limpos, total: itens.length };
    
  } catch (error) {
    console.error('💥 Erro durante limpeza de inconsistências:', error);
    throw error;
  }
}

/**
 * Limpa inconsistência de um item específico
 * @param itemCustoId - ID do item de custo
 * @returns Resultado da limpeza { limpos: number, total: number }
 */
export async function limparInconsistenciaItemCusto(itemCustoId: number): Promise<{ limpos: number, total: number }> {
  try {
    console.log(`🧹 Limpando inconsistência do item ${itemCustoId}...`);
    
    // Buscar o item específico
    const { data: item, error } = await supabase
      .from('itens_custo')
      .select('id, codigo, descricao, realizado, realizado_percentual, total, grupo_id')
      .eq('id', itemCustoId)
      .single();
    
    if (error || !item) {
      console.error('Erro ao buscar item para limpeza:', error);
      return { limpos: 0, total: 0 };
    }
    
    // Calcular valor realizado real
    const valorRealizadoReal = await calcularValorRealizadoReal(item.id);
    
    // Verificar se há inconsistência
    if (Math.abs(item.realizado - valorRealizadoReal) > 0.01) {
      console.log(`🔧 Corrigindo item ${item.codigo}:`);
      console.log(`   💰 Valor atual: R$ ${item.realizado.toFixed(2)}`);
      console.log(`   💰 Valor real: R$ ${valorRealizadoReal.toFixed(2)}`);
      
      const percentualRealizadoReal = item.total > 0 ? (valorRealizadoReal / item.total) * 100 : 0;
      
      // Aplicar correção
      const { error: updateError } = await supabase
        .from('itens_custo')
        .update({
          realizado: valorRealizadoReal,
          realizado_percentual: percentualRealizadoReal,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      
      if (updateError) {
        console.error('Erro ao corrigir item:', updateError);
        throw updateError;
      }
      
      console.log(`✅ Item ${item.codigo} corrigido com sucesso!`);
      return { limpos: 1, total: 1 };
    } else {
      console.log(`👌 Item ${item.codigo} já está consistente!`);
      return { limpos: 0, total: 1 };
    }
    
  } catch (error) {
    console.error('💥 Erro durante limpeza do item:', error);
    throw error;
  }
}
  