import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  // Only proxy http/https URLs
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  try {
    const upstream = await fetch(url, { headers: { Accept: 'image/*' } })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream error' }, { status: upstream.status })
    }
    const buf = await upstream.arrayBuffer()
    const ct  = upstream.headers.get('content-type') || 'image/webp'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json({ error: 'proxy error' }, { status: 502 })
  }
}
