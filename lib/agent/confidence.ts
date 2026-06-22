// Profile confidence scoring — Akinator-style progressive questioning.
// Determines whether the agent has enough info to recommend, or which single
// question to ask next if not.

export type FieldKey = 'estilo' | 'nivel' | 'lesao' | 'forca_declarada' | 'jogo_aereo'

export type ConfidenceFieldInfo = {
  key: FieldKey
  label: string
  weight: number
  present: boolean
  value?: unknown
  chips?: string[]
}

export type ConfidenceQuestion = {
  field: FieldKey
  label: string
  chips: string[]
  justification: string
}

export type ConfidenceInfo = {
  score: number
  threshold: number
  thresholdReason: string
  willRecommend: boolean
  decisionTaken: 'recomendar' | 'perguntar'
  presentFields: ConfidenceFieldInfo[]
  missingFields: ConfidenceFieldInfo[]
  nextQuestion: ConfidenceQuestion | null
  questionRound: number
  maxQuestions: number
  recommendAnyway: boolean
  dorMencionada: boolean  // true when pain was mentioned in apertura but location not yet confirmed
}

// ── Parametrizable config ─────────────────────────────────────────────────────
export const CONFIDENCE_CONFIG = {
  // 80% makes lesão mandatory for ALL profiles: max score without lesão is
  // estilo(32)+nivel(28)+forca(11)+jogo_aereo(7) = 78% < 80%. The minimum
  // passing score including lesão is estilo+nivel+lesão = 82% > 80%.
  threshold:    80,
  maxQuestions:  4,  // after this many user turns, recommend anyway with caveat
}

// ── Field definitions (weights sum to 100) ────────────────────────────────────
type FieldDef = {
  key: FieldKey
  label: string
  question: string  // Fixed question text — always shown verbatim, never model-generated
  weight: number
  chips: string[]
  justification: string
}

const FIELD_DEFS: FieldDef[] = [
  {
    key: 'estilo',
    label: 'Estilo de jogo',
    question: 'Como você mais gosta de jogar?',
    weight: 32,
    chips: ['Ataque (potência, smash)', 'Defesa e controle', 'Equilibrado'],
    justification: 'maior discriminador: separa raquetes de potência vs controle vs equilíbrio',
  },
  {
    key: 'nivel',
    label: 'Nível / categoria',
    question: 'Qual é o seu nível hoje?',
    weight: 28,
    chips: ['Estou começando (cat. E/D)', 'Intermediário (cat. C/B)', 'Avançado (cat. A/Pro)'],
    justification: 'base do fitting: define faixa de peso, prioridades e sweet spot esperado',
  },
  {
    key: 'lesao',
    label: 'Lesão / dor no braço',
    question: 'Você sente dor em algum lugar quando joga?',
    weight: 22,
    chips: ['Sim, cotovelo', 'Sim, ombro', 'Punho ou outro lugar', 'Não tenho dor'],
    justification: 'ativa filtro duplo conforto≥8 + saída fácil, mudando todo o conjunto de candidatas',
  },
  {
    key: 'forca_declarada',
    label: 'Força / potência de batida',
    question: 'Como você descreveria a força da sua batida?',
    weight: 11,
    chips: ['Minha batida é forte', 'Minha batida é suave'],
    justification: 'determina se saída exigente é viável (regra inquebrável: swing fraco → exclui saída exigente)',
  },
  {
    key: 'jogo_aereo',
    label: 'Jogo aéreo / posição em quadra',
    question: 'Você joga mais na rede ou prefere o fundo de quadra?',
    weight: 7,
    chips: ['Jogo muito na rede', 'Prefiro o fundo de quadra'],
    justification: 'sinal suave: rede → sobe prioridade de manuseio e estabilidade',
  },
]

// Fixed question text for price — emitted verbatim, never model-generated
export const PRECO_QUESTION_TEXT = 'Pra fechar a indicação certa, qual faixa de preço faz mais sentido pro seu bolso?'

// Location-only follow-up when pain was mentioned in apertura but location not given
export const LESAO_LOCAL_QUESTION_TEXT = 'Onde você sente essa dor?'
export const LESAO_LOCAL_CHIPS = ['Sim, cotovelo', 'Sim, ombro', 'Punho ou outro lugar']

