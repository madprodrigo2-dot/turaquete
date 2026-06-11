import { getSupabase } from '@/lib/supabase'

export const metadata = { robots: 'noindex, nofollow', title: '[DEBUG] AMA Sport — preview interno' }
export const dynamic = 'force-dynamic'

const FIELDS = `
  id, name, slug, model_year, weight_g, balance, face_material, core,
  thickness_mm, is_active, image_url, price, specs_extra,
  racket_insights (
    power, control, comfort, maneuverability, stability, spin, forgiveness,
    nivel_sugerido, confianca, perfil_resumo, ai_drafted, reviewed
  )
`.trim()

type AmaRow = Record<string, unknown> & { racket_insights: Record<string, unknown> | null }

async function getAmaRackets(): Promise<AmaRow[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(FIELDS)
    .eq('brand_id', 2)
    .order('name') as unknown as { data: AmaRow[] | null; error: { message: string } | null }

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => {
    const ins = row.racket_insights
    return {
      ...row,
      racket_insights: Array.isArray(ins) ? ((ins as AmaRow[])[0] ?? null) : (ins ?? null),
    }
  })
}

function Badge({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null) return null
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
      {label}: {String(value)}
    </span>
  )
}

export default async function DebugAmaPage() {
  const rackets = await getAmaRackets()

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        <div className="bg-amber-100 border border-amber-300 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-amber-600 text-lg">⚠</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Validação interna — não indexada</p>
            <p className="text-amber-700 text-xs">
              AMA Sport catálogo não publicado. {rackets.length} raquetes (todas devem estar INATIVO).
            </p>
          </div>
        </div>

        {rackets.length === 0 && (
          <p className="text-gray-500 text-sm p-4 bg-white rounded-xl">
            Nenhuma raquete encontrada para brand_id=2. SQL ainda não foi executado?
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rackets.map((r) => {
            const extra = ((r.specs_extra ?? {}) as Record<string, unknown>)
            const ins = r.racket_insights as Record<string, unknown> | null
            const isActive = r.is_active as boolean

            return (
              <div key={r.id as number} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">

                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_url as string}
                    alt={r.name as string}
                    className="w-full h-44 object-contain bg-gray-50 p-3"
                  />
                ) : (
                  <div className="w-full h-44 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                    sem imagem — rode o SQL
                  </div>
                )}

                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-semibold text-gray-800 text-sm leading-snug flex-1">{r.name as string}</p>
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {isActive ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </div>

                  <p className="text-gray-400 text-[10px] font-mono">{r.slug as string}</p>

                  <div className="flex flex-wrap gap-1">
                    <Badge label="peso"   value={(r.weight_g as number | null) ? `${r.weight_g}g` : null} />
                    <Badge label="esp"    value={(r.thickness_mm as number | null) ? `${r.thickness_mm}mm` : null} />
                    <Badge label="furos"  value={extra.furos_quantidade as number | null} />
                    <Badge label="fibra"  value={r.face_material as string | null} />
                    <Badge label="núcleo" value={r.core as string | null} />
                    <Badge label="atleta" value={extra.atleta as string | null} />
                  </div>

                  {ins && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
                      <Badge label="pot"  value={ins.power as number} />
                      <Badge label="ctrl" value={ins.control as number} />
                      <Badge label="cmf"  value={ins.comfort as number} />
                      <Badge label="man"  value={ins.maneuverability as number} />
                      <Badge label="sta"  value={ins.stability as number} />
                      <Badge label="fog"  value={ins.forgiveness as number} />
                      <Badge label="conf" value={ins.confianca as string} />
                    </div>
                  )}

                  {ins?.perfil_resumo != null && (
                    <p className="text-gray-500 text-[11px] leading-snug border-t border-gray-100 pt-2">
                      {String(ins.perfil_resumo)}
                    </p>
                  )}

                  {extra.imagem_fonte != null && (
                    <a
                      href={String(extra.imagem_fonte)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-[10px] truncate hover:underline mt-auto"
                    >
                      fonte ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-amber-600 text-xs text-center">Quando validar, avise e eu apago esta página.</p>
      </div>
    </div>
  )
}
