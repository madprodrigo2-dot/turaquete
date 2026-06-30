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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/raquetes/')) {
    if (!isAllowedReferer(req.headers.get('referer'))) {
      return new NextResponse(HOTLINK_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      })
    }
    return NextResponse.next()
  }

  // Passa pathname para o layout poder pular auth em login/reset
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)

  if (!hasSession(req)) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/admin/:path*', '/raquetes/:path*'],
}
