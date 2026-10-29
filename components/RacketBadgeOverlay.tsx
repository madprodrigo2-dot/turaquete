import BrandLogo from './BrandLogo'
import type { AttributeBadge } from '@/lib/attributeBadge'

// Multi-athlete strings use '&' or '/' as separators, and any single name can
// carry a parenthetical aside not meant for display (e.g. "Edição Ayrton Senna
// (embaixador: Mattia Spoto)"). Same cleanup AthleteBadge.tsx used to do per
// pill — needed here too since this badge renders the joined string directly.
function cleanAthleteLabel(raw: string): string {
  return raw
    .split(/[&/]/)
    .map(name => name.trim())
    .filter(Boolean)
    .map(name => (name.includes('(') ? name.split('(')[0].trim() : name))
    .join(' & ')
}

interface Props {
  athlete?: string
  brandLogo?: string | null
  brandName?: string
  // 'detail' = product-detail hero (bigger photo): brand+athlete merge into one
  // card (see below) since there's room for it. 'card' = narrow grid tiles
  // (down to 2-col mobile) — merging there made the brand+athlete card collide
  // with the attribute badge in the opposite corner, so 'card' keeps the older
  // layout: logo alone up top, athlete as its own pill along the bottom edge.
  size?: 'card' | 'detail'
  // The chat recommendation card already stacks up to 3 badges ('Calce ideal',
  // 'Melhor custo-benefício', 'Peso alto de fábrica') in the top-right corner.
  // That caller passes 'left' so the brand logo (and, in 'detail', the merged
  // brand+athlete card) lands in the free corner instead.
  brandCorner?: 'left' | 'right'
  // "9+ num atributo" badge (top-left) — passado pelos callers aprovados (home
  // carousels, /marcas/[slug], listagens de categoria, ficha de detalhe).
  // Deixar undefined em chat e comparador: o chat já empilha até 3 badges no
  // canto superior direito, e nenhum dos dois pediu esse badge ainda.
  topBadges?: AttributeBadge[]
}

// Atleta, marca e atributo-top overlaid numa foto de raquete. Em 'detail', o
// atleta já foi um pill solto embaixo da foto (rounded-full, fonte grande) —
// Rodrigo notou que 3 formas/pesos competindo (pill de atributo, pill da
// marca, faixa larga do atleta) ficava desprolixo ali. Na ficha de detalhe,
// com foto grande, o atleta virou uma linha secundária dentro do cartão da
// marca: só 2 formas, rodapé livre, hierarquia mais clara. Em 'card' (grid
// estreita) esse merge colidia com o badge de atributo, então ali o layout
// original se mantém. Single source of truth — card tiles (via
// RacketImageTile) e o hero da ficha de detalhe usam o mesmo componente.
// Caller's image wrapper must be `relative` (and ideally `overflow-hidden`).
export default function RacketBadgeOverlay({ athlete, brandLogo, brandName, size = 'card', brandCorner = 'right', topBadges }: Props) {
  const isDetail = size === 'detail'
  const cornerCls = brandCorner === 'left' ? 'left-1.5' : 'right-1.5'
  // Co-signed athletes and unusually long names truncate to one line with an
  // ellipsis rather than wrapping.
  const athletePill = 'text-[11px] px-2.5 py-1 md:text-xs md:px-3 md:py-1.5'

  return (
    <>
      {topBadges && topBadges.length > 0 && (
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col items-start gap-1">
          {topBadges.map(b => (
            <span
              key={b.label}
              className={`inline-flex items-center gap-1 rounded-md bg-gold-deep text-white font-bold leading-none shadow-sm whitespace-nowrap ${isDetail ? 'h-6 text-xs px-2' : 'h-5 text-[10px] px-1.5'}`}
            >
              <span aria-hidden="true">★</span>{b.label} {b.value}
            </span>
          ))}
        </div>
      )}

      {isDetail ? (
        (brandLogo || athlete) && (
          <div className={`absolute top-1.5 ${cornerCls} z-10 flex flex-col items-end gap-1 rounded-md bg-white/85 border border-tinta/10 max-w-[65%] px-2 py-1.5`}>
            {brandLogo && (
              <div className="h-6 flex items-center justify-center">
                <BrandLogo src={brandLogo} alt={brandName ?? ''} />
              </div>
            )}
            {athlete && (
              <span className="inline-flex items-center gap-1 text-tinta text-[11px] font-bold leading-none truncate max-w-full">
                <span className="text-gold-deep shrink-0" aria-hidden="true">★</span>
                <span className="truncate">{cleanAthleteLabel(athlete)}</span>
              </span>
            )}
          </div>
        )
      ) : (
        <>
          {brandLogo && (
            <div className={`absolute top-1.5 ${cornerCls} z-10 h-5 lg:h-6 flex items-center justify-center rounded-md bg-white/70 border border-tinta/10 px-1.5`}>
              <BrandLogo src={brandLogo} alt={brandName ?? ''} />
            </div>
          )}
          {athlete && (
            <div className="absolute bottom-2 left-2 right-2 z-10 flex justify-start">
              <span className={`inline-flex items-center gap-1.5 max-w-full rounded-full bg-tinta text-white shadow-md font-bold leading-tight ${athletePill}`}>
                <span className="text-yellow shrink-0" aria-hidden="true">★</span>
                <span className="truncate">{cleanAthleteLabel(athlete)}</span>
              </span>
            </div>
          )}
        </>
      )}
    </>
  )
}
