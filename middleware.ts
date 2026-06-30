import { NextRequest, NextResponse } from 'next/server'

const HOTLINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60">
  <rect width="220" height="60" rx="6" fill="#0CC0BE"/>
  <text x="110" y="26" font-family="Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="middle">raquetes de beach tennis</text>
  <text x="110" y="44" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">turaquete.com.br</text>
</svg>`

function isAllowedReferer(referer: string | null): boolean {
  if (!referer) return true
  try {
    const host = new URL(referer).hostname
    return (
      host === 'turaquete.com.br' ||
      host === 'www.turaquete.com.br' ||
      host === 'localhost' ||
      host.endsWith('.vercel.app')
    )
  } catch {
    return true
  }
}

function hasSession(req: NextRequest): boolean {
  return !!(
    req.cookies.get('authjs.session-token') ||
    req.cookies.get('__Secure-authjs.session-token') ||
    req.cookies.get('next-auth.session-token') ||
    req.cookies.get('__Secure-next-auth.session-token')
  )
}

function noStoreRedirect(url: URL): NextResponse {
  const res = NextResponse.redirect(url)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.headers.set('Pragma', 'no-cache')
  return res
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Hotlink protection para imagens
  if (pathname.startsWith('/raquetes/')) {
    if (!isAllowedReferer(req.headers.get('referer'))) {
      return new NextResponse(HOTLINK_SVG, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
      })
    }
    return NextResponse.next()
  }

  const loggedIn = hasSession(req)

  // Rota de reset: sempre permite, sem cache
  if (pathname.startsWith('/admin/reset')) {
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  }

  // Página de login
  if (pathname === '/admin/login') {
    // Se já está logado, redireciona para o admin (sem cache)
    if (loggedIn) {
      return noStoreRedirect(new URL('/admin/analise', req.url))
    }
    // Se não está logado, mostra o login (sem cache para evitar redirect cacheado)
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
    return res
  }

  // Rotas protegidas: requer sessão
  if (!loggedIn) {
    return noStoreRedirect(new URL('/admin/login', req.url))
  }

  // Passa pathname para o layout renderizar o shell
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-admin-protected', '1')
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/admin/:path*', '/raquetes/:path*'],
}
