import type { RacketWithInsights } from '@/lib/recommend'
import PdpRadar from './PdpRadar'
import { buildSpecRows } from '@/components/SpecsGrid'
import {
  destaques, saidaDeBolaCopy, sweetSpotCardCopy, confortoCardCopy, isSuperficieLisa, dimensoesStats,
} from '@/lib/pdpCopy'
import { TOM_CHIP, CARD } from './tom'
import { nivelRange } from '@/lib/nivelRange'
import type { DestaqueLinha } from '@/lib/pdpCopy'

// Hexágono + 3 cartões de comportamento em quadra (texto sempre visível) no
// lugar das 6 barras, que repetiam o que o hexágono já mostra. Nada some: os 6
// valores continuam nos vértices do hexágono, as dimensões que os cartões não
// nomeiam viram uma linha em palavras no cartão de perfil, e o detalhe técnico
// completo fica no "Como ler este gráfico".

function Tira({ tom, titulo, itens }: { tom: 'brilha' | 'abre'; titulo: string; itens: DestaqueLinha[] }) {
  const cls = tom === 'brilha'
    ? 'border-aqua/30 bg-aqua/[0.07]'
    : 'border-coral/25 bg-coral/[0.05]'
  const cor = tom === 'brilha' ? 'text-[#058583]' : 'text-coral'
  return (
    <p className={`rounded-xl border ${cls} px-3.5 py-2.5 text-sm leading-snug text-tinta`}>
      <span className={`font-bold ${cor}`}>{titulo}:</span>{' '}
      {itens.map((l, i) => (
        <span key={l.key}>
          {i > 0 && <span className="text-tinta/60 font-bold"> · </span>}
          <span className="font-semibold">{l.label} {l.value}</span>
          {l.nota && <span className="text-tinta/60"> ({l.nota})</span>}
        </span>
      ))}
    </p>
  )
}

export default function PdpComportamento({
  racket, tratamentoFabrica,
}: { racket: RacketWithInsights; tratamentoFabrica?: boolean | null }) {
  const ins = racket.racket_insights
  if (!ins || (ins.power === null && ins.control === null)) return null

  const superficie = buildSpecRows(racket).find(r => r.label === 'Superfície')?.value
  const spinLisa = isSuperficieLisa(superficie, tratamentoFabrica)
  const stats = dimensoesStats(ins, spinLisa)
  const dest = destaques(stats, spinLisa)
  const nr = nivelRange(racket)
  const soAvancado = !!nr && nr.fit.iniciante === 'fora' && nr.fit.intermediario === 'fora'
  const saida = saidaDeBolaCopy(ins, soAvancado)
  const sweet = sweetSpotCardCopy(ins.forgiveness)
  const conforto = confortoCardCopy(ins.comfort)

  return (
    <section aria-label="Como ela joga" className={`${CARD} p-5 flex flex-col gap-4`}>
      <p className="text-tinta font-semibold text-sm">Como ela joga</p>

      {/* Bloco 1: hexágono + resumo em tiras de chips */}
      <div className="flex flex-col gap-2">
        <PdpRadar stats={stats} />
        {dest.brilha.length > 0 && (
          <Tira tom="brilha" titulo="✓ Onde brilha" itens={dest.brilha} />
        )}
        {dest.abreMao.length > 0 && (
          <Tira tom="abre" titulo="! O que abre mão" itens={dest.abreMao} />
        )}
      </div>

      {/* Bloco 2: 3 cartões homogêneos */}
      <div className="flex flex-col gap-2 border-t border-tinta/10 pt-4">
        <p className="text-[10px] uppercase tracking-wide text-tinta/45 font-semibold">Na prática</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { rotulo: 'Saída de bola', c: saida },
            { rotulo: 'Sweet spot', c: sweet },
            { rotulo: 'Conforto no braço', c: conforto },
          ].filter(x => x.c).map(({ rotulo, c }) => (
            <div key={rotulo} className="rounded-xl border border-[rgba(14,58,64,0.08)] bg-[#FBF6EF] px-3.5 py-3 flex flex-col items-start gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-tinta/45 font-semibold">{rotulo}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl leading-snug ${TOM_CHIP[c!.tom]}`}>
                {c!.titulo}
                {c!.nota && <span className="font-normal opacity-80"> ({c!.nota})</span>}
              </span>
              <p className="text-tinta/80 text-xs leading-snug">{c!.texto}</p>
            </div>
          ))}
        </div>
      </div>

      <details className="group text-xs text-tinta/60">
        <summary className="cursor-pointer select-none list-none inline-flex items-center gap-1.5 text-tinta/50 hover:text-tinta/80 transition-colors">
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span>
          Como ler este gráfico
        </summary>
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-[#FBF6EF] border border-[rgba(14,58,64,0.06)] px-4 py-3">
          <p className="leading-relaxed">
            Cada ponta é uma característica de 0 a 10; quanto mais afastado do centro, maior a nota.
            Notas 9 ou mais ganham ★ dourada. Toque numa ponta para ver o que ela mede.
          </p>
          <dl className="flex flex-col gap-2">
            {stats.map(d => (
              <div key={d.key} className="flex gap-2">
                <dt className="shrink-0 w-24 font-semibold text-tinta/80">
                  {d.label}{d.value != null ? ` ${d.value}` : ''}
                </dt>
                <dd className="leading-relaxed">{d.desc}</dd>
              </div>
            ))}
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
