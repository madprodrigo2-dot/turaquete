import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import Link from 'next/link'

type GripRow = {
  id: number
  name: string
  slug: string
  image_url: string | null
  confianca: string | null
  publicada: boolean
  embalagem_unidades: number | null
  brand: { name: string } | null
}

export default async function AdminGripsPage() {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const sb = getSupabase()

  const { data, error } = await sb
    .from('grips')
    .select('id, name, slug, image_url, confianca, publicada, embalagem_unidades, brand:brands(name)')
    .order('id')

  if (error) console.error('[admin/grips] query error:', error.message)

  const grips = ((data ?? []) as unknown as Array<Omit<GripRow, 'brand'> & { brand: { name: string } | { name: string }[] | null }>).map(g => ({
    ...g,
    brand: Array.isArray(g.brand) ? (g.brand[0] ?? null) : g.brand,
  }))

  const confiancaColor = (c: string | null) =>
    c === 'alta' ? 'text-teal-600 bg-teal-50' :
    c === 'media' ? 'text-amber-600 bg-amber-50' :
    c === 'baixa' ? 'text-red-500 bg-red-50' :
    'text-gray-400 bg-gray-50'

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-700">Grips</h1>
        <span className="text-xs text-gray-400">{grips.length} carregados</span>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden divide-y divide-gray-50">
        {grips.map(g => (
          <Link
            key={g.id}
            href={`/admin/grips/${g.slug}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="shrink-0 w-10 h-12 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              {g.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.image_url} alt={g.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[8px] text-gray-300 text-center">sem foto</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">{g.brand?.name ?? '—'} {g.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {g.slug}{g.embalagem_unidades ? ` · ${g.embalagem_unidades}un` : ''}
              </p>
            </div>

            {g.confianca && (
              <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${confiancaColor(g.confianca)}`}>
                {g.confianca}
              </span>
            )}

            {!g.publicada && (
              <span className="shrink-0 bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-medium">
                não publicado
              </span>
            )}
          </Link>
        ))}

        {grips.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum grip carregado ainda.</p>
        )}
      </div>
    </div>
  )
}
