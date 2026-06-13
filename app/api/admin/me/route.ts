import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL
  return NextResponse.json({ isAdmin })
}
