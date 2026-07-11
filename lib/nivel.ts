import { RacketWithInsights } from './recommend'

// Função de EXIBIÇÃO — retorna o label público da raquete ("Pra quem: Iniciante/...").
// nivel_sugerido (DB) é a fonte primária; fórmula abaixo serve apenas como fallback.
// NÃO deve ser alinhada ao portão de filtragem isAvancadaParaFiltro (recommend.ts):
// são perguntas distintas — etiqueta de exibição vs gate de proteção do pool.
export function derivarNivel(
  racket: RacketWithInsights
): 'iniciante' | 'intermediario' | 'avancado' | null {
  const ins = racket.racket_insights
  if (!ins) return null

  if (ins.nivel_sugerido) return ins.nivel_sugerido

  // Fallback formula para raquetes sem nivel_sugerido
  const f  = ins.forgiveness
  const p  = ins.power
  const c  = ins.control
  const co = ins.comfort

  if (f == null || p == null || c == null || co == null) return null

  if (f <= 4 || (f <= 6 && (p >= 7 || c >= 7)) || (f <= 7 && p >= 9)) return 'avancado'
  if (f >= 7 && co >= 6 && p <= 6) return 'iniciante'
  return 'intermediario'
}
