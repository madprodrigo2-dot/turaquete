import { auth } from '@/auth'
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'

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

// auth() sempre resolve a sessão antes de chamar o callback (getSession() roda
// incondicionalmente dentro do handleAuth do next-auth) — por isso fica isolado
// aqui e só é invocado para /admin/*. /raquetes/* (inclui cada .webp de raquete)
// nunca paga esse custo.
const authMiddleware = auth((req) => {
  if (!req.auth) {
    const res = NextResponse.redirect(new URL('/admin/login', req.url))
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-admin-protected', '1')
  return NextResponse.next({ request: { headers: requestHeaders } })
}) as unknown as (req: NextRequest, event: NextFetchEvent) => Promise<Response>

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl
  // Decisão de rota sempre em lowercase. Bug real 2026-11-04: '/RAQUETES/...'
  // ou '/Raquetes/...' não casava com a comparação case-sensitive abaixo,
  // caía no fallback de admin e redirecionava pra /admin/login. O lookup do
  // slug real contra a DB (dentro da page) continua case-sensitive — isso
  // aqui só decide qual branch do middleware roda, nunca busca dado.
  const pathLower = pathname.toLowerCase()

  // Cobre a ficha /raquetes/{slug}, a rota bare /raquetes (ex: redirect de
  // /marcas) e as imagens /raquetes/{slug}.webp — tudo que compartilha esse
  // prefixo tem que escapar do authMiddleware de admin. Bug real 2026-11-04:
  // 'raquetes'.startsWith('/raquetes/') é false (falta a barra), então o path
  // bare caía no gate de admin e redirecionava pra /admin/login.
  const isRacketPath = pathLower === '/raquetes' || pathLower.startsWith('/raquetes/')

  if (isRacketPath) {
    // Hotlink check só vale pra arquivo de imagem — a página da ficha nunca
    // deve cair nesse bloqueio, senão todo tráfego real com referer externo
    // (Google, WhatsApp, etc.) recebe o SVG placeholder em vez da ficha.
    if (/\.(webp|png|jpe?g)$/i.test(pathname) && !isAllowedReferer(req.headers.get('referer'))) {
      return new NextResponse(HOTLINK_SVG, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
      })
    }
    return NextResponse.next()
  }

  return authMiddleware(req, event)
}

// Login e reset excluídos do matcher — middleware não roda para essas rotas
export const config = {
  matcher: ['/admin/((?!login|reset).+)', '/raquetes/:path*'],
}
