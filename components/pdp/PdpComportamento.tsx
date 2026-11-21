import type { RacketWithInsights } from '@/lib/recommend'
import PdpRadar from './PdpRadar'
import { buildSpecRows } from '@/components/SpecsGrid'
import {
  destaques, saidaDeBolaCopy, sweetSpotCardCopy, confortoCardCopy, isSuperficieLisa, dimensoesStats,
} from '@/lib/pdpCopy'
import { CARD } from './tom'
import { nivelRange } from '@/lib/nivelRange'
import type { DestaqueLinha } from '@/lib/pdpCopy'

// Hexágono + 3 cartões de comportamento em quadra (texto sempre visível) no
// lugar das 6 barras, que repetiam o que o hexágono já mostra. Nada some: os 6
// valores continuam nos vértices do hexágono, as dimensões que os cartões não
// nomeiam viram uma linha em palavras no cartão de perfil, e o detalhe técnico
// completo fica no "Como ler este gráfico".

// Scorecard: cada item = quadrado de cor com a nota + nome + frase curta.
function Scorecard({ tom, titulo, itens }: { tom: 'brilha' | 'abre'; titulo: string; itens: DestaqueLinha[] }) {
  const brilha = tom === 'brilha'
  return (
    <div className={`rounded-xl border p-3 ${brilha ? 'border-aqua/25 bg-[#EAF7F6]' : 'border-tinta/10 bg-[#F4F5F5]'}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${brilha ? 'text-[#088F8D]' : 'text-tinta/60'}`}>{titulo}</p>
      <ul className="flex flex-col gap-2">
        {itens.map(l => (
          <li key={l.key} className="flex items-center gap-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px] leading-none font-extrabold ${
              brilha ? 'bg-aqua text-tinta' : 'bg-[#E4E7E7] text-tinta/75'
            }`}>{l.value}</span>
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-bold text-tinta">{l.label}</p>
              {l.nota && <p className="text-[11px] text-[#0E3A40]/80 truncate first-letter:uppercase">{l.nota}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Medidor de 3 segmentos: aqua até o nível (no nível 1, tinta apagada: coral é só do CTA), o resto apagado.
function Medidor({ nivel }: { nivel: 1 | 2 | 3 }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-full" role="img" aria-label={`Nível ${nivel} de 3`}>
      {[1, 2, 3].map(step => (
        <div
          key={step}
          className={`h-1.5 rounded-full ${step <= nivel ? (nivel === 1 ? 'bg-tinta/45' : 'bg-aqua') : 'bg-tinta/10'}`}
        />
      ))}
    </div>
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

      {/* Bloco 1: hexágono (com visor escuro) + scorecard de 2 colunas */}
      <div className="flex flex-col gap-3">
        <PdpRadar stats={stats} />
        {(dest.brilha.length > 0 || dest.abreMao.length > 0) && (
          <div className={`grid grid-cols-1 gap-2.5 ${dest.brilha.length > 0 && dest.abreMao.length > 0 ? 'sm:grid-cols-2' : ''}`}>
            {dest.brilha.length > 0 && <Scorecard tom="brilha" titulo="Onde brilha" itens={dest.brilha} />}
            {dest.abreMao.length > 0 && <Scorecard tom="abre" titulo="Abre mão de" itens={dest.abreMao} />}
          </div>
        )}
      </div>

      {/* Bloco 2: 3 medidores segmentados */}
      <div className="flex flex-col gap-2 border-t border-tinta/10 pt-4">
        <p className="text-[10px] uppercase tracking-wide text-tinta/45 font-semibold">Na prática</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { rotulo: 'Saída de bola', c: saida },
            { rotulo: 'Sweet spot', c: sweet },
            { rotulo: 'Conforto no braço', c: conforto },
          ].filter(x => x.c).map(({ rotulo, c }) => (
            <div key={rotulo} className="rounded-xl border border-tinta/10 bg-white p-3 flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-tinta/65">{rotulo}</span>
              <span className={`text-sm font-bold leading-snug sm:min-h-[2.5rem] ${c!.nivel === 1 ? 'text-tinta/60' : 'text-[#088F8D]'}`}>{c!.titulo}</span>
              <Medidor nivel={c!.nivel} />
              <p className="text-[11px] text-tinta/75 leading-snug">{c!.texto}</p>
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
