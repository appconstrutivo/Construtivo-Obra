import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente com service role para operações admin
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase env vars não configuradas (NEXT_PUBLIC_SUPABASE_URL)' },
        { status: 500 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key não configurada' },
        { status: 500 }
      );
    }

    const { email, role, empresa_id, convidado_por } = await request.json();

    if (!email || !empresa_id) {
      return NextResponse.json(
        { error: 'Email e empresa_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe em usuarios (verificação mais eficiente)
    const { data: existingUsuario, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, ativo')
      .eq('email', email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = nenhum resultado encontrado
      console.error('Erro ao verificar usuário existente:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar se o usuário já existe' },
        { status: 500 }
      );
    }

    if (existingUsuario) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe no auth.users (verificação adicional)
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingAuthUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (userExists) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      );
    }

    // Obter URL dinâmica da requisição (funciona em qualquer porta)
    const origin = request.headers.get('origin') || request.headers.get('referer') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const baseUrl = origin.replace(/\/$/, ''); // Remove barra final se houver
    
    // Criar usuário e enviar email de convite usando inviteUserByEmail
    // Este método cria o usuário E envia o email de convite automaticamente
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nome: email.split('@')[0],
        empresa_id: empresa_id.toString(),
        role: role || 'membro',
        convidado_por: convidado_por
      },
      redirectTo: `${baseUrl}/redefinir-senha`
    });

    if (authError) {
      console.error('Erro ao convidar usuário no auth:', authError);
      return NextResponse.json(
        { error: authError.message || 'Erro ao enviar convite' },
        { status: 400 }
      );
    }

    if (!authData?.user?.id) {
      return NextResponse.json(
        { error: 'Erro ao obter ID do usuário criado' },
        { status: 500 }
      );
    }

    // Criar registro em usuarios com o id do auth.users
    // Usar upsert para evitar erro se o trigger já criou o registro
    const { error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        id: authData.user.id,
        email: email,
        nome: email.split('@')[0],
        empresa_id: empresa_id,
        role: role || 'membro',
        ativo: false, // Ativo quando confirmar email
        convidado_por: convidado_por,
        data_convite: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (usuarioError) {
      console.error('Erro ao criar registro em usuarios:', usuarioError);
      
      // Se falhar com erro de duplicata, verificar se foi criado pelo trigger
      if (usuarioError.code === '23505') { // Violação de constraint única
        // Verificar se o registro foi criado pelo trigger
        const { data: createdUsuario } = await supabaseAdmin
          .from('usuarios')
          .select('id')
          .eq('id', authData.user.id)
          .single();
        
        if (createdUsuario) {
          // Registro foi criado pelo trigger, apenas atualizar com os dados do convite
          await supabaseAdmin
            .from('usuarios')
            .update({
              empresa_id: empresa_id,
              role: role || 'membro',
              convidado_por: convidado_por,
              data_convite: new Date().toISOString()
            })
            .eq('id', authData.user.id);
        } else {
          // Erro real, remover usuário do auth
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json(
            { error: 'Erro ao criar registro do usuário' },
            { status: 500 }
          );
        }
      } else {
        // Outro tipo de erro, remover usuário do auth
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: usuarioError.message || 'Erro ao criar registro do usuário' },
          { status: 500 }
        );
      }
    }

    // O email de convite já foi enviado automaticamente pelo inviteUserByEmail()
    // O usuário receberá um email com link para definir sua senha

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: email
      },
      message: 'Convite enviado com sucesso. O usuário receberá um email para definir sua senha.'
    });
  } catch (error: any) {
    console.error('Erro ao convidar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
