import type { RacketWithInsights } from '@/lib/recommend'
import { buildSpecRows } from '@/components/SpecsGrid'
import { tagPeso, tagFace, tagNucleo, tagEspessura } from '@/lib/pdpCopy'
import { TOM_CHIP, CARD } from './tom'

const COLS_SM: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }

// "DNA rápido": os 4 dados que todo jogador olha primeiro, com uma etiqueta que
// traduz o número em linguagem de quadra. Mesmos dados da tabela de specs.
export default function PdpAdnRapido({ racket }: { racket: RacketWithInsights }) {
  const rows = buildSpecRows(racket)
  const get = (label: string) => rows.find(r => r.label === label)?.value

  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>
  const espMm = extra.espessura_mm as number | null | undefined

  // Os 4 dados "fixos" da raquete (não mudam com tratamento nem ajuste). Balance e
  // superfície ficam de fora: o balance já se lê no hexágono e a superfície tem
  // lugar próprio na ficha técnica (junto da MegaSpin).
  const peso = racket.weight_g ? get('Peso') : undefined
  const cards = [
    { label: 'Peso', value: peso, t: tagPeso(racket.weight_g) },
    { label: 'Face', value: get('Material da face'), t: tagFace(racket.face_material) },
    { label: 'Núcleo', value: get('Núcleo (EVA)'), t: tagNucleo(racket.core, racket.racket_insights?.comfort) },
    { label: 'Espessura', value: espMm != null ? `${espMm}mm` : get('Espessura'), t: tagEspessura(espMm) },
  ].filter(c => c.value)

  if (cards.length === 0) return null

  return (
    <section aria-label="DNA rápido" className="flex flex-col gap-2">
      <p className="text-tinta font-semibold text-sm">DNA rápido</p>
      {/* Colunas = nº de tarjetas (sem buraco no desktop); no mobile, se for ímpar, a última ocupa as 2 colunas. */}
      <div className={`grid grid-cols-2 gap-2 ${COLS_SM[cards.length] ?? 'sm:grid-cols-4'}`}>
        {cards.map((c, i) => (
          <div key={c.label} className={`${CARD} px-3.5 py-3 flex flex-col gap-1 min-w-0 ${cards.length % 2 === 1 && i === cards.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <span className="text-[10px] uppercase tracking-wide text-tinta/40 font-medium">{c.label}</span>
            {/* Mobile: 1 linha sempre (as 4 tarjetas ficam da mesma altura; o valor completo
                está na ficha técnica). Desktop é uma única fila, então pode quebrar linha. */}
            <span
              title={c.value}
              className="text-tinta font-bold text-sm sm:text-base leading-tight truncate sm:overflow-visible sm:whitespace-normal sm:break-words"
            >
              {c.value}
            </span>
            {c.t && (
              <span title={c.t.tag} className={`self-start max-w-full truncate text-[11px] font-semibold px-2 py-0.5 rounded-full ${TOM_CHIP[c.t.tom]}`}>
                {c.t.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
