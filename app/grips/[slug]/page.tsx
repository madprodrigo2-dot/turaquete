import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'
import SiteNav from '@/components/SiteNav'
import RacketImageTile from '@/components/RacketImageTile'

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

  const displayName = grip.brand?.name ? `${grip.brand.name} ${grip.name}` : grip.name

  return {
    title: `${displayName} (preview)`,
    robots: { index: false, follow: false },
  }
}

export default async function GripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const grip = await getGripBySlug(slug)
  if (!grip) notFound()

  const displayName = grip.brand?.name ? `${grip.brand.name} ${grip.name}` : grip.name
  const specRows = buildSpecRows(grip)

  return (
    <div className="min-h-screen sand-texture">
      <SiteNav useHistory fallbackHref="/" maxWidth="max-w-7xl" />

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">

        {/* Layout: coluna única mobile, 2 colunas desktop (imagem sticky + conteúdo) — mesmo padrão de /raquetes/[slug] */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:items-start">

          {/* ── Coluna esquerda: imagem sticky ── */}
          <div className="lg:sticky lg:top-20">
            {grip.image_url ? (
              <>
                <div className="lg:hidden bg-white rounded-2xl p-6 flex items-center justify-center shadow-card border border-[rgba(14,58,64,0.06)] min-h-[220px]">
                  <div className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={grip.image_url}
                      alt={displayName}
                      className="object-contain max-h-72 w-auto"
                    />
                  </div>
                </div>
                <div className="hidden lg:block rounded-2xl overflow-hidden shadow-card border border-[rgba(14,58,64,0.06)]">
                  <RacketImageTile
                    src={grip.image_url}
                    alt={displayName}
                    brandLogo={grip.brand?.logo_url}
                    brandName={grip.brand?.name}
                    badgeSize="detail"
                    loading="eager"
                  />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl p-6 flex items-center justify-center shadow-card border border-[rgba(14,58,64,0.06)] min-h-[220px]">
                <span className="text-xs text-tinta/30">{displayName}</span>
              </div>
            )}
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
