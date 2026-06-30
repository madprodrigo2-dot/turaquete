import { NextResponse } from 'next/server'

export function GET() {
  const res = NextResponse.redirect(
    new URL('/admin/login', process.env.NEXTAUTH_URL ?? 'https://www.turaquete.com.br')
  )
  const cookieNames = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'authjs.csrf-token',
    '__Host-authjs.csrf-token',
    'authjs.callback-url',
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
  ]
  for (const name of cookieNames) {
    res.cookies.set(name, '', { maxAge: 0, path: '/' })
  }
  return res
}
