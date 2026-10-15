'use client'

import TermoGlossario from './TermoGlossario'
import ScoreBar from './ScoreBar'
import type { GlossarioEntry } from '@/lib/glossario'

const D_ADERENCIA: GlossarioEntry = {
  termo: 'Aderência',
  definicao: 'Quanto o grip gruda na mão assim que você empunha, seco ou suado.',
}
const D_ABSORCAO: GlossarioEntry = {
  termo: 'Absorção',
  definicao: 'Quanto ele segura o suor sem ficar escorregadio durante o jogo.',
}
const D_CONFORTO: GlossarioEntry = {
  termo: 'Conforto',
  definicao: 'Quão macio ele é ao toque — mais espesso tende a amortecer mais.',
}

export interface GripScoreSectionProps {
  aderencia: number
  absorcao: number
  conforto: number
}

function ScoreRow({ label, entry, value, delay }: {
  label: string
  entry: GlossarioEntry
  value: number
  delay?: number
}) {
  const labelNode = (
    <TermoGlossario entry={entry}>
      <span className="text-sm text-tinta/70">{label}</span>
    </TermoGlossario>
  )
  return <ScoreBar label={labelNode} value={value} delay={delay} />
}

// Irmão do GripRadar (triângulo de 3 eixos) — descartado por não ser legível
// com só 3 pontos. Reusa ScoreBar, já em produção na ficha de raquetes pros
// 6 eixos do motor (ver ScoreSection.tsx). Mesma fórmula de scores (tipo +
// espessura_mm), só muda a apresentação.
export default function GripScoreSection({ aderencia, absorcao, conforto }: GripScoreSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <ScoreRow label="Aderência" entry={D_ADERENCIA} value={aderencia} delay={0} />
      <ScoreRow label="Absorção"  entry={D_ABSORCAO}  value={absorcao}  delay={100} />
      <ScoreRow label="Conforto"  entry={D_CONFORTO}  value={conforto}  delay={200} />
    </div>
  )
}
