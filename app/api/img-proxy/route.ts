import { NextRequest, NextResponse } from 'next/server'

// Domínios de onde já vem algum image_url externo hoje (raquetes ainda não
// migradas pro fluxo local /raquetes/{slug}.webp via /image-fix). Só
// adicionar aqui depois de confirmar que é fonte legítima — nunca abrir geral.
const ALLOWED_HOSTS = new Set([
  'www.beachtennisdepot.com',
])

const MAX_BYTES = 5 * 1024 * 1024 // 5MB — generoso pra imagem de raquete

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  let parsed: URL
  try { parsed = new URL(url) } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'host não permitido' }, { status: 403 })
  }

  try {
    const upstream = await fetch(parsed.toString(), { headers: { Accept: 'image/*' } })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream error' }, { status: upstream.status })
    }

    const ct = upstream.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) {
      return NextResponse.json({ error: 'conteúdo não é imagem' }, { status: 415 })
    }
    const contentLength = upstream.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return NextResponse.json({ error: 'imagem grande demais' }, { status: 413 })
    }

    const buf = await upstream.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'imagem grande demais' }, { status: 413 })
    }

    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'proxy error' }, { status: 502 })
  }
}
