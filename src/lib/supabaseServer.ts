import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars não configuradas. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => {
        // Tentar obter do cookie primeiro, depois do header
        const cookieValue = request.cookies.get(name)?.value;
        if (cookieValue) {
          console.log(`[Middleware] Cookie encontrado: ${name} = ${cookieValue.substring(0, 50)}...`);
          return cookieValue;
        }
        
        // Fallback para tentar obter do localStorage via header (se disponível)
        const storageHeader = request.headers.get('x-supabase-auth');
        if (storageHeader && name.includes('auth-token')) {
          console.log(`[Middleware] Usando storage do header para: ${name}`);
          return storageHeader;
        }
        
        console.log(`[Middleware] Cookie não encontrado: ${name}`);
        return undefined;
      },
      set: (name: string, value: string, options: any) => {
        console.log(`[Middleware] Definindo cookie: ${name} = ${value.substring(0, 50)}...`);
        response.cookies.set({ name, value, ...options, path: '/', sameSite: 'lax' });
      },
      remove: (name: string, options: any) => {
        console.log(`[Middleware] Removendo cookie: ${name}`);
        response.cookies.set({ name, value: '', ...options, path: '/', expires: new Date(0) });
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: false
    }
  })
} 