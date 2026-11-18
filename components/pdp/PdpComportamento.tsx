import type { RacketWithInsights } from '@/lib/recommend'
import RacketHexagon from '@/components/RacketHexagon'
import { GLOSSARIO } from '@/lib/glossario'
import { buildSpecRows } from '@/components/SpecsGrid'
import {
  perfilPrincipal, outrasDimensoes, saidaDeBolaCopy, sweetSpotCardCopy, isSuperficieLisa,
} from '@/lib/pdpCopy'
import { TOM_CHIP, CARD } from './tom'

// Hexágono + 3 cartões de comportamento em quadra (texto sempre visível) no
// lugar das 6 barras, que repetiam o que o hexágono já mostra. Nada some: os 6
// valores continuam nos vértices do hexágono, as dimensões que os cartões não
// nomeiam viram uma linha em palavras no cartão de perfil, e o detalhe técnico
// completo fica no "Como ler este gráfico".

const DIMS: { termo: string; label: string; key: 'power' | 'control' | 'comfort' | 'maneuverability' | 'spin' | 'stability' }[] = [
  { termo: 'potência', label: 'Potência', key: 'power' },
  { termo: 'controle', label: 'Controle', key: 'control' },
  { termo: 'conforto', label: 'Conforto', key: 'comfort' },
  { termo: 'manuseio', label: 'Manuseio', key: 'maneuverability' },
  { termo: 'spin', label: 'Spin', key: 'spin' },
  { termo: 'estabilidade', label: 'Estabilidade', key: 'stability' },
]

export default function PdpComportamento({
  racket, tratamentoFabrica,
}: { racket: RacketWithInsights; tratamentoFabrica?: boolean | null }) {
  const ins = racket.racket_insights
  if (!ins || (ins.power === null && ins.control === null)) return null

  const superficie = buildSpecRows(racket).find(r => r.label === 'Superfície')?.value
  const spinLisa = isSuperficieLisa(superficie, tratamentoFabrica)
  const perfil = perfilPrincipal(ins)
  const outras = outrasDimensoes(ins, spinLisa)
  const saida = saidaDeBolaCopy(ins)
  const sweet = sweetSpotCardCopy(ins.forgiveness)

  return (
    <section aria-label="Como ela joga" className={`${CARD} p-5 flex flex-col gap-4`}>
      <p className="text-tinta font-semibold text-sm">Como ela joga</p>

      <RacketHexagon racket={racket} />

      <div className="flex flex-col gap-2.5">
        {perfil && (
          <div className="rounded-xl border border-aqua/30 bg-aqua/[0.07] px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-aqua font-semibold">Perfil principal</span>
            <p className="text-tinta font-bold text-base leading-snug">{perfil.titulo}</p>
            <p className="text-tinta/70 text-xs leading-relaxed">{perfil.texto}</p>
            {outras.length > 0 && (
              <p className="text-tinta/55 text-xs leading-relaxed mt-0.5">
                Também: {outras.join(' · ')}.
              </p>
            )}
          </div>
        )}

        {saida && (
          <div className="rounded-xl border border-[rgba(14,58,64,0.08)] bg-[#FBF6EF] px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-tinta/45 font-semibold">Saída de bola</span>
            <p className="text-tinta text-sm leading-snug">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-1.5 ${TOM_CHIP[saida.tom]}`}>{saida.titulo}</span>
              {saida.texto}
            </p>
          </div>
        )}

        {sweet && (
          <div className="rounded-xl border border-[rgba(14,58,64,0.08)] bg-[#FBF6EF] px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-tinta/45 font-semibold">Sweet spot</span>
            <p className="text-tinta text-sm leading-snug">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-1.5 ${TOM_CHIP[sweet.tom]}`}>{sweet.titulo}</span>
              {sweet.texto}
            </p>
          </div>
        )}
      </div>

      <details className="group text-xs text-tinta/60">
        <summary className="cursor-pointer select-none list-none inline-flex items-center gap-1.5 text-tinta/50 hover:text-tinta/80 transition-colors">
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span>
          Como ler este gráfico
        </summary>
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-[#FBF6EF] border border-[rgba(14,58,64,0.06)] px-4 py-3">
          <p className="leading-relaxed">
            Cada ponta é uma característica de 0 a 10; quanto mais afastado do centro, maior a nota.
            Notas 9 ou mais ganham ★ dourada.
          </p>
          <dl className="flex flex-col gap-2">
            {DIMS.map(d => {
              const def = GLOSSARIO.find(e => e.termo === d.termo)?.definicao
              const v = ins[d.key]
              return (
                <div key={d.key} className="flex gap-2">
                  <dt className="shrink-0 w-24 font-semibold text-tinta/80">
                    {d.label}{v != null ? ` ${v}` : ''}
                  </dt>
                  <dd className="leading-relaxed">
                    {def}
                    {d.key === 'spin' && spinLisa && ' Superfície lisa de fábrica: dá pra aumentar com tratamento aplicado depois.'}
                  </dd>
                </div>
              )
            })}
          </dl>
          <p className="leading-relaxed">
            Potência mede o teto da raquete com batida rápida e técnica. Saída de bola mostra o quanto
            ela rende com batida mais suave.
          </p>
        </div>
      </details>
    </section>
  )
}
