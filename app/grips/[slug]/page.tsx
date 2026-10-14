import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getGripDisplayName } from '@/lib/displayName'
import SiteNav from '@/components/SiteNav'
import RacketImageTile from '@/components/RacketImageTile'
import GripRadar from '@/components/GripRadar'

// Preview de design para Rodrigo revisar o layout público antes de decidir o
// resto da estratégia de grips (publicação, cross-sell, affiliate_url). Por
// decisão explícita dele:
// - busca ignora `publicada` (mostra o grip independente do valor) — NÃO
//   generalizar esse comportamento pra nenhuma outra página.
// - usa getSupabaseAdmin() porque `grips` não tem nenhuma policy/grant
//   público ainda; é a única forma de ler o dado aqui sem abrir RLS.
// - noindex/nofollow, fora do sitemap, sem link de nenhum lugar do site —
//   só é alcançável por quem tem a URL exata.
// - sem CTA de compra real (sem affiliate_url ainda) — botão fica desabilitado.

type GripDetail = {
  id: number
  name: string
  slug: string
  material: string | null
  espessura_mm: number | null
  comprimento_cm: number | null
  largura_cm: number | null
  tipo: string | null
  embalagem_unidades: number | null
  embalagem_formato: string | null
  image_url: string | null
  specs_extra: Record<string, unknown> | null
  brand: { name: string; logo_url: string | null } | null
}

