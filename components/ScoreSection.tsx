'use client'

import TermoGlossario from './TermoGlossario'
import ScoreBar from './ScoreBar'
import { GLOSSARIO } from '@/lib/glossario'
import type { GlossarioEntry } from '@/lib/glossario'

const SPIN_LISA_ENTRY: GlossarioEntry = {
  termo: 'Spin: dá pra subir',
  definicao: 'Dá pra aumentar o efeito com areado aplicado depois da compra, sem alterar a estrutura da raquete.',
}

const D_POTENCIA    = GLOSSARIO.find(e => e.termo === 'potência')!
const D_CONTROLE    = GLOSSARIO.find(e => e.termo === 'controle')!
const D_CONFORTO    = GLOSSARIO.find(e => e.termo === 'conforto')!
const D_MANUSEIO    = GLOSSARIO.find(e => e.termo === 'manuseio')!
const D_SPIN        = GLOSSARIO.find(e => e.termo === 'spin')!
const D_ESTABILIDADE = GLOSSARIO.find(e => e.termo === 'estabilidade')!

const CORAL = '#FF5E3A'

export interface ScoreSectionProps {
  power:           number | null
  control:         number | null
  comfort:         number | null
  maneuverability: number | null
  spin:            number | null
  stability:       number | null
  tratamentoFabrica?: boolean | null
}

function ScoreRow({ label, entry, value, spinLisa, sublabel, strong, isTop }: {
  label: string
  entry: GlossarioEntry
  value: number | null
  spinLisa?: boolean
  sublabel?: string
  strong?: boolean
  isTop?: boolean
}) {
  const labelNode = (
    <div className="flex items-center gap-1.5">
      <TermoGlossario entry={entry}>
        <span className={`text-sm ${strong ? 'text-tinta font-semibold' : 'text-tinta/70'}`}>
          {label}
        </span>
      </TermoGlossario>
      <TermoGlossario
        entry={SPIN_LISA_ENTRY}
        className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors focus:outline-none leading-none shrink-0"
      >
        ajustável
      </TermoGlossario>
    </div>
  )
  return (
    <ScoreBar
      label={labelNode}
      sublabel={sublabel}
      value={value}
      color={strong ? CORAL : undefined}
      badge={isTop ? '★' : undefined}
      highlight={strong}
    />
  )
}

function powerSublabel(v: number): string {
  if (v >= 8) return 'devolve muita força'
  if (v >= 5) return 'força equilibrada'
  return 'mais controle do que força'
}

function comfortSublabel(v: number): string {
  if (v >= 8) return 'protege bem o braço'
  if (v >= 6) return 'conforto moderado'
  return 'mais firme no impacto'
}

export default function ScoreSection({
  power, control, comfort, maneuverability, spin, stability, tratamentoFabrica,
}: ScoreSectionProps) {
  const spinLisa = tratamentoFabrica === false

  const vals = [power, control, comfort, maneuverability, spin, stability].filter((v): v is number => v !== null)
  const anyNine = vals.some(v => v >= 9)
  const threshold = anyNine ? 9 : (vals.length > 0 ? Math.max(...vals) : Infinity)

  function strong(v: number | null): boolean { return v !== null && v >= threshold }
  function isTop(v: number | null): boolean  { return v === 10 }

  return (
    <div className="flex flex-col gap-3">
      <ScoreRow label="Potência"     entry={D_POTENCIA}     value={power}           sublabel={power     != null ? powerSublabel(power)     : undefined} strong={strong(power)}           isTop={isTop(power)} />
      <ScoreRow label="Controle"     entry={D_CONTROLE}     value={control}                                                                              strong={strong(control)}         isTop={isTop(control)} />
      <ScoreRow label="Conforto"     entry={D_CONFORTO}     value={comfort}         sublabel={comfort    != null ? comfortSublabel(comfort)   : undefined} strong={strong(comfort)}         isTop={isTop(comfort)} />
      <ScoreRow label="Manuseio"     entry={D_MANUSEIO}     value={maneuverability}                                                                       strong={strong(maneuverability)} isTop={isTop(maneuverability)} />
      <ScoreRow label="Spin"         entry={D_SPIN}         value={spin}            spinLisa={spinLisa}                                                   strong={strong(spin)}            isTop={isTop(spin)} />
      <ScoreRow label="Estabilidade" entry={D_ESTABILIDADE} value={stability}                                                                             strong={strong(stability)}       isTop={isTop(stability)} />
    </div>
  )
}
