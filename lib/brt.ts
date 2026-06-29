// Calcula o cutoff de data usando meia-noite no horário de Brasília (UTC-3).
// daysBack=1 → meia-noite BRT de hoje
// daysBack=7 → meia-noite BRT de 6 dias atrás (7 dias inclusive)
export function brtCutoff(daysBack: number): string {
  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const y = brtNow.getUTCFullYear()
  const m = brtNow.getUTCMonth()
  const d = brtNow.getUTCDate()
  return new Date(Date.UTC(y, m, d - (daysBack - 1), 3, 0, 0, 0)).toISOString()
}