export function getFixedQuestionText(field: FieldKey): string {
  return FIELD_DEFS.find(d => d.key === field)?.question ?? ''
}

export function getChipsForField(field: FieldKey): string[] {
  return FIELD_DEFS.find(d => d.key === field)?.chips ?? []
}

export const AKINATOR_QUESTION_TEXTS: readonly string[] = FIELD_DEFS.map(d => d.question)

const TOTAL_WEIGHT = FIELD_DEFS.reduce((s, f) => s + f.weight, 0) // = 100

function detectPresence(input: Record<string, unknown>, key: FieldKey): { present: boolean; value?: unknown } {
  if (key === 'lesao') {
    const c = 'cotovelo_sensivel' in input && input.cotovelo_sensivel != null
    const o = 'ombro_sensivel' in input && input.ombro_sensivel != null
    const p = 'punho_sensivel' in input && input.punho_sensivel != null
    const sem = input.sem_lesao === true  // explicit "no pain" answer counts as answered
    return (c || o || p || sem)
      ? { present: true, value: input.cotovelo_sensivel ?? input.ombro_sensivel ?? input.punho_sensivel ?? null }
      : { present: false }
  }
  if (key === 'jogo_aereo') {
    const v = input.jogo_aereo_predominante
    return { present: v != null, value: v }
  }
  const v = input[key]
  return { present: v != null, value: v }
}

export function computeProfileConfidence(
  input: Record<string, unknown>,
  conversationTurns: number,
  intencao?: string
): ConfidenceInfo {
  const presentFields: ConfidenceFieldInfo[] = []
  const missingFields: ConfidenceFieldInfo[] = []

  for (const def of FIELD_DEFS) {
    const { present, value } = detectPresence(input, def.key)
    const info: ConfidenceFieldInfo = {
      key:     def.key,
      label:   def.label,
      weight:  def.weight,
      present,
      value,
      chips: present ? undefined : def.chips,
    }
    ;(present ? presentFields : missingFields).push(info)
  }

  const rawScore = presentFields.reduce((s, f) => s + f.weight, 0)
  const score = Math.round((rawScore / TOTAL_WEIGHT) * 100)

  const { threshold, maxQuestions } = CONFIDENCE_CONFIG
  const thresholdReason = `lesão e nível obrigatórios → ${threshold}% (sem nível: max 72% < limiar; sem lesão: max 78% < limiar; estilo+nível+lesão=82% ≥ limiar)`

  const recommendAnyway = conversationTurns >= maxQuestions
  const willRecommend   = score >= threshold || recommendAnyway

  // dor_mencionada: model extracted a pain signal in apertura but location not confirmed by chip.
  // When true, skip the yes/no lesão question and go straight to location (cotovelo/ombro/punho).
  const dorMencionada = input.dor_mencionada === true && missingFields.some(f => f.key === 'lesao')

  let nextQuestion: ConfidenceQuestion | null = null
  if (!willRecommend && missingFields.length > 0) {
    let top: ConfidenceFieldInfo
    if (intencao === 'lesao_dor' || dorMencionada) {
      // Pain context: ask lesão location before style/level
      top = missingFields.find(f => f.key === 'lesao') ?? [...missingFields].sort((a, b) => b.weight - a.weight)[0]
    } else {
      top = [...missingFields].sort((a, b) => b.weight - a.weight)[0]
    }
    const def = FIELD_DEFS.find(d => d.key === top.key)!
    // When dorMencionada and the question is lesão: use location-only chips (no "Não tenho dor")
    if (dorMencionada && def.key === 'lesao') {
      nextQuestion = {
        field:         'lesao',
        label:         'Lugar da dor',
        chips:         LESAO_LOCAL_CHIPS,
        justification: 'dor mencionada na abertura — precisar o local antes de continuar',
      }
    } else {
      nextQuestion = {
        field:         def.key,
        label:         def.label,
        chips:         def.chips,
        justification: def.justification,
      }
    }
  }

  return {
    score,
    threshold,
    thresholdReason,
    willRecommend,
    decisionTaken:  willRecommend ? 'recomendar' : 'perguntar',
    presentFields,
    missingFields,
    nextQuestion,
    questionRound:  conversationTurns,
    maxQuestions,
    recommendAnyway,
    dorMencionada,
  }
}
