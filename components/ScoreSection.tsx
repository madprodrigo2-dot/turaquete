'use client'

import TermoGlossario from './TermoGlossario'
import { GLOSSARIO } from '@/lib/glossario'
import type { GlossarioEntry } from '@/lib/glossario'

const SPIN_LISA_ENTRY: GlossarioEntry = {
  termo: 'Spin — dá pra subir',
  definicao: 'Superfície lisa de fábrica. Dá pra aumentar o efeito com areado aplicado depois da compra, sem alterar a estrutura da raquete.',
}

const D_POTENCIA    = GLOSSARIO.find(e => e.termo === 'potência')!
const D_CONTROLE    = GLOSSARIO.find(e => e.termo === 'controle')!
const D_CONFORTO    = GLOSSARIO.find(e => e.termo === 'conforto')!
const D_MANUSEIO    = GLOSSARIO.find(e => e.termo === 'manuseio')!
const D_SPIN        = GLOSSARIO.find(e => e.termo === 'spin')!
const D_ESTABILIDADE = GLOSSARIO.find(e => e.termo === 'estabilidade')!

export interface ScoreSectionProps {
  power:           number | null
  control:         number | null
  comfort:         number | null
  maneuverability: number | null
  spin:            number | null
  stability:       number | null
  tratamentoFabrica?: boolean | null
}

function ScoreRow({ label, entry, value, spinLisa }: {
  label: string
  entry: GlossarioEntry
  value: number | null
  spinLisa?: boolean
}) {
  if (value === null) return null
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 flex items-center gap-1.5">
        <TermoGlossario entry={entry}>
          <span className="text-tinta/70 text-sm">{label}</span>
        </TermoGlossario>
        {spinLisa && (
          <TermoGlossario
            entry={SPIN_LISA_ENTRY}
            className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors focus:outline-none leading-none shrink-0"
          >
            dá pra subir
          </TermoGlossario>
        )}
      </div>
      <div className="flex-1 bg-aqua/15 rounded-full h-2.5">
        <div className="bg-aqua h-2.5 rounded-full" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="text-tinta font-semibold text-sm w-5 text-right">{value}</span>
    </div>
  )
}

export default function ScoreSection({
  power, control, comfort, maneuverability, spin, stability, tratamentoFabrica,
}: ScoreSectionProps) {
  const spinLisa = tratamentoFabrica === false
  return (
    <div className="flex flex-col gap-3">
      <ScoreRow label="Potência"     entry={D_POTENCIA}     value={power} />
      <ScoreRow label="Controle"     entry={D_CONTROLE}     value={control} />
      <ScoreRow label="Conforto"     entry={D_CONFORTO}     value={comfort} />
      <ScoreRow label="Manuseio"     entry={D_MANUSEIO}     value={maneuverability} />
      <ScoreRow label="Spin"         entry={D_SPIN}         value={spin} spinLisa={spinLisa} />
      <ScoreRow label="Estabilidade" entry={D_ESTABILIDADE} value={stability} />
    </div>
  )
}
