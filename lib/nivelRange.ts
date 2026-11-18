import type { RacketWithInsights } from './recommend'
import { derivarNivel } from './nivel'

// Barra de "nível recomendado" da ficha (PDP). Tudo derivado de números que o
// motor já calcula (forgiveness, power, control) + derivarNivel() — nada manual
// por raquete, então escala para o catálogo inteiro.
//
// Duas ideias separadas:
//  - piso   = derivarNivel() (fórmula canônica + nivel_override). A partir de que
//             nível a raquete "funciona". Nunca é contrariado pela barra.
//  - melhor = onde ela rende mais: índice de exigência técnica (quanto menos
//             perdão e mais "especialista" — potência OU controle altos —, mais
//             técnica a raquete cobra). Sempre >= piso.

export type Nivel = 'iniciante' | 'intermediario' | 'avancado'
export type NivelFit = 'melhor' | 'ok' | 'fora'

export const NIVEIS: Nivel[] = ['iniciante', 'intermediario', 'avancado']
export const NIVEL_NOME: Record<Nivel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

export interface NivelRange {
  fit: Record<Nivel, NivelFit>
  piso: Nivel
  melhor: Nivel[]
  texto: string
}

// 0..10. perdão pesa mais (0,45) que o "teto especialista" (0,30); o máximo
// teórico (perdão 0, pot/ctrl 10) é 7,5 — normalizado pra 10.
export function exigenciaTecnica(racket: RacketWithInsights): number | null {
  const ins = racket.racket_insights
  if (!ins || ins.forgiveness == null || ins.power == null || ins.control == null) return null
  const raw = 0.45 * (10 - ins.forgiveness) + 0.30 * Math.max(ins.power, ins.control)
  return raw * (10 / 7.5)
}

const CORTE_INI_INT = 3.5
const CORTE_INT_AVA = 6.5
const MARGEM = 0.8

function nivelDeExigencia(e: number): Nivel {
  return e < CORTE_INI_INT ? 'iniciante' : e < CORTE_INT_AVA ? 'intermediario' : 'avancado'
}

export function nivelRange(racket: RacketWithInsights): NivelRange | null {
  const piso = derivarNivel(racket)
  const e = exigenciaTecnica(racket)
  if (!piso || e == null) return null

  const pisoIdx = NIVEIS.indexOf(piso)
  const lo = NIVEIS.indexOf(nivelDeExigencia(e - MARGEM))
  const hi = NIVEIS.indexOf(nivelDeExigencia(e + MARGEM))
  let melhor = NIVEIS.filter((_, i) => i >= lo && i <= hi && i >= pisoIdx)
  if (melhor.length === 0) melhor = [piso]

  const fit = {} as Record<Nivel, NivelFit>
  NIVEIS.forEach((n, i) => {
    fit[n] = melhor.includes(n) ? 'melhor' : i >= pisoIdx ? 'ok' : 'fora'
  })

  const nomes = melhor.map(n => NIVEL_NOME[n].toLowerCase()).join(' e ')
  const base =
    piso === 'iniciante' ? 'Serve desde o iniciante'
    : piso === 'intermediario' ? 'Recomendada a partir do intermediário'
    : 'Feita para jogadores experientes'
  const texto = melhor.length === 1 && melhor[0] === piso && piso !== 'iniciante'
    ? base
    : `${base}, rende melhor no ${nomes}`

  return { fit, piso, melhor, texto }
}
