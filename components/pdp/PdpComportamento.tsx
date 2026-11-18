import type { RacketWithInsights } from '@/lib/recommend'
import PdpRadar from './PdpRadar'
import { buildSpecRows } from '@/components/SpecsGrid'
import {
  destaques, saidaDeBolaCopy, sweetSpotCardCopy, confortoCardCopy, isSuperficieLisa, dimensoesStats,
} from '@/lib/pdpCopy'
import { CARD } from './tom'
import { nivelRange } from '@/lib/nivelRange'
import type { DestaqueLinha, CartaoCopy } from '@/lib/pdpCopy'
import { Check, Minus, Zap, Target, ShieldCheck, ShieldAlert } from 'lucide-react'

// Hexágono + 3 cartões de comportamento em quadra (texto sempre visível) no
// lugar das 6 barras, que repetiam o que o hexágono já mostra. Nada some: os 6
// valores continuam nos vértices do hexágono, as dimensões que os cartões não
// nomeiam viram uma linha em palavras no cartão de perfil, e o detalhe técnico
// completo fica no "Como ler este gráfico".

// Linha de pills: cada atributo é uma etiqueta branca sobre uma faixa com tinte de cor.
function Tira({ tom, titulo, itens }: { tom: 'brilha' | 'abre'; titulo: string; itens: DestaqueLinha[] }) {
  const brilha = tom === 'brilha'
  const Icone = brilha ? Check : Minus
  return (
    <div className={`flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-2 border ${
      brilha ? 'bg-aqua-light/80 border-aqua/20' : 'bg-coral/[0.06] border-coral/15'
    }`}>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold mr-1 ${brilha ? 'text-[#088F8D]' : 'text-[#D9482B]'}`}>
        <Icone className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        {titulo}
      </span>
      {itens.map(l => (
        <span
          key={l.key}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-xs text-tinta border border-tinta/10 shadow-sm"
        >
          <strong className={`font-semibold ${brilha ? 'text-[#088F8D]' : 'text-[#D9482B]'}`}>{l.label} {l.value}</strong>
          {l.nota && <span className="text-tinta/65">· {l.nota}</span>}
        </span>
      ))}
    </div>
  )
}

// Ícone monocromático do cartão: teal quando bom/neutro, coral quando "seco/exigente".
function IconeCartao({ c }: { c: CartaoCopy }) {
  const cor = c.tom === 'amber' ? 'text-[#D9482B]' : 'text-[#088F8D]'
  const cls = `w-4 h-4 shrink-0 ${cor}`
  if (c.icone === 'zap') return <Zap className={cls} strokeWidth={2} aria-hidden="true" />
  if (c.icone === 'target') return <Target className={cls} strokeWidth={2} aria-hidden="true" />
  return c.tom === 'amber'
    ? <ShieldAlert className={cls} strokeWidth={2} aria-hidden="true" />
    : <ShieldCheck className={cls} strokeWidth={2} aria-hidden="true" />
}

const CHIP_CARTAO: Record<CartaoCopy['tom'], string> = {
  aqua: 'bg-aqua/10 text-[#088F8D]',
  emerald: 'bg-aqua/10 text-[#088F8D]',
  neutro: 'bg-tinta/5 text-tinta/70',
  amber: 'bg-coral/10 text-[#D9482B]',
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
      <div className="flex flex-col gap-3">
        <PdpRadar stats={stats} />
        {dest.brilha.length > 0 && (
          <Tira tom="brilha" titulo="Onde brilha" itens={dest.brilha} />
        )}
        {dest.abreMao.length > 0 && (
          <Tira tom="abre" titulo="Abre mão de" itens={dest.abreMao} />
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
              <span className={`inline-flex items-start gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl leading-snug ${CHIP_CARTAO[c!.tom]}`}>
                <span className="mt-px"><IconeCartao c={c!} /></span>
                <span>
                {c!.titulo}
                {c!.nota && <span className="font-normal opacity-80"> ({c!.nota})</span>}
                </span>
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
