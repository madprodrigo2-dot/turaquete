import Link from 'next/link'
import Image from 'next/image'
import { Star } from '@phosphor-icons/react/dist/ssr'
import type { RacketWithInsights } from '@/lib/recommend'
import { getDisplayName } from '@/lib/displayName'
import DiscoveryRacketCard from './DiscoveryRacketCard'

interface Props {
  rackets: RacketWithInsights[]
  title: string
  subtitle: string
}

// Seção fixa acima da grade completa (DiscoveryFilters) nas páginas de nível —
// resolve a queixa do Rodrigo de que "as melhores se perdem entre as demais".
// V3 (2026-10-29): fundo com o token --color-gold/--color-gold-deep (tom
// "Âmbar Coral" — formalizado em app/globals.css a meio caminho entre
// --color-yellow e --color-coral, pra não introduzir um dourado desconectado
// da paleta). A ordem de `rackets` ainda define quem aparece e em que posição,
// mas é só lógica interna — Rodrigo decidiu não expor 1º/2º/3º pro usuário
// (testamos medalha, fita e numeral gigante; nenhum convenceu), por isso
// nenhuma das 3 é individualizada visualmente.
// V4 (2026-10-29): no mobile, o card vertical cheio (mesmo da grade abaixo)
// ocupava 585px — 72% de uma tela de 812px, só 1 raquete inteira visível.
// Trocado por linhas horizontais compactas (miniatura + nome + preço, sem
// carrossel) — 306px, as 3 cabem sem scroll. Desktop mantém a grade normal
// com DiscoveryRacketCard, intocada.
// V5 (2026-10-29): getTopRaquetasPorNivel() agora corta raquetes com mais de
// ~2 anos de lançamento (model_year null também fica de fora). Com isso
// `rackets` pode chegar aqui com 1 ou 2 itens em vez de sempre 3 — sem
// completar com raquete mais velha só pra fechar o número. Por isso o pill
// virou "Mais recomendadas" genérico em vez de "Top 3" fixo: não fica
// estranho se um nível tiver só 1-2 elegíveis num dado momento.
export default function TopPicksSection({ rackets, title, subtitle }: Props) {
  if (rackets.length === 0) return null

  return (
    <div className="flex flex-col gap-3 bg-gradient-to-br from-gold to-gold-deep border border-black/15 rounded-2xl p-4 md:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
      {/* Header — Tury como curadora, selo dourado "Top 3" */}
      <div className="flex items-center gap-3">
        <Image
          src="/tury-transparente-explicando.png"
          alt="Tury"
          width={443}
          height={563}
          className="h-14 md:h-16 w-auto object-contain shrink-0"
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="inline-flex items-center gap-1 self-start text-[9px] font-bold uppercase tracking-wider text-tinta bg-gold-light rounded-full px-2 py-0.5 w-fit">
            <Star size={10} weight="fill" aria-hidden="true" />
            Mais recomendadas
          </span>
          <p className="font-heading font-bold text-white text-sm md:text-base leading-tight mt-0.5">{title}</p>
          <p className="text-white/70 text-xs">{subtitle}</p>
        </div>
      </div>

      {/* Mobile: linhas horizontais compactas (miniatura + nome + preço), sem
          carrossel — as 3 cabem na tela sem scroll. Desktop: grade normal,
          mesmo card da grade abaixo. */}
      <div className="flex flex-col gap-2 md:hidden">
        {rackets.map(r => {
          const price = r.price
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(r.price)
            : null
          return (
            <Link
              key={r.id}
              href={`/raquetes/${r.slug}`}
              className="flex items-center gap-3 bg-white rounded-xl p-2 shadow-sm"
            >
              <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-white">
                {r.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_url} alt={r.name} loading="lazy" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-tinta text-xs font-semibold leading-snug line-clamp-1">{getDisplayName(r)}</p>
                {price && <p className="text-coral font-bold text-sm mt-0.5">{price}</p>}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {rackets.map(r => (
          <DiscoveryRacketCard key={r.id} racket={r} />
        ))}
      </div>
    </div>
  )
}
