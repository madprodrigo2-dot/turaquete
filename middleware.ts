import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
})

// Protect all admin pages except the login page itself
export const config = {
  matcher: ['/admin/((?!login).+)'],
}
