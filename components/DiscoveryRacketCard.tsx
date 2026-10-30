import Link from 'next/link'
import type { RacketWithInsights } from '@/lib/recommend'
import { getDisplayName } from '@/lib/displayName'
import RacketImageTile from './RacketImageTile'
import { derivarNivel } from '@/lib/nivel'
import { getTopAttributeBadges } from '@/lib/attributeBadge'

const NIVEL_SHORT: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

// Specs duras — núcleo · espessura · material da face. Só o que já existe no
// banco, mesma lógica de app/marcas/[slug]/page.tsx (buildSpecLine).
function buildSpecLine(racket: RacketWithInsights): string | null {
  const parts: string[] = []
  if (racket.core) parts.push(racket.core)
  const esp = (racket.specs_extra as Record<string, unknown> | null)?.espessura_mm
  if (typeof esp === 'number') parts.push(`${esp}mm`)
  if (racket.face_material) parts.push(racket.face_material)
  return parts.length > 0 ? parts.join(' · ') : null
}

// Card compacto usado nas grades de listagem por categoria (DiscoveryFilters)
// e na seção "Top 3" por nível (TopPicksSection) — mesmo visual nos dois
// lugares de propósito, pra não criar um segundo estilo de card na mesma página.
interface Props {
  racket: RacketWithInsights
  // IDs do Top Pick ativo do nível/conforto (ver app/api/top-picks e
  // lib/recommend.ts) — undefined na grade dentro do próprio TopPicksSection
  // de propósito: aquele card já vive dentro da caixa dourada, um 2º contorno
  // dourado ali seria redundante/pouco legível sobre o próprio fundo dourado.
  topPickIds?: number[]
}

export default function DiscoveryRacketCard({ racket, topPickIds }: Props) {
  const price = racket.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(racket.price)
    : null
  const _athleteRaw = (racket.specs_extra as Record<string, unknown> | null)?.atleta
  const athlete: string | undefined = Array.isArray(_athleteRaw)
    ? (_athleteRaw as string[]).filter(Boolean).join(' & ') || undefined
    : typeof _athleteRaw === 'string' ? _athleteRaw : undefined
  const nivel = derivarNivel(racket)
  const specLine = buildSpecLine(racket)
  const priceDropped = racket.price != null && racket.price_previous != null && racket.price < racket.price_previous
  const isTopPick = topPickIds?.includes(racket.id) ?? false

  return (
    <Link
      href={`/raquetes/${racket.slug}`}
      className={`group bg-white rounded-2xl overflow-hidden shadow-card hover:-translate-y-1 transition-all duration-200 flex flex-col ${isTopPick ? 'border-2 border-gold-deep' : 'border border-[rgba(14,58,64,0.06)] hover:border-aqua/30'}`}
    >
      <RacketImageTile src={racket.image_url} alt={racket.name} athlete={athlete} brandLogo={racket.brands?.logo_url} brandName={racket.brands?.name} hoverScale topBadges={getTopAttributeBadges(racket.racket_insights)} />
      <div className="p-3 flex flex-col gap-1 flex-1">
        {nivel && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-tinta/[0.06] text-tinta/50 w-fit leading-none">
            {NIVEL_SHORT[nivel] ?? nivel}
          </span>
        )}
        <p className="text-tinta text-xs font-semibold leading-snug line-clamp-2 min-h-[33px]">{getDisplayName(racket)}</p>
        {price && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-coral font-bold text-sm">{price}</p>
            {priceDropped && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 leading-none">
                Preço caiu
              </span>
            )}
          </div>
        )}
        {specLine && <p className="text-tinta/45 text-[10px] leading-snug">{specLine}</p>}
      </div>
    </Link>
  )
}
