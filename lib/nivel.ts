import { RacketWithInsights } from './recommend'

/**
 * Derives the suggested level from measurable signals.
 * Single source of truth — used by all display components and SQL sync script.
 *
 * Logic (in priority order):
 *   AVANCADO  : saida exigente  OR  forgiveness ≤ 5
 *   INICIANTE : forgiveness ≥ 9
 *               forgiveness = 8 + saida fácil
 *               forgiveness = 7 + maneuverability ≥ 8 + saida ≠ exigente  (Beast condition)
 *   INTERMEDIARIO: everything else
 *   NULL      : no forgiveness data → fall back to stored nivel_sugerido
 */
export function derivarNivel(
  racket: RacketWithInsights
): 'iniciante' | 'intermediario' | 'avancado' | null {
  const ins = racket.racket_insights
  if (!ins) return null

  const forgiveness = ins.forgiveness
  if (forgiveness == null) return ins.nivel_sugerido ?? null

  const man = ins.maneuverability ?? 0
  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>
  const saida = (extra.saida_de_bola as string | undefined)?.toLowerCase() ?? null

  // AVANCADO
  if (saida === 'exigente') return 'avancado'
  if (forgiveness <= 5) return 'avancado'

  // INICIANTE
  if (forgiveness >= 9) return 'iniciante'
  if (forgiveness >= 8 && saida === 'fácil') return 'iniciante'
  if (forgiveness === 7 && man >= 8 && saida !== 'exigente') return 'iniciante'

  return 'intermediario'
}
