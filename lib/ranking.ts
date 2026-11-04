import {
  type RacketWithInsights,
  getTopRaquetas,
  getRaquetasPorNivel,
  scoreGeral,
  temLinkEPrecoValidos,
  consolidationKey,
} from './recommend'
import { scoreForNivel, compatPct, calcular_faixa_ideal } from './scorer'
import { getDisplayName } from './displayName'

export interface RankingEntry {
  racket: RacketWithInsights
  score: number
  compatPct: number | null
}

// Ranking geral — reaproveita getTopRaquetas() (já usado no home): cliques
// reais + recomendações reais do chat nos últimos 30 dias, com piso de
// qualidade (scoreGeral) e teto de 1 por marca já aplicados ali. Aqui só
// ordena por scoreGeral (a mesma nota que já serviu de piso) e corta em
// topN. Nenhum dado novo, nenhuma raquete fora do que já aparece no site.
export async function getRankingGeral(topN = 10): Promise<RankingEntry[]> {
  const { rackets } = await getTopRaquetas()
  return rackets
    .map(r => ({ racket: r, score: scoreGeral(r.racket_insights) }))
    .filter((e): e is { racket: RacketWithInsights; score: number } => e.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(({ racket, score }) => ({ racket, score, compatPct: compatPct(score) }))
}

// Ranking por nível — diferente de getTopRaquetasPorNivel (que exige clique
// real nos últimos 30d e pode devolver menos que topN em dias de pouco
// volume). Aqui é um ranking de qualidade: todo o pool real do nível
// (getRaquetasPorNivel, sem exigir clique), ordenado por scoreForNivel —
// mesmo motor de pesos do chat, só que com o nível fixo e sem prioridade/dor.
// Consolida edições da mesma raquete (consolidationKey, igual ao resto do
// site) mantendo a de maior score, e aplica teto de 1 por marca.
export async function getRankingPorNivel(
  nivel: 'iniciante' | 'intermediario' | 'avancado',
  topN = 10
): Promise<RankingEntry[]> {
  const pool = await getRaquetasPorNivel(nivel)

  const scored = pool
    .filter(temLinkEPrecoValidos)
    .map(racket => ({ racket, score: scoreForNivel(racket.racket_insights, nivel) }))
    .filter((e): e is { racket: RacketWithInsights; score: number } => e.score != null)

  const bestPerGroup = new Map<string, { racket: RacketWithInsights; score: number }>()
  for (const entry of scored) {
    const key = consolidationKey(entry.racket)
    const existing = bestPerGroup.get(key)
    if (!existing || entry.score > existing.score) bestPerGroup.set(key, entry)
  }

  const seenBrands = new Set<string>()
  const result: RankingEntry[] = []
  for (const entry of [...bestPerGroup.values()].sort((a, b) => b.score - a.score)) {
    if (result.length >= topN) break
    const brandKey = entry.racket.brands?.slug
    if (brandKey) {
      if (seenBrands.has(brandKey)) continue
      seenBrands.add(brandKey)
    }
    result.push({ racket: entry.racket, score: entry.score, compatPct: compatPct(entry.score) })
  }
  return result
}

// ── FAQ — perguntas aprovadas por Rodrigo (2026-11), respostas 100% ancoradas
// em dado real: calcular_faixa_ideal() (mesma função do chat), preço real das
// entries do próprio ranking, metodologia real de getTopRaquetas/scoreForNivel.
// Nenhum texto fixo descreve número — só o enquadramento (pergunta + frase de
// transição) é redação; todo valor concreto vem de entries/faixa.

export interface FaqQA { question: string; answer: string }

function precoRange(entries: RankingEntry[]): { min: number; max: number } | null {
  const precos = entries.map(e => e.racket.price).filter((p): p is number => p != null)
  if (precos.length === 0) return null
  return { min: Math.min(...precos), max: Math.max(...precos) }
}

function fmtPreco(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

const BALANCE_LABEL: Record<string, string> = {
  medio:            'médio',
  medio_ou_cabo:    'médio ou cabo — mais leve na mão, favorece controle e manuseio',
  medio_ou_cabeca:  'médio ou cabeça — mais peso na cabeça, favorece potência',
}

export function buildFaqGeral(entries: RankingEntry[]): FaqQA[] {
  const top1 = entries[0]
  const faixaPreco = precoRange(entries)

  return [
    {
      question: 'Como é calculado o ranking das melhores raquetes de beach tennis?',
      answer: 'O ranking combina cliques reais de compra e recomendações reais feitas pela Tury (consultora de IA do site) nos últimos 30 dias, com um piso mínimo de qualidade técnica e no máximo 1 raquete por marca — pra não virar uma lista dominada por quem lança mais modelo.',
    },
    {
      question: 'Qual é a raquete mais bem avaliada do catálogo hoje?',
      answer: top1
        ? `Hoje é a ${getDisplayName(top1.racket)}${top1.racket.brands?.name ? ` (${top1.racket.brands.name})` : ''}, com nota ${top1.score.toFixed(1)}/10. Essa posição muda com os cliques e recomendações reais dos últimos 30 dias.`
        : 'Essa informação é calculada em tempo real a partir do catálogo.',
    },
    {
      question: 'Preço mais alto significa raquete melhor?',
      answer: faixaPreco
        ? `Não necessariamente. A nota técnica considera potência, controle, conforto, manuseio e estabilidade — não o preço. As raquetes deste ranking variam de ${fmtPreco(faixaPreco.min)} a ${fmtPreco(faixaPreco.max)}, e a ordem não segue o preço.`
        : 'Não. A nota técnica considera potência, controle, conforto, manuseio e estabilidade — não o preço.',
    },
    {
      question: 'Com que frequência esse ranking é atualizado?',
      answer: 'A página é recalculada automaticamente a cada nova visita (no máximo a cada 5 minutos) com os cliques e recomendações mais recentes, e os preços são sincronizados com as lojas todos os dias.',
    },
    {
      question: 'Quais critérios entram na nota de cada raquete?',
      answer: 'Potência, controle, conforto, manuseio e estabilidade — as mesmas dimensões que a Tury usa pra recomendar raquete no chat, pontuadas de 0 a 10 a partir das especificações técnicas reais de cada modelo.',
    },
  ]
}

export function buildFaqPorNivel(
  nivel: 'iniciante' | 'intermediario' | 'avancado',
  entries: RankingEntry[]
): FaqQA[] {
  const { peso_min, peso_max, balance_preferido, prioridades } = calcular_faixa_ideal({ nivel })
  const faixaPreco = precoRange(entries)
  const nivelLabel = { iniciante: 'iniciante', intermediario: 'intermediário', avancado: 'avançado' }[nivel]

  return [
    {
      question: `Qual o peso ideal de raquete para nível ${nivelLabel}?`,
      answer: `Entre ${peso_min}g e ${peso_max}g, segundo o mesmo cálculo que a Tury usa no chat pra esse nível — a faixa que equilibra potência e conforto.`,
    },
    {
      question: `O balance faz diferença pra quem é ${nivelLabel}?`,
      answer: `Sim. Pra ${nivelLabel}, o balance indicado é ${BALANCE_LABEL[balance_preferido] ?? balance_preferido}.`,
    },
    {
      question: `Preciso gastar muito pra ter uma boa raquete sendo ${nivelLabel}?`,
      answer: faixaPreco
        ? `Não. As 10 melhores pra esse nível no catálogo custam entre ${fmtPreco(faixaPreco.min)} e ${fmtPreco(faixaPreco.max)} — dá pra achar uma boa opção sem ser a mais cara.`
        : 'Não necessariamente — o catálogo tem boas opções em faixas de preço variadas.',
    },
    {
      question: 'Qual a diferença entre essas raquetes e as de outros níveis?',
      answer: `Pra ${nivelLabel}, a Tury prioriza ${prioridades.join(', ')} — são os critérios que pesam mais na nota pra esse nível. Em outros níveis esse peso muda, por isso o ranking é diferente em cada um.`,
    },
  ]
}
