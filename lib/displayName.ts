// Family rule: show model_year on the card only when the same brand + nome_base
// has 2+ published versions. racket_family_count is a PostgreSQL computed column
// (function racket_family_count(r rackets)) that counts sibling rows with
// identical brand_id + nome_base + publicada=true.
// Família = marca + nome_base EXATO. Número de versão, atleta, cor e edição são
// parte do nome comercial e definem a família — só o ANO (standalone 20XX) é extraído.
export function getDisplayName(racket: {
  nome_base: string | null
  model_year: number | null
  racket_family_count?: number | null
  name: string
}): string {
  if (!racket.nome_base) return racket.name
  if (racket.model_year && (racket.racket_family_count ?? 0) >= 2) {
    return `${racket.nome_base} ${racket.model_year}`
  }
  return racket.nome_base
}
