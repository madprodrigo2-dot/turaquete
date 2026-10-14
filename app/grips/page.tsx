import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getGripDisplayName } from '@/lib/displayName'
import SiteNav from '@/components/SiteNav'
import RacketImageTile from '@/components/RacketImageTile'

// Preview de design — listagem pública de grips. Mesmas regras explícitas de
// /grips/[slug] (ver comentário lá): ignora `publicada`, usa getSupabaseAdmin()
// porque `grips` não tem policy/grant público ainda, noindex/nofollow, fora
// do sitemap, sem link de nenhum lugar do site.

export const metadata: Metadata = {
  title: 'Grips (preview)',
  robots: { index: false, follow: false },
}

type GripListItem = {
  id: number
  name: string
  slug: string
  image_url: string | null
  material: string | null
  tipo: string | null
  comprimento_cm: number | null
  largura_cm: number | null
  embalagem_unidades: number | null
  brand: { name: string; logo_url: string | null } | null
}

const TIPO_LABEL: Record<string, string> = {
  tacky: 'Tacky',
  dry: 'Dry',
  texturizado: 'Texturizado',
}

function cap(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

function buildSpecLine(grip: GripListItem): string | null {
  const parts: string[] = []
  if (grip.material) parts.push(cap(grip.material))
  if (grip.tipo) parts.push(TIPO_LABEL[grip.tipo] ?? cap(grip.tipo))
  if (parts.length === 0 && (grip.comprimento_cm || grip.largura_cm)) {
    parts.push(`${grip.comprimento_cm ?? '?'} × ${grip.largura_cm ?? '?'} cm`)
  }
  if (parts.length === 0 && grip.embalagem_unidades) {
    parts.push(`${grip.embalagem_unidades} unidades`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

async function listarGrips(): Promise<GripListItem[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('grips')
    .select(`
      id, name, slug, image_url, material, tipo,
      comprimento_cm, largura_cm, embalagem_unidades,
      brand:brands(name, logo_url)
    `)
    .order('id')

  if (error) {
    console.error('[grips] query error:', error.message)
    return []
  }

  return ((data ?? []) as unknown as Array<Omit<GripListItem, 'brand'> & { brand: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null }>).map(g => ({
    ...g,
    brand: Array.isArray(g.brand) ? (g.brand[0] ?? null) : g.brand,
  }))
}

function GripGridCard({ grip }: { grip: GripListItem }) {
  const displayName = getGripDisplayName({ name: grip.name, brandName: grip.brand?.name })
  const specLine = buildSpecLine(grip)

  return (
    <Link
      href={`/grips/${grip.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-aqua/20 shadow-sm hover:shadow-md hover:border-aqua/40 transition-all flex flex-col"
    >
      <RacketImageTile
        src={grip.image_url}
        alt={displayName}
        brandLogo={grip.brand?.logo_url}
        brandName={grip.brand?.name}
        hoverScale
      />
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2 min-h-[33px]">{displayName}</p>
        {specLine && (
          <p className="text-tinta/50 text-[10.5px] leading-snug">{specLine}</p>
        )}
      </div>
    </Link>
  )
}

export default async function GripsIndexPage() {
  const grips = await listarGrips()

  return (
    <div className="min-h-screen sand-texture">
      <SiteNav maxWidth="max-w-7xl" />

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8 flex flex-col gap-6">

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta leading-tight">Grips</h1>
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full w-fit">
            Preview de layout — não publicado
          </span>
          <p className="text-tinta/40 text-xs">
            {grips.length} {grips.length === 1 ? 'grip carregado' : 'grips carregados'}
          </p>
        </div>

        {grips.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {grips.map(g => (
              <GripGridCard key={g.id} grip={g} />
            ))}
          </div>
        ) : (
          <p className="text-tinta/50 text-sm">Nenhum grip carregado ainda.</p>
        )}

      </div>
    </div>
  )
}
