// recomendado_para — texto curto (no máximo 2 cláusulas) derivado de tipo +
// espessura_mm, nunca de material (sem coeficiente real pra isso, mesmo
// critério já aplicado no GripRadar). Fontes já usadas nesta investigação:
// Tourna (marca própria, tourna.com) descreve "dry" como o grip que fica mais
// aderente quanto mais a mão sua — por isso mão suada/clima úmido; Head
// (marca própria) nomeia "tackiness" como aderência imediata, sem precisar de
// suor pra ativar — por isso reação rápida/mão seca. A relação
// espessura→conforto segue o mesmo tom cauteloso já usado em
// racket_insights.elbow_friendly ("Leve nas articulações" — nunca promete
// cura, só fala em conforto/amortecimento).
//
// Gate: só calcula quando tipo E espessura_mm existem — nunca roda com dado
// parcial. Compartilhado entre scripts/seed-grip-recomendacao.ts (grava na
// coluna) e app/grips/[slug]/page.tsx (mostra o texto).

const TIPO_RECOMENDACAO: Record<string, string> = {
  dry: 'Indicado pra quem transpira bastante nas mãos ou joga em clima quente e úmido — a aderência aumenta conforme a mão sua.',
  tacky: 'Indicado pra quem joga perto da rede e busca reação rápida, com mão seca — aderência imediata, sem precisar suar pra grudar.',
  texturizado: 'Opção equilibrada entre aderência e absorção de suor — bom ponto de partida pra quem ainda não sabe sua preferência.',
}

function espessuraClause(espessuraMm: number): string | null {
  if (espessuraMm >= 0.7) return 'Mais espesso: amortece mais o impacto, bom pra quem sente desconforto no braço.'
  if (espessuraMm <= 0.5) return 'Mais fino: melhor sensibilidade em voleios e toques perto da rede.'
  return null
}

export function buildRecomendadoPara(grip: { tipo: string | null; espessura_mm: number | null }): string | null {
  if (!grip.tipo || grip.espessura_mm == null) return null
  const base = TIPO_RECOMENDACAO[grip.tipo]
  if (!base) return null
  const extra = espessuraClause(grip.espessura_mm)
  return extra ? `${base} ${extra}` : base
}