async function getGripBySlug(slug: string): Promise<GripDetail | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('grips')
    .select(`
      id, name, slug, material, espessura_mm, comprimento_cm, largura_cm, tipo,
      embalagem_unidades, embalagem_formato, image_url, specs_extra,
      brand:brands(name, logo_url)
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) return null

  const raw = data as Record<string, unknown>
  return {
    ...(raw as Omit<GripDetail, 'brand'>),
    brand: Array.isArray(raw.brand) ? ((raw.brand[0] as GripDetail['brand']) ?? null) : (raw.brand as GripDetail['brand']),
  }
}

function cap(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

const TIPO_LABEL: Record<string, string> = {
  tacky: 'Tacky (aderente)',
  dry: 'Dry (seco)',
  texturizado: 'Texturizado',
}

// Radar "Perfil estimado" — NÃO é o motor (calcularMotor() não existe pra
// grips, decisão já tomada de não construir um). É uma fórmula fixa e
// documentada com só 2 inputs reais (tipo, espessura_mm), sem usar material
// como input numérico (não temos coeficiente real de absorção/conforto por
// material — usar isso seria inventar dado). Só calcula/mostra quando os 2
// inputs existem; nunca estima o que falta.
const ADERENCIA_BY_TIPO: Record<string, number> = { tacky: 9, texturizado: 6, dry: 4 }
const ABSORCAO_BY_TIPO:  Record<string, number> = { tacky: 4, texturizado: 7, dry: 9 }

function confortoFromEspessura(espessuraMm: number): number {
  const raw = 1 + ((espessuraMm - 0.4) / 0.6) * 9
  return Math.round(Math.min(10, Math.max(1, raw)))
}

function buildRadarScores(grip: GripDetail): { aderencia: number; absorcao: number; conforto: number } | null {
  if (!grip.tipo || grip.espessura_mm == null) return null
  const aderencia = ADERENCIA_BY_TIPO[grip.tipo]
  const absorcao = ABSORCAO_BY_TIPO[grip.tipo]
  if (aderencia == null || absorcao == null) return null
  return { aderencia, absorcao, conforto: confortoFromEspessura(grip.espessura_mm) }
}

interface SpecRow { label: string; value: string }

function buildSpecRows(grip: GripDetail): SpecRow[] {
  const extra = (grip.specs_extra ?? {}) as Record<string, unknown>
  const superficie = extra.superficie as string | undefined

  return ([
    grip.material                              ? { label: 'Material',    value: cap(grip.material) } : null,
    grip.tipo                                  ? { label: 'Tipo',        value: TIPO_LABEL[grip.tipo] ?? cap(grip.tipo) } : null,
    grip.espessura_mm != null                  ? { label: 'Espessura',   value: `${grip.espessura_mm}mm` } : null,
    (grip.comprimento_cm || grip.largura_cm)   ? { label: 'Dimensões',   value: `${grip.comprimento_cm ?? '?'} × ${grip.largura_cm ?? '?'} cm` } : null,
    (grip.embalagem_unidades || grip.embalagem_formato) ? {
      label: 'Embalagem',
      value: `${grip.embalagem_unidades ?? '?'} unidade${grip.embalagem_unidades === 1 ? '' : 's'}${grip.embalagem_formato ? ` (${grip.embalagem_formato})` : ''}`,
    } : null,
    superficie                                 ? { label: 'Superfície',  value: cap(superficie) } : null,
  ] as (SpecRow | null)[]).filter((r): r is SpecRow => r !== null)
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const grip = await getGripBySlug(slug)
  if (!grip) return { robots: { index: false, follow: false } }

  const displayName = getGripDisplayName({ name: grip.name, brandName: grip.brand?.name })

  return {
    title: `${displayName} (preview)`,
    robots: { index: false, follow: false },
  }
}

export default async function GripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const grip = await getGripBySlug(slug)
  if (!grip) notFound()

  const displayName = getGripDisplayName({ name: grip.name, brandName: grip.brand?.name })
  const specRows = buildSpecRows(grip)
  const radarScores = buildRadarScores(grip)

  return (
    <div className="min-h-screen sand-texture">
      <SiteNav useHistory fallbackHref="/" maxWidth="max-w-7xl" />

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">

        {/* Layout: coluna única mobile, 2 colunas desktop (imagem sticky + conteúdo) — mesmo padrão de /raquetes/[slug] */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:items-start">

          {/* ── Coluna esquerda: imagem ──
              Overgrip é um acessório pequeno, não uma raquete — o tile de
              800x1020 herdado de /raquetes/[slug] (pensado pra foto grande de
              raquete) ficava desproporcionalmente enorme aqui. Largura
              limitada (não estica até preencher a coluna) resolve. */}
          <div className="lg:sticky lg:top-20">
            <div className="max-w-[240px] md:max-w-[280px] mx-auto lg:mx-0">
              {grip.image_url ? (
                <div className="rounded-2xl overflow-hidden shadow-card border border-[rgba(14,58,64,0.06)]">
                  <RacketImageTile
                    src={grip.image_url}
                    alt={displayName}
                    brandLogo={grip.brand?.logo_url}
                    brandName={grip.brand?.name}
                    badgeSize="detail"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 flex items-center justify-center shadow-card border border-[rgba(14,58,64,0.06)] aspect-[800/1020]">
                  <span className="text-xs text-tinta/30 text-center">{displayName}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Coluna direita: conteúdo ── */}
          <div className="flex flex-col gap-5">

            <div className="flex flex-col gap-2">
              <h1 className="text-2xl md:text-3xl font-bold text-tinta leading-tight">{displayName}</h1>
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full w-fit">
                Preview de layout — não publicado
              </span>
            </div>

            {/* CTA — desabilitado, sem affiliate_url ainda */}
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-semibold text-base py-4 rounded-2xl text-center block cursor-not-allowed"
            >
              Em breve
            </button>

            {/* Perfil estimado — radar de 3 eixos, ver buildRadarScores acima */}
            {radarScores && (
              <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)] flex flex-col gap-1">
                <p className="text-tinta font-semibold text-sm">Perfil estimado</p>
                <p className="text-tinta/40 text-xs">
                  Estimativa a partir do tipo e da espessura — não é medição de laboratório.
                </p>
                <GripRadar {...radarScores} />
              </div>
            )}

            {/* Especificações */}
            {specRows.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-card border border-[rgba(14,58,64,0.06)]">
                <p className="text-tinta font-semibold text-sm mb-3">Especificações</p>
                {specRows.map(({ label, value }, i) => (
                  <div
                    key={label}
                    className={`flex justify-between items-center py-2 ${i === specRows.length - 1 ? 'border-0' : 'border-b border-aqua/10'}`}
                  >
                    <span className="text-tinta/60 text-sm">{label}</span>
                    <span className="text-tinta text-sm font-medium text-right ml-4">{value}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
