import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import Link from 'next/link'

type RacketRow = {
  id: number
  name: string
  slug: string
  publicada: boolean
  price: number | null
  brand_id: number | null
  racket_insights:
    | { power: number | null; control: number | null; comfort: number | null; spin: number | null; nivel_sugerido: string | null }
    | { power: number | null; control: number | null; comfort: number | null; spin: number | null; nivel_sugerido: string | null }[]
    | null
}

function nivLabel(n: string | null) {
  if (n === 'iniciante') return 'ini'
  if (n === 'intermediario') return 'int'
  if (n === 'avancado') return 'avç'
  return '—'
}

export default async function AdminRaquetasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const sp = await searchParams
  const sb = getSupabase()

  let query = sb
    .from('rackets')
    .select('id, name, slug, publicada, price, brand_id, racket_insights(power, control, comfort, spin, nivel_sugerido)')
    .order('publicada', { ascending: false })
    .order('name')

  if (sp.q) query = query.ilike('name', `%${sp.q}%`)

  const [{ data, error }, { data: brandsData }] = await Promise.all([
    query,
    sb.from('brands').select('id, name'),
  ])

  if (error) console.error('[admin/rackets] query error:', error.message, error.details)

  const brandMap = new Map((brandsData ?? []).map((b: { id: number; name: string }) => [b.id, b.name]))

  const rackets = ((data ?? []) as RacketRow[]).map(r => ({
    ...r,
    brandName: r.brand_id ? (brandMap.get(r.brand_id) ?? '—') : '—',
    racket_insights: Array.isArray(r.racket_insights)
      ? (r.racket_insights[0] ?? null)
      : r.racket_insights,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-semibold text-gray-800">
          Raquetas{' '}
          <span className="text-gray-400 font-normal">({rackets.length})</span>
        </h1>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Buscar..."
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-40 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-400 font-medium">
              <th className="text-left px-4 py-2.5">Raqueta</th>
              <th className="text-left px-3 py-2.5">Marca</th>
              <th className="text-left px-3 py-2.5">Nível</th>
              <th className="text-center px-2 py-2.5">Pot</th>
              <th className="text-center px-2 py-2.5">Conf</th>
              <th className="text-center px-2 py-2.5">Ctrl</th>
              <th className="text-center px-2 py-2.5">Spin</th>
              <th className="text-right px-4 py-2.5">Preço</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rackets.map(r => {
              const ins = r.racket_insights as {
                power: number | null
                control: number | null
                comfort: number | null
                spin: number | null
                nivel_sugerido: string | null
              } | null
              return (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${
                        r.publicada ? 'bg-teal-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-gray-800 font-medium">{r.name}</span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400">{r.brandName}</td>
                  <td className="px-3 py-2.5 text-gray-400">{nivLabel(ins?.nivel_sugerido ?? null)}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{ins?.power ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{ins?.comfort ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{ins?.control ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{ins?.spin ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">
                    {r.price ? `R$ ${r.price.toLocaleString('pt-BR')}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/admin/rackets/${r.slug}`}
                      className="text-teal-600 hover:text-teal-800 font-medium"
                    >
                      Editar →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
          publicada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
          não publicada
        </span>
        <span>· Pot=potência Conf=conforto Ctrl=controle</span>
      </p>
    </div>
  )
}
