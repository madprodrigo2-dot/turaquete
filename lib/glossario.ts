export interface GlossarioEntry {
  termo: string
  definicao: string
  aliases?: string[]
  noAnatomia?: boolean  // opens anatomy lightbox in tooltip
  showInModal?: boolean // appears in InsightsModal accordion
}

export interface GlossaryMatch {
  start: number
  end: number
  matched: string
  entry: GlossarioEntry
}

export const GLOSSARIO: GlossarioEntry[] = [
  // --- Dimensões do modal (showInModal: true) ---
  {
    termo: 'potência',
    definicao: 'A força que a raquete entrega no ataque, sem você precisar forçar.',
    aliases: ['potencia'],
    showInModal: true,
  },
  {
    termo: 'controle',
    definicao: 'A precisão pra colocar a bola exatamente onde você quer.',
    showInModal: true,
  },
  {
    termo: 'conforto',
    definicao: 'O quanto ela protege seu braço do impacto e da vibração.',
    showInModal: true,
  },
  {
    termo: 'manuseio',
    definicao: 'A agilidade: rapidez pra reagir, defender e trocar de golpe.',
    showInModal: true,
  },
  {
    termo: 'spin',
    definicao: 'A capacidade de gerar efeito na bola, no estado de fábrica.',
    showInModal: true,
  },
  {
    termo: 'estabilidade',
    definicao: 'A firmeza no impacto: ela não torce na mão em bolas fortes.',
    showInModal: true,
  },
  {
    termo: 'sweet spot',
    definicao: 'Área da face onde o golpe sai completo. Fora dela a bola perde potência e vibra mais. Raquetes de cabeça redonda têm sweet spot maior e mais central; formatos diamante, menor e mais alto.',
    showInModal: true,
  },

  // --- Termos inline no chat ---
  {
    termo: 'swing',
    definicao: 'Movimento de balanço do braço ao golpear; um swing mais longo favorece raquetes com mais potência.',
  },
  {
    termo: 'balance',
    definicao: 'Ponto de equilíbrio da raquete. Balance ao cabo = mais controle e manuseio. Balance à cabeça = mais potência.',
    aliases: ['balanço', 'balanco'],
  },
  {
    termo: 'EVA',
    definicao: 'Material espumoso usado no núcleo da raquete. EVA macio absorve vibração (mais conforto); EVA duro devolve mais energia (mais potência).',
    noAnatomia: true,
  },
  {
    termo: 'núcleo',
    definicao: 'Interior da raquete, preenchido com espuma EVA. Define a sensação de impacto, conforto e potência.',
    aliases: ['nucleo'],
    noAnatomia: true,
  },
  {
    termo: 'trama',
    definicao: 'Padrão de furos na face da raquete. Trama aberta (furos maiores/espaçados) gera mais spin e saída de bola mais rápida.',
    noAnatomia: true,
  },
  {
    termo: 'fibra de carbono',
    definicao: 'Material rígido e leve usado na moldura e às vezes na face. Aumenta potência e durabilidade, mas pode transmitir mais vibração.',
    aliases: ['carbono', 'carbon fiber'],
  },
  {
    termo: 'furos',
    definicao: 'Aberturas na face da raquete que formam a trama. O diâmetro e espaçamento influenciam spin, saída de bola e controle.',
    noAnatomia: true,
  },
  {
    termo: 'coração',
    definicao: 'Região central da face, onde fica o sweet spot. Golpes no coração saem com mais potência e precisão.',
    noAnatomia: true,
  },
  {
    termo: 'moldura',
    definicao: 'Aro externo da raquete, que define o formato da cabeça (redonda, diamante ou gota) e a rigidez do conjunto.',
    aliases: ['frame'],
    noAnatomia: true,
  },
  {
    termo: 'frame',
    definicao: 'Aro externo da raquete (mesmo que moldura). Define a forma, rigidez e distribuição de peso.',
    aliases: ['moldura'],
    noAnatomia: true,
  },
  {
    termo: 'saída de bola',
    definicao: 'Velocidade com que a bola sai da face após o impacto. Depende da rigidez da face, do EVA e da trama.',
  },
  {
    termo: 'espessura',
    definicao: 'Grossura da moldura da raquete. Molduras mais espessas tendem a ser mais rígidas e potentes; mais finas, mais flexíveis e confortáveis.',
    noAnatomia: true,
  },
  {
    termo: 'areado',
    definicao: 'Acabamento texturizado na face que aumenta o atrito com a bola, gerando mais spin e efeito nos golpes.',
  },
  {
    termo: 'quartzo',
    definicao: 'Fibra de quartzo usada em algumas faces; mais macio que o carbono, oferece melhor absorção de vibração e sensação de toque.',
  },
  {
    termo: 'grip',
    definicao: 'Empunhadura da raquete (o cabo). O tamanho do grip afeta o conforto, o controle e a prevenção de lesões.',
  },
  {
    termo: 'smash',
    definicao: 'Golpe aéreo potente, geralmente a finalização de uma jogada. Exige raquetes com boa potência e estabilidade.',
  },
  {
    termo: 'voleio',
    definicao: 'Golpe executado antes da bola quicar, geralmente próximo à rede. Pede manuseio rápido e bom controle.',
    aliases: ['vôlei', 'volei'],
  },
]

export const GLOSSARIO_MODAL = GLOSSARIO.filter(e => e.showInModal)

// Returns sorted matches (by position) for a text segment.
// Mutates trackedTerms to prevent the same term from appearing twice across a full message.
export function findGlossaryMatches(text: string, trackedTerms: Set<string>): GlossaryMatch[] {
  const matches: GlossaryMatch[] = []

  // Longest terms first so "fibra de carbono" matches before "carbono"
  const sorted = [...GLOSSARIO].sort((a, b) => b.termo.length - a.termo.length)

  for (const entry of sorted) {
    const termsToCheck = [entry.termo, ...(entry.aliases ?? [])]
    for (const t of termsToCheck) {
      const key = entry.termo.toLowerCase()
      if (trackedTerms.has(key)) break

      // Unicode-aware whole-word boundary
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`(?<![\\wÀ-ž])${escaped}(?![\\wÀ-ž])`, 'gi')

      let m: RegExpExecArray | null
      let found = false
      while ((m = re.exec(text)) !== null) {
        if (found) break // only first occurrence per term
        // Make sure this position isn't already covered by another match
        const start = m.index
        const end = start + m[0].length
        const overlaps = matches.some(existing => start < existing.end && end > existing.start)
        if (!overlaps) {
          matches.push({ start, end, matched: m[0], entry })
          trackedTerms.add(key)
          found = true
        }
      }
    }
  }

  // Sort by position in the string
  return matches.sort((a, b) => a.start - b.start)
}
