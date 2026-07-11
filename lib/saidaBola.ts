export type SaidaDeBola = 'fácil' | 'média' | 'exigente'

export function getSaidaDeBola(
  comfort: number | null | undefined,
  power: number | null | undefined,
): SaidaDeBola | null {
  if (comfort == null || power == null) return null
  const delta = comfort - power
  return delta >= 2 ? 'fácil' : delta <= -2 ? 'exigente' : 'média'
}
