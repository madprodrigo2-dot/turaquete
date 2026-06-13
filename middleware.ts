import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
})

// Only protect the analytics page — the login page must remain publicly accessible
export const config = {
  matcher: ['/admin/intencoes'],
}
