import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Criar cliente Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verificar sessão
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Pegar hostname e extrair subdomínio
  const hostname = request.headers.get('host') || '';
  
  // Desenvolvimento local: localhost:3000 ou app.localhost:3000
  // Produção Vercel: xxx.vercel.app ou feedtratto.com
  const isLocalhost = hostname.includes('localhost');
  const isVercel = hostname.includes('vercel.app');
  
  let subdomain = '';
  
  if (isLocalhost) {
    // Tentar extrair do hostname primeiro (app.localhost, nutroeste.localhost)
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      subdomain = parts[0]; // app, nutroeste, portal, admin
    } else {
      // Fallback: usar query param ?subdomain=app
      subdomain = request.nextUrl.searchParams.get('subdomain') || 'app';
    }
  } else if (isVercel) {
    // Vercel preview: usar query param também
    subdomain = request.nextUrl.searchParams.get('subdomain') || 'app';
  } else {
    // Produção: extrair do hostname
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      subdomain = parts[0]; // admin, portal, nutroeste, etc
    }
  }

  console.log('🌐 Middleware:', { hostname, subdomain, isLocalhost, isVercel });

  // ============================================
  // 1️⃣ ADMIN (admin.feedtratto.com ou ?subdomain=admin)
  // ============================================
  if (subdomain === 'admin') {
    // Verificar se está logado
    if (!session && !request.nextUrl.pathname.startsWith('/login')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('subdomain', 'admin');
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se é super admin
    if (session) {
      const { data: isSuperAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!isSuperAdmin && !request.nextUrl.pathname.startsWith('/unauthorized')) {
        const unauthorizedUrl = new URL('/unauthorized', request.url);
        unauthorizedUrl.searchParams.set('subdomain', 'admin');
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    // Rewrite para rota (admin)
    const url = request.nextUrl.clone();
    url.pathname = `/(admin)${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  // ============================================
  // 2️⃣ PORTAL (portal.feedtratto.com ou ?subdomain=portal)
  // ============================================
  if (subdomain === 'portal') {
    // Verificar se está logado
    if (!session && !request.nextUrl.pathname.startsWith('/login')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('subdomain', 'portal');
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se é admin de empresa
    if (session) {
      const { data: isEmpresaAdmin } = await supabase
        .from('empresa_admins')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!isEmpresaAdmin && !request.nextUrl.pathname.startsWith('/unauthorized')) {
        const unauthorizedUrl = new URL('/unauthorized', request.url);
        unauthorizedUrl.searchParams.set('subdomain', 'portal');
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    // Rewrite para rota (portal)
    const url = request.nextUrl.clone();
    url.pathname = `/(portal)${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  // ============================================
  // 3️⃣ CLIENTE (nutroeste.feedtratto.com ou ?subdomain=nutroeste)
  // ============================================
  // Qualquer outro subdomínio é considerado cliente
  if (subdomain && subdomain !== 'www') {
    // Verificar se está logado
    if (!session && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/cadastro') && !request.nextUrl.pathname.startsWith('/signup')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('subdomain', subdomain);
      return NextResponse.redirect(loginUrl);
    }

    // Se está logado, permitir acesso
    return NextResponse.next();
  }

  // ============================================
  // DEFAULT: Sem subdomínio - redirecionar para login
  // ============================================
  if (!session && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/cadastro') && !request.nextUrl.pathname.startsWith('/signup')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('subdomain', 'app');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (for testing)
     * - test pages
     */
    '/((?!_next/static|_next/image|favicon.ico|api|test|login|cadastro|signup|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
