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
  // 'detail' = product-detail hero (bigger photo) — all 3 chips scale up a
  // notch to stay legible there, same shape/position as 'card' otherwise.
  size?: 'card' | 'detail'
  // The chat recommendation card already stacks up to 3 badges ('Calce ideal',
  // 'Melhor custo-benefício', 'Peso alto de fábrica') in the top-right corner.
  // That caller passes 'left' so the brand logo lands in the free corner.
  brandCorner?: 'left' | 'right'
  // "9+ num atributo" badge (top-left) — passado pelos callers aprovados (home
  // carousels, /marcas/[slug], listagens de categoria, ficha de detalhe).
  // Deixar undefined em chat e comparador: o chat já empilha até 3 badges no
  // canto superior direito, e nenhum dos dois pediu esse badge ainda.
  topBadges?: AttributeBadge[]
}

// Atleta, marca e atributo-top: 3 chips separados overlaid numa foto de
// raquete — atributo e marca em cima (cantos opostos), atleta embaixo
// (left-2 right-2, ambas as bordas fixas). Já tentamos 2 variações aqui:
// (1) atleta como pill largo/rounded-full embaixo — Rodrigo achou que as 3
// formas/pesos competindo ficava desprolixo; (2) marca+atleta mesclados num
// cartão único no canto — resolvia a inconsistência visual mas o cartão só
// tinha a borda direita fixa, então crescia livre pra esquerda com nomes
// como "André Baran" até invadir a própria foto da raquete (bug real, visto
// em produção). A versão atual resolve as duas coisas: os 3 chips têm o
// mesmo tratamento pequeno (rounded-md, mesma altura/fonte), e o pill do
// atleta tem as DUAS bordas fixas (left-2 right-2) — trunca com "…" dentro
// desse espaço, nunca cresce pra fora dele, não importa o tamanho do nome.
// Single source of truth — card tiles (via RacketImageTile) e o hero da
// ficha de detalhe usam o mesmo componente. Caller's image wrapper must be
// `relative` (and ideally `overflow-hidden`).
export default function RacketBadgeOverlay({ athlete, brandLogo, brandName, size = 'card', brandCorner = 'right', topBadges }: Props) {
  const isDetail = size === 'detail'
  const cornerCls = brandCorner === 'left' ? 'left-1.5' : 'right-1.5'
  const chipCls = isDetail ? 'h-6 text-xs px-2' : 'h-5 text-[10px] px-1.5'

  return (
    <>
      {topBadges && topBadges.length > 0 && (
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col items-start gap-1">
          {topBadges.map(b => (
            <span
              key={b.label}
              className={`inline-flex items-center gap-1 rounded-md bg-gold-deep text-white font-bold leading-none shadow-sm whitespace-nowrap ${chipCls}`}
            >
              <span aria-hidden="true">★</span>{b.label} {b.value}
            </span>
          ))}
        </div>
      )}
      {brandLogo && (
        <div className={`absolute top-1.5 ${cornerCls} z-10 flex items-center justify-center rounded-md bg-white/70 border border-tinta/10 px-1.5 ${isDetail ? 'h-6' : 'h-5 lg:h-6'}`}>
          <BrandLogo src={brandLogo} alt={brandName ?? ''} />
        </div>
      )}
      {athlete && (
        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex justify-start">
          <span className={`inline-flex items-center gap-1 rounded-md bg-tinta text-white font-bold leading-none shadow-sm max-w-full ${chipCls}`}>
            <span className="text-yellow shrink-0" aria-hidden="true">★</span>
            <span className="truncate">{cleanAthleteLabel(athlete)}</span>
          </span>
        </div>
      )}
    </>
  )
}
