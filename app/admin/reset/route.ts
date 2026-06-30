import { NextResponse } from 'next/server'

const COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'next-auth.session-token',
  'next-auth.csrf-token',
  'next-auth.callback-url',
]

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Limpando sessão…</title>
</head>
<body>
  <script>
    // limpa cookies via JS
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var name = cookies[i].trim().split('=')[0];
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=' + location.hostname + ';';
    }
    // redireciona sem cache
    window.location.replace('/admin/login?t=' + Date.now());
  </script>
  <p>Limpando sessão…</p>
</body>
</html>`

export function GET() {
  const res = new NextResponse(HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
  for (const name of COOKIE_NAMES) {
    res.cookies.set(name, '', { maxAge: 0, path: '/' })
  }
  return res
}
