import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabaseServer';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;

  // Recursos estáticos que não precisam de autenticação
  const isStaticResource = path.match(/\.(js|css|png|jpg|jpeg|svg|ico|webp)$/i);
  if (isStaticResource) {
    return response;
  }

  // Se for uma rota de API, permitir acesso
  if (path.startsWith('/api/')) {
    return response;
  }

  // Rotas de autenticação que não precisam de proteção
  const authRoutes = ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/cadastro/confirmacao'];
  const isAuthRoute = authRoutes.some(route => path.startsWith(route));

  try {
    const supabase = createMiddlewareClient(request, response);

    // Usar getUser() em vez de getSession(): valida a sessão com o servidor Auth do Supabase.
    // getSession() lê apenas do storage (cookies) e pode retornar sessão inválida após logout.
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log(`[Middleware] Rota: ${path}`);
    console.log(`[Middleware] É rota de auth: ${isAuthRoute}`);
    console.log(`[Middleware] Usuário autenticado: ${user ? 'SIM' : 'NÃO'}`);
    console.log(`[Middleware] Erro na auth: ${error ? error.message : 'NENHUM'}`);

    if (user) {
      console.log(`[Middleware] Usuário logado: ${user.email}`);
    }

    // Se há erro ou não há usuário (sessão inválida ou expirada)
    if (error || !user) {
      // Se está tentando acessar rota protegida, redirecionar para login
      if (!isAuthRoute) {
        console.log(`[Middleware] ❌ Redirecionando ${path} para /login - sem sessão válida`);
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // Se está em rota de auth, permitir acesso
      console.log(`[Middleware] ✅ Permitindo acesso à rota de auth: ${path}`);
      return response;
    }

    // Se há usuário válido e está tentando acessar rota de auth, redirecionar para dashboard
    // EXCETO para /redefinir-senha, que precisa permitir acesso mesmo com sessão (para criar senha após convite)
    if (user && isAuthRoute && path !== '/redefinir-senha') {
      console.log(`[Middleware] ✅ Usuário autenticado em ${path}, redirecionando para /dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Permitir acesso a /redefinir-senha mesmo com sessão (para criar senha após convite)
    if (user && path === '/redefinir-senha') {
      console.log(`[Middleware] ✅ Permitindo acesso a /redefinir-senha mesmo com sessão (criação de senha)`);
      return response;
    }

    // Continuar com a requisição normalmente
    console.log(`[Middleware] ✅ Permitindo acesso à rota protegida: ${path}`);
    return response;
    
  } catch (error) {
    console.error('[Middleware] ❌ Erro no middleware:', error);
    // Em caso de erro (ex.: env Supabase não configurada), permitir acesso a rotas de auth
    // para que /login carregue; rotas protegidas redirecionam para login
    if (isAuthRoute) {
      return response;
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Configuração simplificada
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)',
  ],
}; 