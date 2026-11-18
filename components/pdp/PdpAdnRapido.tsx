import type { RacketWithInsights } from '@/lib/recommend'
import { buildSpecRows } from '@/components/SpecsGrid'
import { tagPeso, tagBalance, tagFace, tagSuperficie } from '@/lib/pdpCopy'
import { TOM_CHIP, CARD } from './tom'

// "ADN rápido": os 4 dados que todo jogador olha primeiro, com uma etiqueta que
// traduz o número em linguagem de quadra. Mesmos dados da tabela de specs.
export default function PdpAdnRapido({ racket }: { racket: RacketWithInsights }) {
  const rows = buildSpecRows(racket)
  const get = (label: string) => rows.find(r => r.label === label)?.value

  const peso = racket.weight_g ? get('Peso') : undefined
  const cards = [
    { label: 'Peso', value: peso, t: tagPeso(racket.weight_g) },
    { label: 'Balance', value: get('Balance'), t: tagBalance(racket.balance) },
    { label: 'Face', value: get('Material da face'), t: tagFace(racket.face_material) },
    { label: 'Superfície', value: get('Superfície'), t: tagSuperficie(get('Superfície')) },
  ].filter(c => c.value)

  if (cards.length === 0) return null

  return (
    <section aria-label="ADN rápido" className="flex flex-col gap-2">
      <p className="text-tinta font-semibold text-sm">ADN rápido</p>
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2`}>
        {cards.map(c => (
          <div key={c.label} className={`${CARD} px-3.5 py-3 flex flex-col gap-1 min-w-0`}>
            <span className="text-[10px] uppercase tracking-wide text-tinta/40 font-medium">{c.label}</span>
            <span className="text-tinta font-bold text-base leading-tight break-words">{c.value}</span>
            {c.t && (
              <span className={`self-start text-[11px] font-semibold px-2 py-0.5 rounded-full ${TOM_CHIP[c.t.tom]}`}>
                {c.t.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
