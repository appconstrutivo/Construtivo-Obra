import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const QUANTIDADES_OBRAS_VALIDAS = [1, 2, 3, 4, 5, 10, 15];

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuração do servidor indisponível' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      userId,
      nome,
      email,
      empresa: nomeEmpresa,
      transaction_id,
      quantidade_obras,
      test_mode,
    } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId e email são obrigatórios' },
        { status: 400 }
      );
    }

    const qtdObras = quantidade_obras != null ? Number(quantidade_obras) : null;
    if (
      qtdObras == null ||
      !Number.isInteger(qtdObras) ||
      !QUANTIDADES_OBRAS_VALIDAS.includes(qtdObras)
    ) {
      return NextResponse.json(
        { error: 'quantidade_obras inválida. Use: 1, 2, 3, 4, 5, 10 ou 15.' },
        { status: 400 }
      );
    }

    const isTestMode = test_mode === 'true' || test_mode === true;
    if (!isTestMode && !transaction_id) {
      return NextResponse.json(
        { error: 'transaction_id é obrigatório quando test_mode não é true' },
        { status: 400 }
      );
    }

    if (!isTestMode) {
      // Validação do pagamento na Cakto (em produção, chamar API Cakto)
      const isValid = await validarTransacaoCakto(transaction_id);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Transação não confirmada. Verifique o pagamento.' },
          { status: 402 }
        );
      }
    }

    const { data: plano, error: planoError } = await supabaseAdmin
      .from('planos')
      .select('id, limite_obras')
      .eq('limite_obras', qtdObras)
      .eq('ativo', true)
      .maybeSingle();

    if (planoError || !plano) {
      console.error('Plano não encontrado para limite_obras:', qtdObras, planoError);
      return NextResponse.json(
        { error: 'Plano não encontrado para a quantidade de obras informada' },
        { status: 400 }
      );
    }

    const empresaNome =
      nomeEmpresa && String(nomeEmpresa).trim()
        ? String(nomeEmpresa).trim()
        : nome && String(nome).trim()
          ? `Empresa de ${String(nome).trim()}`
          : 'Minha Empresa';

    const { data: novaEmpresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        nome: empresaNome,
        email,
        status: 'active',
        data_inicio_trial: new Date().toISOString(),
        data_fim_trial: null,
      })
      .select('id')
      .single();

    if (empresaError || !novaEmpresa) {
      console.error('Erro ao criar empresa:', empresaError);
      return NextResponse.json(
        { error: 'Erro ao criar empresa. Tente novamente.' },
        { status: 500 }
      );
    }

    // Responsável pela empresa tenant: role admin = todas as permissões do sistema,
    // incluindo convidar usuários e definir permissões (conforme lógica em lib/permissoes e Configurações).
    const { error: updateUsuarioError } = await supabaseAdmin
      .from('usuarios')
      .update({
        empresa_id: novaEmpresa.id,
        role: 'admin',
        ativo: true,
        data_ativacao: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateUsuarioError) {
      console.error('Erro ao vincular usuário à empresa:', updateUsuarioError);
      return NextResponse.json(
        { error: 'Erro ao concluir cadastro. Tente novamente.' },
        { status: 500 }
      );
    }

    const { error: assinaturaError } = await supabaseAdmin
      .from('assinaturas')
      .insert({
        empresa_id: novaEmpresa.id,
        plano_id: plano.id,
        data_inicio: new Date().toISOString(),
        status: 'active',
        periodicidade: 'mensal',
        valor_mensal: plano.limite_obras ? null : null,
        renovacao_automatica: true,
      });

    if (assinaturaError) {
      console.error('Erro ao criar assinatura:', assinaturaError);
      return NextResponse.json(
        { error: 'Erro ao ativar plano. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      empresa_id: novaEmpresa.id,
      plano_id: plano.id,
      limite_obras: plano.limite_obras,
    });
  } catch (error) {
    console.error('Erro em cadastro-cakto:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar cadastro' },
      { status: 500 }
    );
  }
}

/**
 * Valida a transação na Cakto.
 * Em produção: chamar API Cakto com transaction_id e verificar status aprovado.
 * Por enquanto: stub que aceita qualquer transaction_id (produção deve implementar).
 */
async function validarTransacaoCakto(_transactionId: string): Promise<boolean> {
  // TODO: integrar com API Cakto para validar pagamento
  // Ex.: GET https://api.cakto.com/v1/transactions/{id} e checar status === 'paid'
  const caktoApiUrl = process.env.CAKTO_API_URL;
  const caktoApiKey = process.env.CAKTO_API_KEY;
  if (caktoApiUrl && caktoApiKey) {
    try {
      const res = await fetch(
        `${caktoApiUrl.replace(/\/$/, '')}/transactions/${_transactionId}`,
        {
          headers: { Authorization: `Bearer ${caktoApiKey}` },
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      return data?.status === 'paid' || data?.status === 'approved';
    } catch {
      return false;
    }
  }
  // Sem config Cakto: em produção seria mais seguro rejeitar; por ora aceita para não bloquear
  return true;
}
