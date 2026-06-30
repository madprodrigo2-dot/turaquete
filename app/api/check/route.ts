import { NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest) {
  const cookieNames = [...req.cookies.getAll()].map(c => c.name)
  const sessionCookies = cookieNames.filter(n =>
    n.includes('session') || n.includes('auth') || n.includes('csrf')
  )
  return NextResponse.json({
    allCookies: cookieNames,
    sessionRelated: sessionCookies,
    hasAnySession: sessionCookies.some(n => n.includes('session')),
    url: req.url,
  }, {
    headers: { 'Cache-Control': 'no-store' }
  })
}
