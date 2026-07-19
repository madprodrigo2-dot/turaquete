import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getSupabase } from '@/lib/supabase'
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
      .select('id, name, price, price_updated_at, affiliate_url, is_active, brand_id')
      .eq('publicada', true)
      .order('name'),
    sb.from('brands').select('id, name'),
    sb
      .from('link_clicks')
      .select('racket_id')
      .eq('tipo', 'afiliado')
      .eq('is_test', false)
      .not('session_id', 'is', null)
      .gte('created_at', thirtyDaysAgo),
  ])

  const brandById = new Map((brands ?? []).map(b => [b.id as number, b.name as string]))

  const clickCounts: Record<number, number> = {}
  for (const c of (clicks ?? [])) {
    if (c.racket_id) clickCounts[c.racket_id] = (clickCounts[c.racket_id] ?? 0) + 1
  }

  type RacketRow = {
    id: number; name: string; price: number | null
    price_updated_at: string | null; affiliate_url: string | null
    is_active: boolean | null; brand_id: number | null
  }

  const rows: PriceRowData[] = ((rackets as RacketRow[] | null) ?? []).map(r => ({
    id:               r.id,
    name:             r.name,
    brandName:        brandById.get(r.brand_id ?? -1) ?? '—',
    price:            r.price,
    price_updated_at: r.price_updated_at,
    affiliate_url:    r.affiliate_url,
    is_active:        r.is_active,
    clicks30d:        clickCounts[r.id] ?? 0,
  }))

  // Sort: affiliate active first → by clicks30d desc → by name
  rows.sort((a, b) => {
    const aAfil = a.affiliate_url && a.is_active !== false ? 1 : 0
    const bAfil = b.affiliate_url && b.is_active !== false ? 1 : 0
    if (aAfil !== bAfil) return bAfil - aAfil
    if (b.clicks30d !== a.clicks30d) return b.clicks30d - a.clicks30d
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  const comAfil = rows.filter(r => r.affiliate_url && r.is_active !== false).length
  const semPreco = rows.filter(r => r.affiliate_url && r.is_active !== false && !r.price_updated_at).length

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preços — Atualização Manual</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Busca o preço atual no ML, cola aqui e salva · price_updated_at atualiza para hoje
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-0.5 pt-1">
          <div className="font-semibold text-gray-700">{comAfil} com afiliado ativo</div>
          {semPreco > 0 && <div className="text-orange-500">⏰ {semPreco} sem preço algum dia</div>}
        </div>
      </div>

      {/* Sync disabled banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 leading-relaxed">
        <p>
          <span className="font-semibold">⛔ Sync automático desativado</span> — preços atualizados manualmente.
          ML bloqueou leitura automática em jul/2026 (challenge <code className="text-xs bg-amber-100 px-1 rounded">/gz/account-verification</code> em todas as páginas de produto sem sessão ativa).
        </p>
        <p className="mt-1 text-amber-700 text-xs">
          Fluxo manual: abra o link ML ao lado → copie o preço → cole no campo → Salvar.
        </p>
      </div>

      <PrecosClient rows={rows} />
    </div>
  )
}
