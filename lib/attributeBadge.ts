import type { Insights } from './recommend'

// "9+ num atributo" badge — só os 6 atributos públicos (mesmo conjunto que
// RacketHexagon.tsx / ScoreSection.tsx já destacam em coral). forgiveness
// fica de fora de propósito: é interno, nunca exposto como score cru em
// nenhum outro lugar do site.
const ATTRS: { key: keyof Insights; label: string }[] = [
  { key: 'power',           label: 'Potência'     },
  { key: 'control',         label: 'Controle'     },
  { key: 'comfort',         label: 'Conforto'     },
  { key: 'maneuverability', label: 'Manuseio'     },
  { key: 'spin',            label: 'Spin'         },
  { key: 'stability',       label: 'Estabilidade' },
]

export interface AttributeBadge {
  label: string
  value: number
}

// Retorna o(s) atributo(s) no valor máximo da raquete, só se esse máximo for
// >=9. Empate no máximo => retorna todos os empatados (hoje só acontece com 2).
export function getTopAttributeBadges(ins: Insights | null | undefined): AttributeBadge[] {
  if (!ins) return []
  const vals = ATTRS
    .map(a => ({ label: a.label, value: ins[a.key] as number | null }))
    .filter((a): a is AttributeBadge => a.value != null)
  if (vals.length === 0) return []
  const max = Math.max(...vals.map(a => a.value))
  if (max < 9) return []
  return vals.filter(a => a.value === max)
}
