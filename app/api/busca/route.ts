import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const revalidate = 300

type Row = {
  name: string
  slug: string
  price: number | null
  brands: { name: string } | { name: string }[] | null
}

export async function GET() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('rackets')
    .select('name, slug, price, brands(name)')
    .eq('publicada', true)
    .order('name')

  if (error) return NextResponse.json([], { status: 500 })

  const items = ((data ?? []) as Row[]).map(r => ({
    name: r.name,
    slug: r.slug,
    price: r.price,
    brand: Array.isArray(r.brands) ? (r.brands[0]?.name ?? null) : (r.brands?.name ?? null),
  }))

  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
