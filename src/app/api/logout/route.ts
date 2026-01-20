import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgoafwgxenhwhkxdkwox.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2Fmd2d4ZW5od2hreGRrd294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDYxMDcsImV4cCI6MjA4NDI4MjEwN30.Fdlx_f8_fP1KmaBvAATb4PyNSEC8Rtd7c6wGURZIMow';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    // Criar cliente Supabase para o servidor
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            // No endpoint logout, não precisamos setar cookies
          },
          remove: (name: string, options: CookieOptions) => {
            // No endpoint logout, não precisamos remover cookies
          },
        },
      }
    );

    // Fazer logout no Supabase (limpar sessão)
    await supabase.auth.signOut();

    // Atualizar último acesso do usuário (opcional - para registrar quando saiu)
    if (userId) {
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no logout silencioso:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
} 