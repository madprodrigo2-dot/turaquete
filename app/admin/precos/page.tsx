import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getSupabaseAdmin as getSupabase } from '@/lib/supabase'
import PrecosClient, { type PriceRowData } from './PrecosClient'

export const dynamic = 'force-dynamic'

export default async function PrecosPage() {
  const session = await auth()
  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  const sb = getSupabase()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: rackets }, { data: brands }, { data: clicks }] = await Promise.all([
    sb
      .from('rackets')
      .select('id, name, slug, price, price_updated_at, affiliate_url, is_active, brand_id')
      .eq('publicada', true)
      .order('name'),
    sb.from('brands').select('id, name'),
    sb
      .from('link_clicks')
      .select('racket_id')
      .eq('tipo', 'afiliado')
      .eq('is_test', false)
      .gte('created_at', thirtyDaysAgo),
  ])

  const brandById = new Map((brands ?? []).map(b => [b.id as number, b.name as string]))

  const clickCounts: Record<number, number> = {}
  for (const c of (clicks ?? [])) {
    if (c.racket_id) clickCounts[c.racket_id] = (clickCounts[c.racket_id] ?? 0) + 1
  }

  type RacketRow = {
    id: number; name: string; slug: string | null; price: number | null
    price_updated_at: string | null; affiliate_url: string | null
    is_active: boolean | null; brand_id: number | null
  }

  const now = Date.now()
  function staleDays(updatedAt: string | null): number {
    if (!updatedAt) return 99999
    return (now - new Date(updatedAt).getTime()) / 86_400_000
  }

  const rows: PriceRowData[] = ((rackets as RacketRow[] | null) ?? []).map(r => {
    const clicks30d = clickCounts[r.id] ?? 0
    const hasAfil   = r.affiliate_url != null && r.is_active !== false
    const group: 'A' | 'B' | 'C' = !hasAfil ? 'C' : clicks30d > 0 ? 'A' : 'B'
    return {
      id:               r.id,
      name:             r.name,
      slug:             r.slug,
      brandName:        brandById.get(r.brand_id ?? -1) ?? '—',
      price:            r.price,
      price_updated_at: r.price_updated_at,
      affiliate_url:    r.affiliate_url,
      is_active:        r.is_active,
      clicks30d,
      group,
    }
  })

  // Sort: A first (clicks desc, then oldest first), then B (oldest first), then C (name)
  const groupOrder = { A: 0, B: 1, C: 2 } as const
  rows.sort((a, b) => {
    if (a.group !== b.group) return groupOrder[a.group] - groupOrder[b.group]
    if (a.group === 'A' || a.group === 'B') {
      if (a.group === 'A' && b.clicks30d !== a.clicks30d) return b.clicks30d - a.clicks30d
      return staleDays(b.price_updated_at) - staleDays(a.price_updated_at) // oldest first
    }
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  const groupACount = rows.filter(r => r.group === 'A').length
  const staleCount  = rows.filter(r => r.group !== 'C' && r.price_updated_at !== null && staleDays(r.price_updated_at) > 30).length
  const neverCount  = rows.filter(r => r.group !== 'C' && r.price_updated_at === null).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Preços — Atualização Manual</h1>
        <p className="text-gray-400 text-xs mt-0.5">
          Busca o preço atual no ML, cola aqui e salva · price_updated_at atualiza para hoje
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 leading-relaxed">
        <p>
          <span className="font-semibold">⛔ Sync automático desativado</span> — preços atualizados manualmente.
          ML bloqueou leitura automática em jul/2026 (challenge <code className="text-xs bg-amber-100 px-1 rounded">/gz/account-verification</code> em todas as páginas de produto sem sessão ativa).
        </p>
        <p className="mt-1 text-amber-700 text-xs">
          Fluxo manual: abra o link ML ao lado → copie o preço → cole no campo → Salvar.
        </p>
      </div>

      <PrecosClient
        rows={rows}
        summary={{ groupA: groupACount, stale30d: staleCount, neverUpdated: neverCount }}
      />
    </div>
  )
}
