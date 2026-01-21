import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase env vars não configuradas' },
        { status: 500 }
      );
    }

    // Body é opcional (usado apenas para registrar último acesso)
    let userId: string | undefined;
    try {
      const body = await request.json();
      userId = body?.userId;
    } catch {
      userId = undefined;
    }

    const response = NextResponse.json({ success: true });

    // Criar cliente Supabase para o servidor
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            // Necessário para o @supabase/ssr conseguir limpar/atualizar cookies
            response.cookies.set({ name, value, ...options, path: '/', sameSite: 'lax' });
          },
          remove: (name: string, options: CookieOptions) => {
            // Expirar cookie para efetivar logout no middleware/SSR
            response.cookies.set({ name, value: '', ...options, path: '/', expires: new Date(0) });
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

    return response;
  } catch (error) {
    console.error('Erro no logout silencioso:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
} 