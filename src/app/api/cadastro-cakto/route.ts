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
    const caktoConfigurado = !!(
      process.env.CAKTO_CLIENT_ID && process.env.CAKTO_CLIENT_SECRET
    );

    // transaction_id (id do pedido Cakto) obrigatório apenas quando Cakto está configurado.
    // Sem Cakto configurado, o redirect pode vir só com plan_id + quantidade_obras.
    if (!isTestMode && !transaction_id && caktoConfigurado) {
      return NextResponse.json(
        { error: 'transaction_id é obrigatório quando test_mode não é true' },
        { status: 400 }
      );
    }

    if (!isTestMode && transaction_id) {
      const isValid = await validarPedidoCakto(transaction_id);
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

const CAKTO_API_BASE = 'https://api.cakto.com.br';

/**
 * Obtém access_token OAuth2 da Cakto (client_id + client_secret).
 * Documentação: https://docs.cakto.com.br/authentication
 */
async function obterTokenCakto(): Promise<string | null> {
  const clientId = process.env.CAKTO_CLIENT_ID;
  const clientSecret = process.env.CAKTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const res = await fetch(`${CAKTO_API_BASE}/public_api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Valida o pedido na Cakto: GET /public_api/orders/{id}/ e verifica status paid ou authorized.
 * Documentação: https://docs.cakto.com.br/api-reference/orders/retrieve
 */
async function validarPedidoCakto(orderId: string): Promise<boolean> {
  const token = await obterTokenCakto();
  if (!token) return false;
  try {
    const res = await fetch(
      `${CAKTO_API_BASE}/public_api/orders/${encodeURIComponent(orderId)}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    const status = data?.status?.toLowerCase();
    return status === 'paid' || status === 'authorized';
  } catch {
    return false;
  }
}
