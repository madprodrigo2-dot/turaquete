import Anthropic from '@anthropic-ai/sdk'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompt'
import { PRICING, TokenUsage } from './pricing'
import { buscarRaquetas, detalleRaqueta, getRaquetasByIds, RacketFilters, RecommendedRacket, RacketWithInsights, Insights } from '../recommend'
import { calcular_faixa_ideal_traced, computeScorerWeights, FaixaIdeal, FittingProfile } from '../scorer'
import type { DecisionTrace, FilterStep, PrecoDecision, MarcaDecision } from '../debug-types'
import { computeProfileConfidence, CONFIDENCE_CONFIG, getFixedQuestionText, getChipsForField, PRECO_QUESTION_TEXT, LESAO_LOCAL_QUESTION_TEXT, type ConfidenceInfo, type FieldKey } from './confidence'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = PRICING.model
const MAX_TOKENS = 1200  // 1024 was tight for tool call JSON; 1200 fits full rec text with brevity prompt
const MAX_TOOL_ROUNDS = 4  // normal flows need ≤4 rounds (troca+marca-filtro worst case)

const MARCA_QUESTION_TEXT = 'Tem alguma marca que você curte ou tanto faz?'
const MARCA_FILTRO_QUESTION_TEXT = 'Quer ver só de uma marca específica?'
const MARCA_CHIPS = ['AMA Sport', 'Drop Shot', "Heroe's", 'Tanto faz']  // kept for backward compat
const BRAND_BOOST = 1.5  // must match recommend.ts BRAND_BOOST

const PRECO_BUCKETS: Array<{ label: string; instrucao: string; min: number; max: number | null }> = [
  { label: 'Até R$1.000',       instrucao: 'presupuesto_max=1000',                        min: 0,    max: 1000 },
  { label: 'R$1.000 a R$2.000', instrucao: 'presupuesto_min=1001 + presupuesto_max=2000', min: 1001, max: 2000 },
  { label: 'R$2.000 a R$3.000', instrucao: 'presupuesto_min=2001 + presupuesto_max=3000', min: 2001, max: 3000 },
  { label: 'Mais de R$3.000',   instrucao: 'presupuesto_min=3001 (sem teto)',              min: 3001, max: null },
]

// Always show all 4 buckets — do not filter by candidate prices, as candidates
// reflect a mid-range query and would suppress the cheapest and most expensive options.
function computePrecoChips(_ranked: Array<{ price: number | null }>): string[] {
  return [...PRECO_BUCKETS.map(b => b.label), 'Tanto faz / me mostra opções']
}

// Price question is mandatory after profile fit — always ask when budget is unknown.
// Spread heuristic removed: a narrow spread among candidates doesn't mean the user's
// budget fits them; one extra turn is always worth the transparency.
function computePrecoDecision(budgetKnown: boolean): PrecoDecision {
  return budgetKnown
    ? { status: 'budget_known', note: 'usuário informou faixa de preço' }
    : { status: 'disparo',      note: 'orçamento desconhecido → perguntar faixa obrigatoriamente' }
}

// Known price-range answers — module-level so post-rec state detection can reference them
const PRICE_ANSWERS = new Set([
  'Até R$1.000', 'R$1.000 a R$2.000', 'R$2.000 a R$3.000', 'Mais de R$3.000',
  'Até R$1.500', 'R$1.500–2.500', 'R$2.500–3.500', 'Acima de R$3.500', 'Acima de R$2.500', 'Acima de R$3.000',
  'Tanto faz / me mostra opções',
])

// Fixed post-recommendation action chips and types
const POST_REC_CHIPS = ['Ver mais opções', 'Outra faixa de preço', 'Outra marca'] as const
const POST_REC_REDIRECT_TEXT = 'Posso te mostrar mais opções, outra faixa de preço ou outra marca. É só tocar.'
export type PostRecContext = { shownIds: number[]; shownBrands: string[]; marcaListPending?: boolean }
type PostRecMode = 'ver_mais' | 'outra_marca' | 'outra_faixa' | 'escolher_marca' | 'livre'
type PostRecCtx = { mode: PostRecMode | null; shownIds: Set<number>; shownBrands: Set<string> }

// Stable system prompt as a cacheable block — sent on every turn but only billed
// once per cache TTL (~5 min). Dynamic injections (FAIXA VINCULANTE) are appended
// as a second uncached block in streamResponse.
const SYSTEM_CACHED: Anthropic.TextBlockParam[] = [{
  type: 'text',
  text: SYSTEM_PROMPT,
  cache_control: { type: 'ephemeral' },
}]

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type IntencaoTipo =
  | 'primeira_raquete' | 'troca' | 'ajuste_da_atual' | 'lesao_dor'
  | 'comparacao' | 'compra_direta' | 'presente' | 'preco_orcamento' | 'curiosidade' | 'outra'

export type AgentDebugInfo = {
  perfilInput?: Record<string, unknown>
  scorerResults?: Array<{
    id: number; name: string; score: number
    weight_g: number | null; elbow_friendly?: boolean | null; fora_da_faixa?: boolean
  }>
  criteriosRelaxados?: string[]
  decisionTrace?: DecisionTrace
  confidenceInfo?: ConfidenceInfo
  filteredPoolSize?: number  // candidates available after shownIds filter (used to decide if "Ver mais" should appear)
}

export type AgentResult = {
  text: string
  recommendations?: RecommendedRacket[]
  suggestions?: string[]
  isComparison?: boolean
  diagnostico?: FaixaIdeal
  intencao?: IntencaoTipo
  marcaListPending?: boolean
  usage: TokenUsage
  debug: AgentDebugInfo
}

export type { FaixaIdeal, TokenUsage }

type RecommendInput = {
  raquetes: Array<{ id: number; razao: string }>
  tipo?: 'recomendacao' | 'comparacao'
}

type SuggestInput = {
  opcoes: string[]
}

function addUsage(acc: TokenUsage, u: Anthropic.Usage): void {
  const ux = u as unknown as Record<string, number>
  acc.input      += u.input_tokens
  acc.output     += u.output_tokens
  acc.cacheRead  += ux.cache_read_input_tokens    ?? 0
  acc.cacheWrite += ux.cache_creation_input_tokens ?? 0
}

// Marks rackets with fora_da_faixa and sorts in-range first.
// Tolerance ±5g accounts for factory variation; spec rule: a 330g nominal racket
// is never "in range" for a 320g-max faixa (330 > 320+5).
function applyFaixaFilter(
  raquetes: (RacketWithInsights & { match_score: number })[],
  faixa: FaixaIdeal
): (RacketWithInsights & { match_score: number; fora_da_faixa: boolean })[] {
  // Factory variation is ±10g. A racket is only "out of range" when its full
  // factory range (nominal ±10g) doesn't overlap the faixa at all.
  // Example: nominal 330g → range 320–340g. Faixa up to 325g → overlap exists → NOT fora.
  // Example: nominal 345g → range 335–355g. Faixa up to 325g → no overlap → fora.
  const VARIACAO_FABRICA = 10
  const marked = raquetes.map(r => {
    const peso = r.weight_g
    const fora = peso != null
      ? (peso - VARIACAO_FABRICA) > faixa.peso_max || (peso + VARIACAO_FABRICA) < faixa.peso_min
      : false
    return { ...r, fora_da_faixa: fora }
  })
  return marked.sort((a, b) => {
    // Three tiers: weight known+in-range (0) → weight unknown (1) → out of range (2)
    // Null weight stays fora_da_faixa=false but sorts after all rackets with confirmed fit.
    const aTier = a.fora_da_faixa ? 2 : a.weight_g == null ? 1 : 0
    const bTier = b.fora_da_faixa ? 2 : b.weight_g == null ? 1 : 0
    if (aTier !== bTier) return aTier - bTier
    return b.match_score - a.match_score
  })
}

// Chip text → deterministic profile field value.
// Texts must match FIELD_DEFS exactly (confidence.ts) plus the starter chip "Sou iniciante".
// Keys match FittingProfile (scorer.ts) and the confidence input shape.
const CHIP_TO_PROFILE: Record<string, Record<string, unknown>> = {
  'Ataque (potência, smash)':   { estilo: 'ofensivo' },
  'Defesa e controle':           { estilo: 'defensivo' },
  'Equilibrado':                 { estilo: 'misto' },
  'Estou começando (cat. E/D)': { nivel: 'iniciante' },
  'Intermediário (cat. C/B)':   { nivel: 'intermediario' },
  'Avançado (cat. A/Pro)':      { nivel: 'avancado' },
  'Sou iniciante':              { nivel: 'iniciante' },
  'Minha batida é forte':       { forca_declarada: 'forte' },
  'Minha batida é suave':       { forca_declarada: 'fraca' },
  'Jogo muito na rede':         { jogo_aereo_predominante: true },
  'Prefiro o fundo de quadra':  { jogo_aereo_predominante: false },
  'Sim, cotovelo':              { cotovelo_sensivel: true },
  'Sim, ombro':                 { ombro_sensivel: true },
  'Punho ou outro lugar':       { punho_sensivel: true },
  'Não tenho dor':              { sem_lesao: true },
}

// Fixed reactions for chip turns — short, warm, no emoji, no em-dash.
// Keyed by exact chip text from FIELD_DEFS (confidence.ts).
const CHIP_REACTIONS: Record<string, string> = {
  'Ataque (potência, smash)':  'Ofensivo, entendido.',
  'Defesa e controle':          'Defesa e controle, anotado.',
  'Equilibrado':                'Equilibrado, ótimo.',
  'Estou começando (cat. E/D)': 'Legal, iniciante!',
  'Intermediário (cat. C/B)':   'Intermediário, ótimo.',
  'Avançado (cat. A/Pro)':      'Avançado, excelente.',
  'Sou iniciante':              'Legal, iniciante!',
  'Minha batida é forte':       'Batida forte, anotado.',
  'Minha batida é suave':       'Batida mais suave, entendido.',
  'Jogo muito na rede':         'Rede, entendido.',
  'Prefiro o fundo de quadra':  'Fundo de quadra, certo.',
  'Sim, cotovelo':              'Entendido, cotovelo no radar.',
  'Sim, ombro':                 'Ombro no radar, certo.',
  'Punho ou outro lugar':       'Punho, anotado.',
  'Não tenho dor':              'Sem dor, ótimo.',
}
const CHIP_REACTION_FALLBACK = 'Tá bom.'

// Scan user chip messages in history → build confirmed profile.
// Chip-answered fields are immune to model omission or re-inference between turns.
function extractConfirmedProfileFromHistory(history: ChatMessage[]): Record<string, unknown> {
  const confirmed: Record<string, unknown> = {}
  for (const m of history) {
    if (m.role !== 'user') continue
    const update = CHIP_TO_PROFILE[m.content.trim()]
    if (update) Object.assign(confirmed, update)
  }
  // Also capture nivel from first-person declarations in free text when no chip was used.
  // Covers TROCA/lesao flows where the user states their level in the opening message.
  // First-person pattern ("sou iniciante") avoids false positives like "meu parceiro é avançado".
  if (confirmed.nivel == null) {
    for (const m of history) {
      if (m.role !== 'user') continue
      const t = m.content.toLowerCase()
      if (/\bsou iniciante\b|\bestou começando\b|\bsou novato\b/.test(t)) { confirmed.nivel = 'iniciante'; break }
      if (/\bsou intermediári[oa]\b/.test(t))                             { confirmed.nivel = 'intermediario'; break }
      if (/\bsou avançad[oa]\b/.test(t))                                  { confirmed.nivel = 'avancado'; break }
    }
  }
  return confirmed
}

// ── Razão guard ─────────────────────────────────────────────────────────────
// The model is instructed not to cite numeric scores in the razao, but as a
// backstop we scan for patterns like "spin 9" and cross-check with real data.
// Any mismatch beyond tolerance is replaced with a code-generated fallback.

type InsightKey = 'power' | 'control' | 'comfort' | 'maneuverability' | 'stability' | 'spin' | 'forgiveness'

const DIM_PT_LABEL: Record<InsightKey, string> = {
  power: 'potência', control: 'controle', comfort: 'conforto',
  maneuverability: 'manuseio', stability: 'estabilidade', spin: 'spin', forgiveness: 'sweet spot',
}

// Each tuple: [field key, regex matching Portuguese/English aliases]
const DIM_PATTERNS: Array<[InsightKey, RegExp]> = [
  ['power',           /\b(?:potên?cia|power)\b/],
  ['control',         /\b(?:controle?|control)\b/],
  ['comfort',         /\b(?:conforto|comfort)\b/],
  ['maneuverability', /\b(?:manuseio|maneuverabilidade)\b/],
  ['stability',       /\b(?:estabilidade|stability)\b/],
  ['spin',            /\bspin\b/],
  ['forgiveness',     /\b(?:sweet\s+spot|forgiveness)\b/],
]

const RAZAO_TOLERANCE = 2  // ±2 points considered close enough; beyond this → fallback

function getInsightScore(ins: Insights, key: InsightKey): number | null {
  const val: unknown = ins[key as keyof Insights]
  return typeof val === 'number' ? val : null
}

function fallbackRazao(ins: Insights): string {
  const ranked = (Object.keys(DIM_PT_LABEL) as InsightKey[])
    .map(k => ({ k, v: getInsightScore(ins, k) ?? 0 }))
    .filter(e => e.v > 0)
    .sort((a, b) => b.v - a.v)
  if (ranked.length === 0) return 'Ótima opção para o seu perfil.'
  const top = ranked.slice(0, 2).map(e => DIM_PT_LABEL[e.k])
  return `Destaque: ${top.join(' e ')}.`
}

function validateRazao(razao: string, ins: Insights | null): string {
  if (!ins) return razao
  for (const [key, re] of DIM_PATTERNS) {
    // Matches: "spin 9", "controle: 8", "potência de 7", "spin de 9/10"
    const combined = new RegExp(`${re.source}\\s*(?::|de\\s+)?\\s*(\\d+(?:[.,]\\d+)?)`, 'gi')
    let m: RegExpExecArray | null
    while ((m = combined.exec(razao)) !== null) {
      const cited = parseFloat(m[1].replace(',', '.'))
      if (cited < 1 || cited > 10) continue
      const real = getInsightScore(ins, key)
      if (real === null) continue
      if (Math.abs(cited - real) > RAZAO_TOLERANCE) {
        console.warn(`[razao-guard] "${key}" cited=${cited} real=${real} — replacing with fallback`)
        return fallbackRazao(ins)
      }
    }
  }
  return razao
}

// ─────────────────────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  pendingRecommendations: RecommendedRacket[],
  pendingSuggestions: string[],
  diagnosticoRef: { value: FaixaIdeal | null },
  intencaoRef: { value: IntencaoTipo | null },
  debugRef: { value: AgentDebugInfo },
  profileQuestionsAsked: number,
  priceAskPendingRef: { value: boolean },
  pendingQuestionFieldRef: { value: string | null },
  marcaAskPendingRef: { value: boolean },
  brandAskedRef: { value: boolean },
  currentRacketIds: Set<number>,
  currentRacketNotFoundRef: { value: boolean },
  confirmedProfile: Record<string, unknown>,
  budgetAnsweredRef: { value: boolean },
  precoChipsRef: { value: string[] },
  marcaChipsRef: { value: string[] },
  showAllBrandsRef: { value: boolean },
  confirmedMarca: string | null | undefined,
  chatHistory: readonly ChatMessage[],
  postRecCtx?: PostRecCtx
): Promise<string> {
  if (name === 'registrar_intencao') {
    intencaoRef.value = input.intencao as IntencaoTipo
    return JSON.stringify({ registrado: true })
  }

  if (name === 'diagnosticar_perfil') {
    // Detect pain signal BEFORE stripping — model may have inferred cotovelo/ombro from vague text
    // like "braço". We strip the specific location (unreliable model inference) but preserve the
    // pain-present signal so the code can skip the yes/no lesão question and go straight to location.
    const modelDetectedPain = !!(input.cotovelo_sensivel || input.ombro_sensivel || input.punho_sensivel)

    // Strip lesão fields — prevent model from inferring cotovelo/ombro from free text like "braço".
    // Then inject all chip-confirmed fields (estilo, nível, força, jogo aéreo, lesão).
    // Chip answers override model values, guaranteeing no dimension reappears as missing once answered.
    const safeInput = { ...input }
    delete safeInput.cotovelo_sensivel
    delete safeInput.ombro_sensivel
    delete safeInput.punho_sensivel
    delete safeInput.sem_lesao
    Object.assign(safeInput, confirmedProfile)

    // If model detected pain but chip hasn't confirmed location yet → set dor_mencionada.
    // This tells confidence to: (a) prioritize lesão question, (b) use location-only chips.
    const locationResolvedByChip = !!(confirmedProfile.cotovelo_sensivel || confirmedProfile.ombro_sensivel || confirmedProfile.punho_sensivel || confirmedProfile.sem_lesao)
    if (modelDetectedPain && !locationResolvedByChip) {
      safeInput.dor_mencionada = true
    }
    // Fallback: when intent is 'lesao_dor', pain was explicitly mentioned in the apertura.
    // The model is instructed NOT to guess the location, so it won't pass pain fields for
    // generic pain like "dor no braço". Use the intent as the pain signal so the Akinator
    // shows location-only chips (cotovelo/ombro/punho) instead of the full yes/no question.
    if (intencaoRef.value === 'lesao_dor' && !locationResolvedByChip && !safeInput.dor_mencionada) {
      safeInput.dor_mencionada = true
    }

    const { faixa, trace } = calcular_faixa_ideal_traced(safeInput as FittingProfile)
    diagnosticoRef.value = faixa
    debugRef.value.perfilInput = safeInput
    if (!debugRef.value.decisionTrace) debugRef.value.decisionTrace = {}
    debugRef.value.decisionTrace.faixaSteps = trace.steps
    debugRef.value.decisionTrace.conflitos = trace.conflitos

    // Compute profile confidence — pass intent so lesao_dor forces lesão question first
    const confidence = computeProfileConfidence(safeInput, profileQuestionsAsked, intencaoRef.value ?? undefined)
    debugRef.value.confidenceInfo = confidence

    const baseResult = {
      peso_min: faixa.peso_min,
      peso_max: faixa.peso_max,
      balance_preferido: faixa.balance_preferido,
      prioridades: faixa.prioridades,
      descricao: `${faixa.peso_min}–${faixa.peso_max}g, balance ${faixa.balance_preferido}, priorize ${faixa.prioridades.join(', ')}`,
      DADO_VINCULANTE: `Narre EXATAMENTE "${faixa.peso_min}–${faixa.peso_max}g" no diagnóstico. PROIBIDO usar outros valores de peso. Estes números vieram do código e são definitivos.`,
    }

    if (!confidence.willRecommend && confidence.nextQuestion) {
      const q = confidence.nextQuestion
      // 'lesao_local' signals streamResponse to use the location-only question text instead of
      // the full yes/no lesão question. The JSON campo stays 'lesao' so the model understands context.
      pendingQuestionFieldRef.value = confidence.dorMencionada ? 'lesao_local' : q.field
      // Auto-populate chips here so streamResponse always injects the fixed question text,
      // regardless of whether the model calls sugerir_opcoes. This eliminates an extra
      // API round per question turn and prevents paraphrase-based orphaned chips.
      pendingSuggestions.splice(0, pendingSuggestions.length, ...q.chips)
      return JSON.stringify({
        CONFIANCA_DO_PERFIL: {
          score_pct: confidence.score,
          threshold_pct: confidence.threshold,
          status: 'INSUFICIENTE',
          proxima_pergunta: {
            campo: q.field,
            label: q.label,
            chips: q.chips,
            justificativa: q.justification,
          },
          instrucao_OBRIGATORIA:
            `Confiança ${confidence.score}% < ${confidence.threshold}% mínima. ` +
            `Os chips já foram configurados pelo sistema — NÃO chame sugerir_opcoes. ` +
            `AÇÃO: escreva SOMENTE uma frase curta de acolhimento do que a pessoa disse (ex: "Entendido!", "Boa!", "Tá certo!"). ` +
            `NÃO escreva a pergunta — o código a injetará automaticamente após o acolhimento. ` +
            `PROIBIDO mostrar perfil ideal, peso ou balance agora. ` +
            `PROIBIDO chamar buscar_raquetas, recomendar_raquetas ou sugerir_opcoes nesta resposta.`,
        },
      })
    }

    // Confidence sufficient (or recommend anyway after max turns)
    const recommendAnywayNote = confidence.recommendAnyway && confidence.score < confidence.threshold
      ? `Perfil incompleto (${confidence.score}%) mas rodadas esgotadas. Recomende com honestidade: "com o que você me deu, essas são as mais seguras; me conte mais se quiser afinar".`
      : null

    return JSON.stringify({
      ...baseResult,
      CONFIANCA_DO_PERFIL: {
        score_pct: confidence.score,
        threshold_pct: confidence.threshold,
        status: 'SUFICIENTE',
        ...(recommendAnywayNote ? { aviso: recommendAnywayNote } : {}),
      },
    })
  }

  if (name === 'buscar_raquetas') {
    // Block re-search while a price or brand question is pending in this same turn.
    // Prevents the model from calling buscar_raquetas with presupuesto_min=0 before
    // the user has actually answered the price question.
    const isLookupCall = !!(input as RacketFilters).nome || !!(input as RacketFilters).atleta
    // Block re-lookup when current racket was already confirmed absent — prevents LLM from
    // burning tokens on a second name search for the same unknown racket.
    if (isLookupCall && currentRacketNotFoundRef.value) {
      return JSON.stringify({
        erro: 'RAQUETE_JA_FORA_DO_CATALOGO',
        instrucao: 'A raquete atual já foi marcada como fora do catálogo. NÃO busque pelo nome novamente. Continue o fluxo de perfil normalmente.',
      })
    }
    // Block profile search when diagnosticar_perfil already signalled INSUFICIENTE this turn.
    // Without this guard: diagnosticar returns lesão-pending → model calls buscar_raquetas →
    // pendingQuestionFieldRef is overwritten with 'preco' → two questions bundled, chips for only one.
    // Lookup calls (nome/atleta) are exempt — they identify the current racket in TROCA flow.
    if (debugRef.value.confidenceInfo?.willRecommend === false && !isLookupCall) {
      return JSON.stringify({
        erro: 'PERFIL_INSUFICIENTE',
        instrucao: 'Confiança do perfil insuficiente: chame sugerir_opcoes com a pergunta indicada por diagnosticar_perfil e aguarde o usuário responder ANTES de buscar raquetes. Não chame buscar_raquetas nesta resposta.',
      })
    }
    if ((priceAskPendingRef.value || marcaAskPendingRef.value) && !isLookupCall) {
      return JSON.stringify({
        erro: 'AGUARDANDO_RESPOSTA_USUARIO',
        instrucao: 'Uma pergunta foi emitida ao usuário neste turno. Aguarde a resposta antes de buscar novamente. NÃO use presupuesto_min=0 como substituto — aguarde a resposta real.',
      })
    }
    // Any call to buscar_raquetas after the brand question clears the pending flag
    if (marcaAskPendingRef.value && (input as RacketFilters).marca_preferida !== undefined) {
      marcaAskPendingRef.value = false
    }
    // Inject confirmed brand preference when the model forgot to include it in the call.
    // confirmedMarca is derived from history (user's response after brand question text) so
    // the brand boost is applied even if the model omits marca_preferida on subsequent turns.
    const effectiveFilters: RacketFilters =
      confirmedMarca !== undefined && (input as RacketFilters).marca_preferida === undefined
        ? { ...(input as RacketFilters), marca_preferida: confirmedMarca }
        : (input as RacketFilters)
    // Strip presupuesto_max from DB query — budget ceiling is soft-applied below
    // so rackets above budget are flagged (fora_da_faixa_preco), never silently excluded.
    const presupuestoMaxBudget = effectiveFilters.presupuesto_max
    const filtersForDb: RacketFilters = presupuestoMaxBudget != null
      ? { ...effectiveFilters, presupuesto_max: undefined }
      : effectiveFilters
    const { raquetes, criteriosRelaxados, filterTrace, yearMatchInfo } = await buscarRaquetas(filtersForDb)
    const rankedBase = diagnosticoRef.value ? applyFaixaFilter(raquetes, diagnosticoRef.value) : raquetes
    // Soft budget sort: mark rackets above declared max, sort in-budget first
    const ranked = presupuestoMaxBudget != null
      ? rankedBase.map(r => ({
          ...r,
          fora_da_faixa_preco: r.price != null && r.price > presupuestoMaxBudget,
        })).sort((a, b) => {
          if (a.fora_da_faixa_preco !== b.fora_da_faixa_preco) return a.fora_da_faixa_preco ? 1 : -1
          const aFora = (a as { fora_da_faixa?: boolean }).fora_da_faixa ?? false
          const bFora = (b as { fora_da_faixa?: boolean }).fora_da_faixa ?? false
          const aTier = aFora ? 2 : a.weight_g == null ? 1 : 0
          const bTier = bFora ? 2 : b.weight_g == null ? 1 : 0
          if (aTier !== bTier) return aTier - bTier
          return b.match_score - a.match_score
        })
      : rankedBase.map(r => ({ ...r, fora_da_faixa_preco: false as boolean }))
    debugRef.value.scorerResults = ranked.slice(0, 10).map(r => ({
      id: r.id,
      name: r.name,
      score: r.match_score,
      weight_g: r.weight_g,
      elbow_friendly: r.racket_insights?.elbow_friendly ?? null,
      fora_da_faixa: (r as { match_score: number; fora_da_faixa?: boolean }).fora_da_faixa ?? false,
    }))
    debugRef.value.criteriosRelaxados = criteriosRelaxados

    // Build extended filter trace: SQL/soft steps + faixa weight step
    if (!debugRef.value.decisionTrace) debugRef.value.decisionTrace = {}
    const extendedTrace: FilterStep[] = [...filterTrace]
    if (diagnosticoRef.value) {
      const faixa = diagnosticoRef.value
      const foraCount = ranked.filter(r => (r as { fora_da_faixa?: boolean }).fora_da_faixa).length
      extendedTrace.push({
        filtro: `faixa de peso ${faixa.peso_min}–${faixa.peso_max}g (variação fabril ±10g)`,
        antes: ranked.length,
        depois: ranked.length,
        relaxado: false,
        note: `${ranked.length - foraCount} com range ±10g sobreposto à faixa, ${foraCount} sem sobreposição (mantidos, penalizados no ranking)`,
      })
    }
    debugRef.value.decisionTrace.filterSteps = extendedTrace
    debugRef.value.decisionTrace.scorerWeights = computeScorerWeights(input as RacketFilters)

    // Trim the payload sent to the model: top 8 candidates (scorer already ranked them)
    // + strip fields the model doesn't use for narration, reducing token cost ~85%.
    const ADMIN_SPECS = new Set(['imagem_fonte', 'preco_fonte', 'preco_tipo', 'preco_atualizado_em'])
    type RankedRacket = RacketWithInsights & { match_score: number; fora_da_faixa?: boolean }
    const slimForModel = (r: RankedRacket) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { affiliate_url, source_url, image_url, currency, publicada, slug, technologies, specs_extra, racket_insights, ...base } = r
      const specsClean = Object.fromEntries(
        Object.entries((specs_extra ?? {}) as Record<string, unknown>).filter(([k]) => !ADMIN_SPECS.has(k))
      )
      const { observations: _obs, summary: _sum, good_for_beginners: _gb, good_for_intermediate: _gi, good_for_advanced: _ga, ...insClean } = (racket_insights ?? {}) as Record<string, unknown>
      return {
        ...base,
        ...(Object.keys(specsClean).length > 0 ? { specs_extra: specsClean } : {}),
        ...(Object.keys(insClean).length > 0 ? { racket_insights: insClean } : {}),
      }
    }
    const MAX_CANDIDATES = 6

    if (ranked.length === 0) {
      // Lookup (nome/atleta) returned nothing — current racket not in catalog.
      // Mark it and return a fixed instruction so the model emits the exact canned text
      // and pivots to profile without inventing specs or re-searching.
      if (isLookupCall) {
        currentRacketNotFoundRef.value = true
        return JSON.stringify({
          encontradas: 0,
          RAQUETE_FORA_DO_CATALOGO: {
            status: 'NAO_ENCONTRADA',
            instrucao_OBRIGATORIA:
              'A raquete atual do usuário NÃO está no catálogo. ' +
              'AÇÃO OBRIGATÓRIA — siga à risca, sem desvios: ' +
              '(1) escreva EXATAMENTE este texto (sem alterar nem parafrasear): "Essa eu não tenho no catálogo, mas fica tranquilo, te indico pela forma como você joga."; ' +
              '(2) em seguida, chame diagnosticar_perfil com o que já sabe e continue o fluxo de perfil normal (nível, lesão, estilo); ' +
              '(3) NUNCA invente specs, peso, balance, stiffness nem generalizações de marca sobre essa raquete — você não tem dados dela; ' +
              '(4) NUNCA chame buscar_raquetas com nome ou atleta novamente para tentar identificá-la.',
          },
        })
      }
      const originalFilters = input as RacketFilters
      // presupuesto_max is now soft-filtered (not a DB hard filter), so 0 results here
      // only happen for presupuesto_min constraints (e.g. "Mais de R$3.000" with no premium matches).
      if (originalFilters.presupuesto_min && originalFilters.presupuesto_min > 0) {
        const { raquetes: raquetesSemOrc, criteriosRelaxados: relSemOrc } = await buscarRaquetas({ ...effectiveFilters, presupuesto_min: undefined, presupuesto_max: undefined })
        const rankedSemOrc = diagnosticoRef.value ? applyFaixaFilter(raquetesSemOrc, diagnosticoRef.value) : raquetesSemOrc
        if (rankedSemOrc.length > 0) {
          const topSemOrc = rankedSemOrc.slice(0, MAX_CANDIDATES).map(slimForModel)
          const cheapest = [...rankedSemOrc].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0]
          const cheapestDesc = cheapest.price != null ? `${cheapest.name} (R$${cheapest.price})` : cheapest.name
          const payload: Record<string, unknown> = {
            encontradas: rankedSemOrc.length,
            raquetes: topSemOrc,
            fora_do_orcamento: true,
            AVISO_ORCAMENTO_OBRIGATORIO: {
              status: 'ZERO_NA_FAIXA',
              faixa_solicitada: `acima de R$${originalFilters.presupuesto_min}`,
              mais_acessivel: cheapestDesc,
              instrucao_OBRIGATORIA:
                `Nenhuma raquete disponível acima de R$${originalFilters.presupuesto_min} para esse perfil. ` +
                `As raquetes listadas estão abaixo desse valor. ` +
                `AÇÃO OBRIGATÓRIA: ` +
                `(1) diga com honestidade que não há opções nessa faixa — ex.: "Acima de R$${originalFilters.presupuesto_min} não tenho opções para esse perfil. A que melhor encaixa disponível é a ${cheapestDesc}."; ` +
                `(2) pergunte se o usuário quer ver essas opções mesmo assim; ` +
                `(3) NÃO chame recomendar_raquetas nesta resposta — espere confirmação.`,
            },
          }
          if (relSemOrc.length > 0) payload.criterios_relaxados = relSemOrc
          return JSON.stringify(payload)
        }
      }
      return JSON.stringify({ encontradas: 0, mensagem: 'Nenhuma raquete encontrada com os critérios informados.' })
    }

    // ── Budget decision ────────────────────────────────────────────────────────
    // presupuesto_min !== undefined covers "tanto faz" (min=0) and "acima de R$X" (min>0).
    // Ask whenever the budget is unknown — candidates being similar in price to each
    // other doesn't help: all of them could be out of the user's budget.
    // Name-based searches (comparison / "mostra essa X") don't need a budget question —
    // the user asked about specific rackets, not a profile-filtered recommendation.
    const isNameSearch = !!(input as RacketFilters).nome
    // "tanto faz" = presupuesto_min=0 explicitly set (user confirmed open budget), no max ceiling
    const isBudgetOpen = !isNameSearch && (input as RacketFilters).presupuesto_min === 0 && !(input as RacketFilters).presupuesto_max
    const budgetKnown = isNameSearch || !!(input as RacketFilters).presupuesto_max
      || (input as RacketFilters).presupuesto_min !== undefined
      || budgetAnsweredRef.value
    const priceDecision = computePrecoDecision(budgetKnown)
    debugRef.value.decisionTrace!.precoDecision = priceDecision
    priceAskPendingRef.value = priceDecision.status === 'disparo'
    if (priceDecision.status === 'disparo') {
      pendingQuestionFieldRef.value = 'preco'
      // Pre-populate chips — skips the sugerir_opcoes API round; the short-circuit
      // break below exits the while loop immediately after buscar_raquetas resolves.
      const chips = computePrecoChips(ranked)
      precoChipsRef.value = chips
      pendingSuggestions.splice(0, pendingSuggestions.length, ...chips)
    }

    // Price tiebreaker: when budget is open, among near-equal candidates (score diff ≤ 0.3)
    // the cheaper one rises — so the model is more likely to pick/present it first.
    // Never sacrifices aptitude: only breaks genuine ties, preserves fora_da_faixa priority.
    type AnyRanked = { match_score: number; price: number | null; fora_da_faixa?: boolean }
    const candidatePool = isBudgetOpen
      ? [...ranked].sort((a, b) => {
          const aFora = (a as AnyRanked).fora_da_faixa ?? false
          const bFora = (b as AnyRanked).fora_da_faixa ?? false
          if (aFora !== bFora) return aFora ? 1 : -1
          const scoreDiff = b.match_score - a.match_score
          const aPrice = a.price
          const bPrice = b.price
          if (Math.abs(scoreDiff) <= 0.3 && aPrice != null && bPrice != null && aPrice !== bPrice) {
            return aPrice - bPrice
          }
          return scoreDiff
        })
      : ranked

    // Post-rec filtering: exclude shown IDs ("Ver mais opções") or shown brands ("Outra marca")
    const filteredPool = postRecCtx?.mode === 'ver_mais'
      ? candidatePool.filter(r => !postRecCtx!.shownIds.has(r.id))
      : postRecCtx?.mode === 'outra_marca'
      ? candidatePool.filter(r => !postRecCtx!.shownBrands.has((r as { brands?: { name: string } | null }).brands?.name ?? ''))
      : candidatePool
    if (postRecCtx?.mode === 'outra_marca' && filteredPool.length === 0 && candidatePool.length > 0) {
      return JSON.stringify({
        encontradas: 0,
        POST_REC_SEM_OUTRA_MARCA: {
          instrucao_OBRIGATORIA:
            `Para esse perfil, as melhores candidatas são todas das marcas já mostradas (${[...postRecCtx.shownBrands].join(', ')}). ` +
            `AÇÃO OBRIGATÓRIA: informe honestamente que não há candidatas de outras marcas e ofereça ampliar a faixa de preço ou relaxar um critério de perfil.`,
        },
      })
    }

    // Disambiguation: when a lookup (nome/atleta) returns multiple candidates, inject a
    // fixed question text so the model's sugerir_opcoes chips are never orphaned.
    if (isLookupCall && ranked.length > 1) {
      const rawTerm = (input as RacketFilters).nome ?? (input as RacketFilters).atleta ?? 'raquete'
      const term = rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1)
      pendingQuestionFieldRef.value = `disambig:${term}`
    }

    const topCandidates = filteredPool.slice(0, MAX_CANDIDATES).map(slimForModel)
    debugRef.value.filteredPoolSize = filteredPool.length
    const payload: Record<string, unknown> = {
      encontradas: ranked.length,
      raquetes: topCandidates,
      ...(ranked.length > MAX_CANDIDATES ? { nota: `Exibindo top ${MAX_CANDIDATES} de ${ranked.length} candidatas ordenadas por relevância.` } : {}),
    }
    if (criteriosRelaxados.length > 0) payload.criterios_relaxados = criteriosRelaxados

    // ── Pool reduzida — previne loop com 1 candidata ────────────────────────────
    const POOL_MIN_SIZE = 3
    const isPoolTight = !isLookupCall && !isNameSearch && ranked.length > 0 && ranked.length < POOL_MIN_SIZE && !priceAskPendingRef.value
    if (isPoolTight) {
      const alreadySeen = ranked.some(r =>
        chatHistory.some(m => m.role === 'assistant' && m.content.includes(r.name))
      )
      payload.POOL_REDUZIDA = {
        status: alreadySeen ? 'JA_RECOMENDADA' : 'PRIMEIRA_VEZ',
        candidatas: ranked.length,
        instrucao: alreadySeen
          ? `Essa raquete ja foi recomendada nessa conversa. NAO refaca a apresentacao completa. ` +
            `Reconheca brevemente a limitacao ("pro teu perfil, so tenho essa no momento") ` +
            `e ofereça UMA acao concreta: relaxar nivel, peso, marca ou orcamento. ` +
            `Se o usuario pediu algo especifico (ex: outra marca, preco diferente), execute esse pedido.`
          : `Pool reduzida (${ranked.length} candidata${ranked.length > 1 ? 's' : ''} para esse perfil). ` +
            `Apresente de forma direta e curta. No final, ofereça relaxar um criterio concreto para ampliar as opcoes.`,
      }
    }

    // ── Marca debug data ────────────────────────────────────────────────────────
    const marcaJaFornecida = effectiveFilters.marca_preferida !== undefined

    // Capture MarcaDecision for debug
    const marcaPreferida = effectiveFilters.marca_preferida ?? null
    const racketsDaMarca = marcaPreferida
      ? ranked.filter(r => (r as { brands?: { name: string } | null }).brands?.name?.toLowerCase() === marcaPreferida.toLowerCase()).length
      : 0
    const topNaoEDaMarca = marcaPreferida && ranked.length > 0
      ? (ranked[0] as { brands?: { name: string } | null }).brands?.name?.toLowerCase() !== marcaPreferida.toLowerCase()
      : false
    const marcaDecisionData: MarcaDecision = {
      marcaPreferida,
      boost: BRAND_BOOST,
      racketsDaMarca,
      topNaoEDaMarca: !!topNaoEDaMarca,
    }
    if (!debugRef.value.decisionTrace) debugRef.value.decisionTrace = {}
    debugRef.value.decisionTrace.marcaDecision = marcaDecisionData

    // Brand no-match: model must not label another brand's racket as the preferred brand
    if (marcaPreferida && racketsDaMarca === 0 && ranked.length > 0) {
      payload.AVISO_MARCA_SEM_MATCH = {
        status: 'MARCA_SEM_CANDIDATA',
        marca_pedida: marcaPreferida,
        instrucao_OBRIGATORIA:
          `Nenhuma raquete de "${marcaPreferida}" encaixa nesse perfil. ` +
          `OBRIGATORIO: (1) diga "nao tenho ${marcaPreferida} que bata nesse perfil"; ` +
          `(2) ofereça a melhor disponivel etiquetada com a marca REAL (ex: "a melhor que tenho e a [nome] da [marca real]"); ` +
          `(3) NUNCA chame uma raquete de outra marca de "${marcaPreferida}" nem implique que e da marca pedida.`,
      }
    }

    if (priceDecision.status === 'disparo') {
      // Chips already pre-populated above in the priceDecision block.
      const bucketMappings = PRECO_BUCKETS
        .map(b => `"${b.label}" → ${b.instrucao}`)
        .concat(['"Tanto faz / me mostra opções" → presupuesto_min=0 (sem filtro de preço)'])
        .join('; ')
      payload.PRECO = {
        status: 'ORCAMENTO_DESCONHECIDO',
        instrucao_OBRIGATORIA:
          `Orçamento não informado. ` +
          `AÇÃO OBRIGATÓRIA: escreva UMA frase curta de transição (ex: "Achei boas opções pra você!", "Encontrei candidatas pro seu perfil."). NÃO escreva a pergunta de preço — o sistema a injetará automaticamente (chips já configurados — NÃO chame sugerir_opcoes). ` +
          `PROIBIDO chamar recomendar_raquetas antes de receber a resposta. ` +
          `Após receber a faixa, chame buscar_raquetas novamente com os filtros: ${bucketMappings}.`,
      }
    } else {
      const inFaixaCount = presupuestoMaxBudget != null
        ? ranked.filter(r => !(r as { fora_da_faixa_preco?: boolean }).fora_da_faixa_preco).length
        : null
      const overBudgetCount = presupuestoMaxBudget != null
        ? ranked.filter(r => !!(r as { fora_da_faixa_preco?: boolean }).fora_da_faixa_preco).length
        : null
      payload.PRECO = {
        status: 'BUDGET_CONHECIDO',
        note: priceDecision.note,
        ...(isBudgetOpen ? {
          instrucao_custo_beneficio: 'Orçamento aberto ("tanto faz"). Na recomendação, mencione qual opção oferece melhor custo-benefício.',
        } : presupuestoMaxBudget != null ? {
          instrucao_CUSTO_BENEFICIO:
            `Orçamento declarado: até R$${presupuestoMaxBudget}. ` +
            `${inFaixaCount} raquete(s) dentro da faixa (fora_da_faixa_preco=false) — apresente a melhor como recomendação principal com etiqueta de custo-benefício. ` +
            (overBudgetCount && overBudgetCount > 0
              ? `${overBudgetCount} raquete(s) acima do orçamento (fora_da_faixa_preco=true) — mostre-as honestamente como "acima do seu orçamento", NUNCA as omita. Se for a melhor opção de encaixe, mencione UMA vez: "tem opção acima do orçamento que encaixa melhor, se quiser ver."`
              : ''),
        } : {}),
      }
    }

    // Year mismatch: user specified a year that doesn't exist in the catalog.
    // The available model(s) are in the payload but the model MUST confirm before using them.
    if (yearMatchInfo && yearMatchInfo.status === 'model_match_year_differs') {
      const availableStr = yearMatchInfo.available
        .map(r => `${r.name}${r.model_year ? ` (${r.model_year})` : ''}`)
        .join(', ')
      payload.AVISO_ANO = {
        status: 'ANO_DIFERENTE',
        ano_pedido: yearMatchInfo.requestedYear,
        modelos_disponiveis: availableStr,
        instrucao_OBRIGATORIA:
          `O usuário mencionou o ano ${yearMatchInfo.requestedYear}, mas esse ano não consta no catálogo. ` +
          `Os modelos disponíveis são: ${availableStr}. ` +
          `AÇÃO OBRIGATÓRIA: (1) informe explicitamente que não tem o modelo de ${yearMatchInfo.requestedYear}; ` +
          `(2) nomeie o(s) disponível(is) com o ano correto; ` +
          `(3) pergunte se é esse que o usuário tem — ex.: "Não tenho a ${yearMatchInfo.available[0]?.name?.replace(/\s+\d{4}$/, '') ?? 'modelo'} de ${yearMatchInfo.requestedYear}. A versão que tenho é a ${availableStr}. É essa?" ` +
          `NUNCA apresente o modelo disponível como se fosse o que o usuário pediu. ` +
          `NUNCA confirme um match sem a confirmação explícita do usuário.`,
      }
    }

    return JSON.stringify(payload)
  }

  if (name === 'detalle_raqueta') {
    const racket = await detalleRaqueta(input.id as number)
    if (!racket) return JSON.stringify({ erro: 'Raquete não encontrada.' })
    return JSON.stringify(racket)
  }

  if (name === 'sugerir_opcoes') {
    const { opcoes } = input as SuggestInput
    // When a fixed question is active, override model's chip choice with canonical set.
    // Prevents the model from sending price chips when the marca question is pending, etc.
    const field = pendingQuestionFieldRef.value
    let chips: string[]
    if (field === 'preco') {
      chips = precoChipsRef.value.length > 0
        ? precoChipsRef.value
        : ['Até R$1.000', 'R$1.000 a R$2.000', 'R$2.000 a R$3.000', 'Mais de R$3.000', 'Tanto faz / me mostra opções']
    } else if (field === 'marca') {
      chips = marcaChipsRef.value.length > 0 ? marcaChipsRef.value : MARCA_CHIPS
    } else if (field?.startsWith('disambig:')) {
      chips = opcoes.slice(0, 4)
    } else if (field) {
      const canonical = getChipsForField(field as FieldKey)
      chips = canonical.length > 0 ? canonical : opcoes.slice(0, 4)
    } else {
      // Fallback: detect field from model's chip content → use canonical chips + set the
      // field ref so streamResponse injects the fixed question text (prevents orphaned chips).
      const looksLike = (kws: string[]) => opcoes.some(o => kws.some(kw => o.toLowerCase().includes(kw)))
      let detected: FieldKey | null = null
      if      (looksLike(['cotovelo', 'ombro', 'punho', 'tenho dor']))          detected = 'lesao'
      else if (looksLike(['começando', 'intermediár', 'avançad', 'iniciante'])) detected = 'nivel'
      else if (looksLike(['ataque', 'defesa', 'equilibr']))                      detected = 'estilo'
      else if (looksLike(['forte', 'suave', 'batida']))                          detected = 'forca_declarada'
      else if (looksLike(['rede', 'fundo']))                                      detected = 'jogo_aereo'
      if (detected) {
        pendingQuestionFieldRef.value = detected
        chips = getChipsForField(detected)
      } else {
        chips = opcoes.slice(0, 4)
      }
    }
    pendingSuggestions.splice(0, pendingSuggestions.length, ...chips)
    return JSON.stringify({ exibidas: chips.length })
  }

  if (name === 'recomendar_raquetas') {
    const tipoDaRec = (input as Record<string, unknown>).tipo as string | undefined
    // Hard gate: block if price question is pending (budget unknown + wide spread).
    if (priceAskPendingRef.value && tipoDaRec !== 'compra_direta') {
      return JSON.stringify({
        erro: 'GATE_PRECO: orçamento não informado e spread de preço amplo.',
        instrucao: 'NÃO chame recomendar_raquetas agora. Chame sugerir_opcoes com as faixas de preço e aguarde o usuário responder antes de recomendar.',
      })
    }
    // Hard gate: block if profile confidence is still insufficient.
    if (debugRef.value.confidenceInfo?.willRecommend === false && tipoDaRec !== 'compra_direta') {
      return JSON.stringify({
        erro: 'GATE_CONFIANCA: perfil incompleto — lesão e/ou nível não respondidos.',
        instrucao: 'NÃO repita recomendar_raquetas agora. Faça a pergunta indicada por diagnosticar_perfil antes de recomendar.',
      })
    }
    // Hard gate: nivel must be known before recommending — same obligation as lesão.
    // Fires only when recommendAnyway lifted the confidence gate but nivel was never answered.
    // (score≥80% already requires nivel, so this only catches the recommendAnyway edge case.)
    const confirmedNivel = confirmedProfile.nivel ?? (input as RacketFilters).nivel
    if (!confirmedNivel && tipoDaRec !== 'compra_direta') {
      return JSON.stringify({
        erro: 'GATE_NIVEL: nível não respondido.',
        instrucao: 'NÃO recomende. Feche com mensagem amável: diga que sem saber o nível fica difícil indicar a raquete certa e convide a voltar quando souber. Não insista mais.',
      })
    }
    const { raquetes } = input as RecommendInput
    // Cap at 3, then exclude the current racket identified by lookup in TROCA flow.
    // Exception: compra_direta — the looked-up racket IS what the user wants, never exclude it.
    const capped = raquetes.slice(0, 3)
    const filtered = currentRacketIds.size > 0 && tipoDaRec !== 'compra_direta'
      ? capped.filter(r => !currentRacketIds.has(r.id))
      : capped
    const ids = filtered.map(r => r.id)
    const rackets = await getRaquetasByIds(ids)

    // Construir recommendations preservando el orden y la razao del modelo
    const built: RecommendedRacket[] = filtered
      .flatMap(r => {
        const racket = rackets.find(rk => rk.id === r.id)
        if (!racket) return []
        const scoreEntry = debugRef.value.scorerResults?.find(s => s.id === r.id)
        const razaoValidada = validateRazao(r.razao, racket.racket_insights)
        const rec: RecommendedRacket = { racket, razao: razaoValidada, match_score: scoreEntry?.score }
        return [rec]
      })
      .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))

    // Mutate the array passed in — caller reads it after the loop
    pendingRecommendations.push(...built)
    // Post-rec action chips — always shown after every recommendation set
    pendingSuggestions.splice(0, pendingSuggestions.length, ...POST_REC_CHIPS)
    return JSON.stringify({ confirmado: true, registradas: built.length })
  }

  return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` })
}

// Compact tool_result content for rounds older than the most recent, reducing per-round
// token cost. Old diagnosticar/buscar payloads (2k+ tokens) become '(ok)'.
// The most recent tool result is always preserved intact so the model can process it.
function compactOldToolResults(messages: Anthropic.MessageParam[]): void {
  let kept = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user' || !Array.isArray(m.content)) continue
    if (!(m.content as Array<{ type: string }>).some(b => b.type === 'tool_result')) continue
    kept++
    if (kept > 1) {
      m.content = (m.content as Array<Anthropic.ToolResultBlockParam>).map(b =>
        b.type !== 'tool_result'
          ? b
          : { type: 'tool_result', tool_use_id: b.tool_use_id, content: '(ok)' }
      )
    }
  }
}

const MAX_HISTORY_MESSAGES = 20  // keep last 10 turns; older turns rarely affect recommendations

export async function runAgentTurn(
  history: ChatMessage[],
  onToken?: (token: string) => void,
  signal?: AbortSignal,
  postRecContext?: PostRecContext
): Promise<AgentResult> {
  // Truncate history for the model context while keeping full history for profile derivations.
  // Profile state (confirmedProfile, brandAskedRef, etc.) is derived from the FULL history
  // before this truncation, so profile continuity is preserved even in long conversations.
  const historyForModel = history.length > MAX_HISTORY_MESSAGES
    ? history.slice(-MAX_HISTORY_MESSAGES)
    : history
  const messages: Anthropic.MessageParam[] = historyForModel.map(m => ({
    role: m.role,
    content: m.content,
  }))

  const pendingRecommendations: RecommendedRacket[] = []
  const pendingSuggestions: string[] = []
  const diagnosticoRef: { value: FaixaIdeal | null } = { value: null }
  const intencaoRef: { value: IntencaoTipo | null } = { value: null }
  const debugRef: { value: AgentDebugInfo } = { value: {} }
  const priceAskPendingRef: { value: boolean } = { value: false }
  const marcaAskPendingRef: { value: boolean } = { value: false }
  // Derive brand/budget answered state from history — prevents re-asking when the model
  // omits marca_preferida or presupuesto_min in subsequent turns after the user answered.
  const brandAskedRef: { value: boolean } = {
    value: (() => {
      // Backward compat: old hardcoded chips
      if (history.some(m => m.role === 'user' && MARCA_CHIPS.includes(m.content.trim()))) return true
      // Brand question (pre-rec legacy) OR brand filter (post-rec new flow)
      let lastBrandQuestionIdx = -1
      history.forEach((m, i) => {
        if (m.role === 'assistant' && (m.content.includes(MARCA_QUESTION_TEXT) || m.content.includes(MARCA_FILTRO_QUESTION_TEXT))) lastBrandQuestionIdx = i
      })
      if (lastBrandQuestionIdx === -1) return false
      return history.slice(lastBrandQuestionIdx + 1).some(
        m => m.role === 'user' && m.content.trim() !== 'Ver todas as marcas'
      )
    })(),
  }
  const budgetAnsweredRef: { value: boolean } = {
    value: history.some(m => m.role === 'user' && PRICE_ANSWERS.has(m.content.trim()))
  }
  const precoChipsRef: { value: string[] } = { value: [] }
  const marcaChipsRef: { value: string[] } = { value: [] }
  const showAllBrandsRef: { value: boolean } = {
    value: history.some(m => m.role === 'user' && m.content.trim() === 'Ver todas as marcas'),
  }
  // Derive brand preference from history — guarantees it's included in buscar_raquetas
  // even when the model omits marca_preferida from its tool call on subsequent turns.
  const confirmedMarca: string | null | undefined = (() => {
    let lastBrandQIdx = -1
    history.forEach((m, i) => {
      if (m.role === 'assistant' && (m.content.includes(MARCA_QUESTION_TEXT) || m.content.includes(MARCA_FILTRO_QUESTION_TEXT))) lastBrandQIdx = i
    })
    if (lastBrandQIdx === -1) return undefined
    const userResp = history.slice(lastBrandQIdx + 1).find(
      m => m.role === 'user' && m.content.trim() !== 'Ver todas as marcas'
    )
    if (!userResp) return undefined
    const text = userResp.content.trim()
    return text === 'Tanto faz' ? null : text
  })()
  const pendingQuestionFieldRef: { value: string | null } = { value: null }
  const usage: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  // Deterministic question counter: number of user turns beyond the initial message.
  // Each user turn corresponds to one answered question (or "nao sei"). This is immune
  // to model paraphrasing — the old includes()-based counter stayed at 0 when the model
  // improvised wording, causing recommendAnyway to never fire (infinite "nao sei" loop).
  const profileQuestionsAsked = Math.max(0, history.filter(m => m.role === 'user').length - 1)
  // Profile state derived from chip answers in history — immune to model omission between turns.
  // Lesão fields are also stripped from model input and re-injected from here (prevents inference).
  const confirmedProfile = extractConfirmedProfileFromHistory(history)
  // Current racket IDs from lookup searches (TROCA flow) — excluded from recomendar_raquetas
  const currentRacketIds = new Set<number>()
  // True once a lookup returned 0 results (current racket not in catalog) — blocks re-lookup
  const currentRacketNotFoundRef: { value: boolean } = { value: false }
  let isComparison = false
  let rounds = 0
  let hasSearchResults = false  // true only when in-budget results exist (fora_do_orcamento excluded)
  let searchWasCalled = false   // true whenever buscar_raquetas ran, even with fora_do_orcamento
  // Stall recovery: if the model emits pure text with no tool calls on the first
  // round (e.g. "Um segundo." / "Deixa eu buscar..."), we retry once with
  // tool_choice:'any' to force it to actually call a tool. The stall response is
  // discarded — messages stays untouched so the forced retry gets a clean slate.
  let stalledOnce = false
  let confidenceInsufficient = false

  // Post-rec state: detect which action chip (if any) the user tapped
  const postRecShownIds = new Set<number>(postRecContext?.shownIds ?? [])
  const postRecShownBrands = new Set<string>(postRecContext?.shownBrands ?? [])
  const lastUserContent = history.findLast(m => m.role === 'user')?.content.trim() ?? ''
  const isPriceAnswerMsg = PRICE_ANSWERS.has(lastUserContent)
  const postRecMode: PostRecMode | null = postRecContext && !isPriceAnswerMsg
    ? (lastUserContent === 'Ver mais opções' ? 'ver_mais'
      : lastUserContent === 'Outra marca' ? 'outra_marca'
      : lastUserContent === 'Outra faixa de preço' ? 'outra_faixa'
      : postRecContext.marcaListPending && !POST_REC_CHIPS.includes(lastUserContent as typeof POST_REC_CHIPS[number]) ? 'escolher_marca'
      : 'livre')
    : null
  // Free text in post-rec state → fixed redirect, 0 API calls
  if (postRecMode === 'livre') {
    if (onToken) onToken(POST_REC_REDIRECT_TEXT)
    return { text: POST_REC_REDIRECT_TEXT, suggestions: [...POST_REC_CHIPS], usage, debug: {} }
  }
  // "Outra faixa de preço" → re-ask price deterministically, 0 API calls
  if (postRecMode === 'outra_faixa') {
    const chips = computePrecoChips([])
    if (onToken) onToken(PRECO_QUESTION_TEXT)
    return { text: PRECO_QUESTION_TEXT, suggestions: chips, usage, debug: {} }
  }

  // "Ver mais opções" → next batch from scorer ranking, fully deterministic, 0 model calls
  if (postRecMode === 'ver_mais') {
    const buildBudgetFiltersVM = (label: string): Partial<RacketFilters> => {
      if (label === 'Tanto faz / me mostra opções') return { presupuesto_min: 0 }
      const bucket = PRECO_BUCKETS.find(b => b.label === label)
      return {
        ...(bucket?.min && bucket.min > 0 ? { presupuesto_min: bucket.min } : {}),
        ...(bucket?.max != null ? { presupuesto_max: bucket.max } : {}),
      }
    }
    const priceMsg = history.findLast(m => m.role === 'user' && PRICE_ANSWERS.has(m.content.trim()))
    const buscarInput: Record<string, unknown> = {
      ...confirmedProfile,
      ...(priceMsg ? buildBudgetFiltersVM(priceMsg.content.trim()) : {}),
    }
    const postRecCtxVM: PostRecCtx = { mode: 'ver_mais', shownIds: postRecShownIds, shownBrands: postRecShownBrands }
    const runToolVM = (tname: string, tinput: Record<string, unknown>) =>
      executeTool(tname, tinput, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, currentRacketNotFoundRef, confirmedProfile, budgetAnsweredRef, precoChipsRef, marcaChipsRef, showAllBrandsRef, confirmedMarca, history, postRecCtxVM)

    const buscarResult = await runToolVM('buscar_raquetas', buscarInput)
    type SlimVM = { id: number; racket_insights?: Record<string, unknown> }
    const buscarParsed = JSON.parse(buscarResult) as { encontradas: number; raquetes?: SlimVM[]; fora_do_orcamento?: boolean }

    // REC_BATCH: how many to show per "Ver mais" click
    const REC_BATCH = 3
    const nextBatch = buscarParsed.raquetes?.slice(0, REC_BATCH) ?? []

    if (nextBatch.length === 0 || buscarParsed.fora_do_orcamento) {
      const exhaustedText = 'Essas são todas as que encaixam no seu perfil e faixa. Quer tentar outra faixa de preço ou outra marca?'
      if (onToken) onToken(exhaustedText)
      return { text: exhaustedText, suggestions: ['Outra faixa de preço', 'Outra marca'], usage, debug: debugRef.value }
    }

    const fakeBuscarId = `vm_buscar_${Date.now()}`
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: fakeBuscarId, name: 'buscar_raquetas', input: buscarInput } as Anthropic.ToolUseBlockParam] })
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: fakeBuscarId, content: buscarResult } as Anthropic.ToolResultBlockParam] })
    compactOldToolResults(messages)

    const topRaquetesVM = nextBatch.map(r => ({
      id: r.id,
      razao: r.racket_insights ? fallbackRazao(r.racket_insights as unknown as Insights) : 'Boa escolha para o seu perfil.',
    }))
    const recomendarInput = { raquetes: topRaquetesVM, tipo: 'perfil_completo' }
    const fakeRecId = `vm_rec_${Date.now()}`
    await runToolVM('recomendar_raquetas', recomendarInput as Record<string, unknown>)
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: fakeRecId, name: 'recomendar_raquetas', input: recomendarInput } as Anthropic.ToolUseBlockParam] })
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: fakeRecId, content: JSON.stringify({ confirmado: true }) } as Anthropic.ToolResultBlockParam] })
    compactOldToolResults(messages)

    // Only offer "Ver mais" if more candidates remain beyond this batch
    const hasMoreVM = (buscarParsed.raquetes?.length ?? 0) > REC_BATCH
    const vmChips = hasMoreVM
      ? [...POST_REC_CHIPS]
      : POST_REC_CHIPS.filter(c => c !== 'Ver mais opções')

    const text = 'Aqui estão mais opções para o seu perfil.'
    if (onToken) onToken(text)
    return { text, recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined, suggestions: vmChips, usage, debug: debugRef.value }
  }

  // "Outra marca" → derive brand list from pool, show as chips, 0 model calls
  if (postRecMode === 'outra_marca') {
    const buildBudgetFiltersOM = (label: string): Partial<RacketFilters> => {
      // "Tanto faz" = no price restriction at all; pass nothing so the full pool is visible
      if (label === 'Tanto faz / me mostra opções') return {}
      const bucket = PRECO_BUCKETS.find(b => b.label === label)
      return {
        ...(bucket?.min && bucket.min > 0 ? { presupuesto_min: bucket.min } : {}),
        ...(bucket?.max != null ? { presupuesto_max: bucket.max } : {}),
      }
    }
    const priceMsg = history.findLast(m => m.role === 'user' && PRICE_ANSWERS.has(m.content.trim()))
    const isTantoFaz = !priceMsg || priceMsg.content.trim() === 'Tanto faz / me mostra opções'
    const budgetFiltersOM = priceMsg ? buildBudgetFiltersOM(priceMsg.content.trim()) : {}

    // Brand discovery needs the FULL scored pool — executeTool caps at MAX_CANDIDATES=6,
    // which can hide every non-Adidas brand when top 6 happen to be the same brand.
    // Call buscarRaquetas directly to bypass the cap; brands are extracted, not shown verbatim.
    const filtersForOM: RacketFilters = { ...(confirmedProfile as RacketFilters), ...budgetFiltersOM }
    const { raquetes: fullPoolOM } = await buscarRaquetas(filtersForOM)

    const brandCount = new Map<string, number>()
    for (const r of fullPoolOM) {
      const bn = (r as { brands?: { name: string } | null }).brands?.name
      if (bn && !postRecShownBrands.has(bn)) brandCount.set(bn, (brandCount.get(bn) ?? 0) + 1)
    }
    const sortedBrands = [...brandCount.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
    if (sortedBrands.length === 0) {
      const noText = isTantoFaz
        ? 'Não encontrei candidatas de outras marcas para esse perfil. Quer começar uma nova busca?'
        : 'Não encontrei candidatas de outras marcas para esse perfil nessa faixa de preço. Quer tentar outra faixa?'
      if (onToken) onToken(noText)
      // Remove "Outra marca" from chips — no brands remain, offering it again would loop
      const noSuggestions = isTantoFaz ? [] : ['Outra faixa de preço']
      return { text: noText, suggestions: noSuggestions, usage, debug: debugRef.value }
    }
    const MAX_BRAND_CHIPS = 5
    const brandChips = sortedBrands.slice(0, MAX_BRAND_CHIPS)
    if (sortedBrands.length > MAX_BRAND_CHIPS) brandChips.push('Outras marcas')
    const marcaListText = 'Qual marca você quer ver?'
    pendingSuggestions.splice(0, pendingSuggestions.length, ...brandChips)
    if (onToken) onToken(marcaListText)
    return { text: marcaListText, suggestions: [...brandChips], marcaListPending: true, usage, debug: debugRef.value }
  }

  // User picked a brand from the brand list → buscar + deterministic rec, 0 model calls
  if (postRecMode === 'escolher_marca') {
    const marcaEscolhida = lastUserContent
    const buildBudgetFiltersEM = (label: string): Partial<RacketFilters> => {
      if (label === 'Tanto faz / me mostra opções') return {}
      const bucket = PRECO_BUCKETS.find(b => b.label === label)
      return {
        ...(bucket?.min && bucket.min > 0 ? { presupuesto_min: bucket.min } : {}),
        ...(bucket?.max != null ? { presupuesto_max: bucket.max } : {}),
      }
    }
    const priceMsg = history.findLast(m => m.role === 'user' && PRICE_ANSWERS.has(m.content.trim()))
    const budgetFiltersEM = priceMsg ? buildBudgetFiltersEM(priceMsg.content.trim()) : {}

    // Re-compute the profile's ideal weight/balance range — the same calculation
    // diagnosticar_perfil runs in the main flow. diagnosticoRef.value is null here
    // (post-rec early return, before the model loop), so we derive it directly.
    const { faixa: faixaEM } = calcular_faixa_ideal_traced(confirmedProfile as FittingProfile)

    // Call buscarRaquetas directly (bypass executeTool's MAX_CANDIDATES=6 cap) so we see
    // the full pool. The scorer applies profile weights (nivel/estilo/lesão) to match_score.
    const filtersForEM: RacketFilters = { ...(confirmedProfile as RacketFilters), ...budgetFiltersEM }
    const { raquetes: rawPoolEM } = await buscarRaquetas(filtersForEM)

    // Apply the same faixa filter the main recommendation flow uses.
    // This sorts in-range rackets first and marks heavy/light outliers as fora_da_faixa.
    // For iniciante (peso_max=325g) a Shark Attack at 360g → (360-10)=350 > 325 → fora.
    const rankedPoolEM = applyFaixaFilter(rawPoolEM, faixaEM)

    // Eligible = in the profile's weight range (fora_da_faixa=false includes in-range + unknown weight).
    // This is the same set the main recommendation considers — brand selection must stay within it.
    const eligiblePoolEM = rankedPoolEM.filter(r => !r.fora_da_faixa)

    // Strict brand match within the eligible pool — never show out-of-profile rackets
    const brandPool = eligiblePoolEM.filter(r =>
      r.brands?.name?.toLowerCase() === marcaEscolhida.toLowerCase()
    )
    // Exclude rackets already shown in this session (initial rec + any previous brand selections)
    const brandUnseen = brandPool.filter(r => !postRecShownIds.has(r.id))

    if (brandPool.length === 0) {
      // Brand has no rackets matching the profile's weight range and scorer minimum
      const noText = `A ${marcaEscolhida} não tem opções que encaixem no seu perfil. Quer ver outra marca?`
      if (onToken) onToken(noText)
      return { text: noText, suggestions: POST_REC_CHIPS.filter(c => c !== 'Ver mais opções'), usage, debug: debugRef.value }
    }

    if (brandUnseen.length === 0) {
      // All brand X rackets were already shown in this session
      const text = `Já te mostrei as opções da ${marcaEscolhida} que encaixam no seu perfil. Quer ver outra marca ou mudar a faixa?`
      if (onToken) onToken(text)
      return { text, suggestions: POST_REC_CHIPS.filter(c => c !== 'Ver mais opções'), usage, debug: debugRef.value }
    }

    const REC_BATCH_MARCA = 3
    const topBrand = brandUnseen.slice(0, REC_BATCH_MARCA)
    const topRaquetes = topBrand.map(r => ({
      id: r.id,
      razao: r.racket_insights ? fallbackRazao(r.racket_insights as unknown as Insights) : 'Boa escolha para o seu perfil.',
    }))

    // Inject synthetic buscar/recomend tool messages for model context
    const fakeBuscarId = `det_marca_buscar_${Date.now()}`
    const buscarPayload = JSON.stringify({ encontradas: brandPool.length, raquetes: topBrand.map(r => ({ id: r.id, name: r.name })) })
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: fakeBuscarId, name: 'buscar_raquetas', input: { ...filtersForEM, marca_preferida: marcaEscolhida } } as Anthropic.ToolUseBlockParam] })
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: fakeBuscarId, content: buscarPayload } as Anthropic.ToolResultBlockParam] })
    compactOldToolResults(messages)

    const recomendarInput = { raquetes: topRaquetes, tipo: 'perfil_completo' }
    const postRecCtxMarca: PostRecCtx = { mode: 'ver_mais', shownIds: postRecShownIds, shownBrands: postRecShownBrands }
    const runTool = (tname: string, tinput: Record<string, unknown>) =>
      executeTool(tname, tinput, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, currentRacketNotFoundRef, confirmedProfile, budgetAnsweredRef, precoChipsRef, marcaChipsRef, showAllBrandsRef, confirmedMarca, history, postRecCtxMarca)
    const fakeRecId = `det_marca_rec_${Date.now()}`
    const recResult = await runTool('recomendar_raquetas', recomendarInput as Record<string, unknown>)
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: fakeRecId, name: 'recomendar_raquetas', input: recomendarInput } as Anthropic.ToolUseBlockParam] })
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: fakeRecId, content: recResult } as Anthropic.ToolResultBlockParam] })
    compactOldToolResults(messages)

    const text = `Aqui estão as melhores opções da ${marcaEscolhida} para o seu perfil.`
    if (onToken) onToken(text)
    // Only offer "Ver mais opções" if the brand has more unseen rackets beyond this batch
    const hasMoreMarca = brandUnseen.length > REC_BATCH_MARCA
    const marcaChipsFinal = hasMoreMarca
      ? [...POST_REC_CHIPS]
      : POST_REC_CHIPS.filter(c => c !== 'Ver mais opções')
    pendingSuggestions.splice(0, pendingSuggestions.length, ...marcaChipsFinal)
    return { text, recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined, suggestions: marcaChipsFinal, usage, debug: debugRef.value }
  }

  // ── Chip short-circuit: profile chip or price chip → 0 or 1 model API calls ──
  // Profile chip mid-flow (confidence insufficient): fixed reaction + next question. 0 API calls.
  // Profile chip reaching confidence (budget unknown): fixed reaction + price question. 0 API calls.
  // Price chip (or confidence+budget known): run buscar+rec without tool-call round-trips,
  //   then call streamResponse for narration only (1 API call, no tool_use).
  const isProfileChip = Object.prototype.hasOwnProperty.call(CHIP_TO_PROFILE, lastUserContent)
  const isPriceChipMsg = PRICE_ANSWERS.has(lastUserContent) && !postRecContext  // post-rec price handled separately
  if ((isProfileChip || isPriceChipMsg) && postRecMode === null) {
    const { faixa, trace } = calcular_faixa_ideal_traced(confirmedProfile as FittingProfile)
    diagnosticoRef.value = faixa
    debugRef.value.perfilInput = confirmedProfile
    if (!debugRef.value.decisionTrace) debugRef.value.decisionTrace = {}
    debugRef.value.decisionTrace.faixaSteps = trace.steps
    debugRef.value.decisionTrace.conflitos = trace.conflitos
    const confidence = computeProfileConfidence(confirmedProfile, profileQuestionsAsked, undefined)
    debugRef.value.confidenceInfo = confidence

    const reaction = isProfileChip ? (CHIP_REACTIONS[lastUserContent] ?? CHIP_REACTION_FALLBACK) : ''

    // CASE 1: profile chip, confidence still insufficient → fixed reaction + next question
    if (isProfileChip && !confidence.willRecommend && confidence.nextQuestion) {
      const q = confidence.nextQuestion
      pendingQuestionFieldRef.value = q.field
      pendingSuggestions.splice(0, pendingSuggestions.length, ...q.chips)
      const text = reaction + '\n\n' + getFixedQuestionText(q.field)
      if (onToken) onToken(text)
      return { text, suggestions: [...q.chips], diagnostico: faixa, usage, debug: debugRef.value }
    }

    // CASE 2: profile chip reaches confidence, budget still unknown → price question
    if (isProfileChip && confidence.willRecommend && !budgetAnsweredRef.value) {
      const chips = computePrecoChips([])
      pendingQuestionFieldRef.value = 'preco'
      pendingSuggestions.splice(0, pendingSuggestions.length, ...chips)
      const text = reaction + '\n\n' + PRECO_QUESTION_TEXT
      if (onToken) onToken(text)
      return { text, suggestions: chips, diagnostico: faixa, usage, debug: debugRef.value }
    }

    // CASE 3: price chip (or profile chip with confidence+budget known) →
    //   run buscar+rec without model tool calls, then streamResponse for narration
    const isRecPath = isPriceChipMsg || (isProfileChip && confidence.willRecommend && budgetAnsweredRef.value)
    if (isRecPath) {
      // Build budget filters from price chip, or recover from history for the profile-chip case
      const buildBudgetFilters = (label: string): Partial<RacketFilters> => {
        if (label === 'Tanto faz / me mostra opções') return { presupuesto_min: 0 }
        const bucket = PRECO_BUCKETS.find(b => b.label === label)
        return {
          ...(bucket?.min && bucket.min > 0 ? { presupuesto_min: bucket.min } : {}),
          ...(bucket?.max != null ? { presupuesto_max: bucket.max } : {}),
        }
      }
      let buscarInput: Record<string, unknown>
      if (isPriceChipMsg) {
        budgetAnsweredRef.value = true
        buscarInput = { ...confirmedProfile, ...buildBudgetFilters(lastUserContent) }
      } else {
        const priceMsg = history.findLast(m => m.role === 'user' && PRICE_ANSWERS.has(m.content.trim()))
        buscarInput = { ...confirmedProfile, ...(priceMsg ? buildBudgetFilters(priceMsg.content.trim()) : {}) }
      }

      // Local helper: call executeTool with all current closure refs
      const runTool = (tname: string, tinput: Record<string, unknown>) =>
        executeTool(tname, tinput, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, currentRacketNotFoundRef, confirmedProfile, budgetAnsweredRef, precoChipsRef, marcaChipsRef, showAllBrandsRef, confirmedMarca, history, { mode: postRecMode, shownIds: postRecShownIds, shownBrands: postRecShownBrands })

      const fakeBuscarId = `det_buscar_${Date.now()}`
      const buscarResult = await runTool('buscar_raquetas', buscarInput)
      type SlimRacket = { id: number; racket_insights?: Record<string, unknown> }
      const buscarParsed = JSON.parse(buscarResult) as { encontradas: number; raquetes?: SlimRacket[] }

      if (buscarParsed.encontradas > 0 && buscarParsed.raquetes?.length && !priceAskPendingRef.value) {
        hasSearchResults = true
        messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: fakeBuscarId, name: 'buscar_raquetas', input: buscarInput } as Anthropic.ToolUseBlockParam] })
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: fakeBuscarId, content: buscarResult } as Anthropic.ToolResultBlockParam] })
        compactOldToolResults(messages)

        const topRaquetes = buscarParsed.raquetes.slice(0, 3).map(r => ({
          id: r.id,
          razao: r.racket_insights ? fallbackRazao(r.racket_insights as unknown as Insights) : 'Boa escolha para o seu perfil.',
        }))
        const recomendarInput = { raquetes: topRaquetes, tipo: 'perfil_completo' }
        const fakeRecId = `det_rec_${Date.now()}`
        const recResult = await runTool('recomendar_raquetas', recomendarInput as Record<string, unknown>)
        messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: fakeRecId, name: 'recomendar_raquetas', input: recomendarInput } as Anthropic.ToolUseBlockParam] })
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: fakeRecId, content: recResult } as Anthropic.ToolResultBlockParam] })
        compactOldToolResults(messages)

        if (onToken) {
          return streamResponse(messages, pendingRecommendations, pendingSuggestions, isComparison, diagnosticoRef, intencaoRef, debugRef, usage, pendingQuestionFieldRef, onToken, signal)
        }
        // Non-streaming path (rare in production — always streams)
        const finalResp = await anthropic.messages.create({
          model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM_CACHED,
          tools: agentTools, tool_choice: { type: 'none' }, messages,
        }, { signal })
        addUsage(usage, finalResp.usage)
        const textBlock = finalResp.content.find(b => b.type === 'text')
        return {
          text: textBlock?.type === 'text' ? textBlock.text : '',
          recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
          suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
          isComparison: isComparison || undefined,
          diagnostico: pendingRecommendations.length > 0 ? (diagnosticoRef.value ?? undefined) : undefined,
          intencao: intencaoRef.value ?? undefined,
          usage, debug: debugRef.value,
        }
      }
      // buscar returned 0 results, price gate fired, or other edge case → fall through to model loop
    }
  }
  // ── End chip short-circuit ───────────────────────────────────────────────────

  // Intents that require profile-building: force diagnosticar_perfil immediately
  // after registrar_intencao so the Akinator system (not the model) decides what
  // to ask next. Excludes troca/ajuste (need current-racket question first),
  // comparacao (name-based search), curiosidade (no recommendation needed).
  const INTENTS_NEEDING_PROFILE: IntencaoTipo[] = ['primeira_raquete', 'lesao_dor', 'presente', 'preco_orcamento']

  while (rounds < MAX_TOOL_ROUNDS) {
    // intencaoRef is excluded: registrar_intencao legitimately ends with a clarifying question
    // (e.g. "qual sua raquete atual?") — that is not a stall. Including it here prevented
    // a cascade of ~10 spurious API retries per turn in TROCA/lesao flows.
    const nothingDoneYet = !diagnosticoRef.value && pendingRecommendations.length === 0 && !hasSearchResults && !intencaoRef.value
    // Stall variant: model ran diagnosticar_perfil but then returned text without searching.
    // EXCEPTION: if confidence is insufficient, the agent is SUPPOSED to ask a question and
    // not search yet — that's not a stall. Only treat as stall when confidence is sufficient.
    confidenceInsufficient = debugRef.value.confidenceInfo?.willRecommend === false
    // Use searchWasCalled (not hasSearchResults) so that a fora_do_orcamento search
    // (which intentionally leaves hasSearchResults=false) doesn't trigger stall detection.
    const diagWithoutSearch = !!diagnosticoRef.value && !searchWasCalled && pendingRecommendations.length === 0 && !confidenceInsufficient && !marcaAskPendingRef.value

    // Force diagnosticar_perfil right after registrar_intencao for profile-building intents.
    // The model decides the arguments (extracts what it knows from the conversation), but
    // calling the tool is mandatory — this routes all questions through the Akinator system
    // instead of letting the model improvise freeform questions without chips.
    const needsDiagnostic = intencaoRef.value != null
      && INTENTS_NEEDING_PROFILE.includes(intencaoRef.value)
      && !diagnosticoRef.value
      && !hasSearchResults
      && pendingRecommendations.length === 0

    // tool_choice priority:
    //   1. Force recomendar_raquetas when search results exist but no picks yet
    //      — EXCEPT when waiting for the user's price range (priceAskPending)
    //   2. Force diagnosticar_perfil for profile-building intents after intent registration
    //   3. Force any tool when the model stalled before completing the search flow
    //   4. Auto otherwise
    const toolChoice = (hasSearchResults && pendingRecommendations.length === 0 && !priceAskPendingRef.value && !confidenceInsufficient)
      ? { type: 'tool' as const, name: 'recomendar_raquetas' }
      : needsDiagnostic
      ? { type: 'tool' as const, name: 'diagnosticar_perfil' }
      : (stalledOnce && (nothingDoneYet || diagWithoutSearch))
      ? { type: 'any' as const }
      : { type: 'auto' as const }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_CACHED,
      tools: agentTools,
      tool_choice: toolChoice,
      messages,
    }, { signal })

    addUsage(usage, response.usage)

    if (response.stop_reason !== 'tool_use') {
      // Detect stall: model returned pure text (end_turn) on a first round where
      // nothing has been done yet. Retry once with tool_choice:'any'.
      if ((nothingDoneYet || diagWithoutSearch) && !stalledOnce && response.stop_reason === 'end_turn') {
        stalledOnce = true
        console.warn('[agent] stall detected — retrying with tool_choice:any')
        continue  // messages unchanged; model gets forced tool choice on next iteration
      }

      if (onToken) {
        return streamResponse(messages, pendingRecommendations, pendingSuggestions, isComparison, diagnosticoRef, intencaoRef, debugRef, usage, pendingQuestionFieldRef, onToken, signal)
      }
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock?.type === 'text' ? textBlock.text : ''
      return {
        text,
        recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
        suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
        isComparison: isComparison || undefined,
        diagnostico: pendingRecommendations.length > 0 ? (diagnosticoRef.value ?? undefined) : undefined,
        intencao: intencaoRef.value ?? undefined,
        usage,
        debug: debugRef.value,
      }
    }

    stalledOnce = false  // reset once tools start flowing normally
    rounds++
    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      let result: string
      try {
        result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, currentRacketNotFoundRef, confirmedProfile, budgetAnsweredRef, precoChipsRef, marcaChipsRef, showAllBrandsRef, confirmedMarca, history, { mode: postRecMode, shownIds: postRecShownIds, shownBrands: postRecShownBrands })
      } catch (toolErr) {
        console.error(`Tool ${block.name} error:`, toolErr)
        result = JSON.stringify({ erro: 'Ferramenta temporariamente indisponível. Continue sem ela.', encontradas: 0 })
      }

      if (block.name === 'buscar_raquetas') {
        searchWasCalled = true
        const inp = block.input as RacketFilters
        // Lookup calls (nome or atleta present) identify a specific racket — they are NOT
        // a recommendation pool. Only profile-based searches (no nome/atleta) count as
        // "results ready to recommend". This prevents a TROCA identification call from
        // contaminating hasSearchResults and forcing recomendar_raquetas with the wrong pool.
        const isLookup = !!(inp.nome || inp.atleta)
        try {
          const parsed = JSON.parse(result) as { encontradas: number; fora_do_orcamento?: boolean; raquetes?: Array<{ id: number }> }
          // Only mark hasSearchResults when results are in-budget AND it's a profile search.
          if (parsed.encontradas > 0 && !isLookup) hasSearchResults = true
          // Track lookup IDs so recomendar_raquetas can exclude the current racket (TROCA flow)
          if (isLookup) {
            for (const r of parsed.raquetes ?? []) {
              if (typeof r.id === 'number') currentRacketIds.add(r.id)
            }
          }
        } catch { /* ignore parse errors */ }
      }

      if (block.name === 'recomendar_raquetas') {
        const inp = block.input as { tipo?: string }
        if (inp.tipo === 'comparacao') isComparison = true
      }

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
    compactOldToolResults(messages)

    // Short-circuit: chips are pre-populated by diagnosticar_perfil when INSUFICIENTE.
    // Skip the next API round (which would be a wasted end_turn) and go straight to
    // streamResponse, which will inject the fixed question text from pendingQuestionFieldRef.
    if (debugRef.value.confidenceInfo?.willRecommend === false && pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
      confidenceInsufficient = true  // ensure post-loop guard reads correct state
      break
    }
    // Short-circuit for price question: chips pre-populated in buscar_raquetas handler.
    // Exits without an extra API round — streamResponse injects the question text.
    if (priceAskPendingRef.value && pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
      break
    }
  }

  // After initial rec: remove "Ver mais opções" if the scorer pool is exhausted.
  // filteredPoolSize = how many candidates were available (after shownIds filter, if any).
  // If we recommended all of them, there's nothing left to page through.
  if (pendingRecommendations.length > 0 && pendingSuggestions.includes('Ver mais opções')) {
    const poolSize = debugRef.value.filteredPoolSize ?? 0
    if (poolSize <= pendingRecommendations.length) {
      const idx = pendingSuggestions.indexOf('Ver mais opções')
      if (idx >= 0) pendingSuggestions.splice(idx, 1)
    }
  }

  // Post-loop safety: if search results exist but recomendar_raquetas was never
  // called (rounds exhausted before the forced pick), inject one final forced call.
  // This guarantees cards are always emitted when the scorer found candidates.
  // Guard: skip if confidence is still insufficient (e.g. lesão not yet answered).
  if (hasSearchResults && pendingRecommendations.length === 0 && !confidenceInsufficient) {
    console.warn('[agent] MAX_TOOL_ROUNDS exhausted without recomendar_raquetas — forcing final pick')
    try {
      const recResp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_CACHED,
        tools: agentTools,
        tool_choice: { type: 'tool', name: 'recomendar_raquetas' },
        messages,
      }, { signal })
      addUsage(usage, recResp.usage)
      if (recResp.stop_reason === 'tool_use') {
        const recBlocks = recResp.content.filter(b => b.type === 'tool_use')
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of recBlocks) {
          if (block.type !== 'tool_use') continue
          const result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, currentRacketNotFoundRef, confirmedProfile, budgetAnsweredRef, precoChipsRef, marcaChipsRef, showAllBrandsRef, confirmedMarca, history, { mode: postRecMode, shownIds: postRecShownIds, shownBrands: postRecShownBrands })
          if ((block.input as { tipo?: string }).tipo === 'comparacao') isComparison = true
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }
        messages.push({ role: 'assistant', content: recResp.content })
        messages.push({ role: 'user', content: toolResults })
      }
    } catch (recErr) {
      console.error('[agent] forced recomendar_raquetas failed:', recErr)
    }
  }

  // Fallback if MAX_TOOL_ROUNDS exhausted.
  // Guard: if the model loop produced no chips and no recs (e.g. apertura with no extractable
  // profile data), pre-populate the first Akinator question so streamResponse injects it
  // with a proper model intro instead of emitting blank output.
  if (pendingRecommendations.length === 0 && pendingSuggestions.length === 0 && pendingQuestionFieldRef.value === null) {
    const fallbackConf = computeProfileConfidence(confirmedProfile, profileQuestionsAsked, undefined)
    const q = fallbackConf.nextQuestion
    if (q) {
      pendingQuestionFieldRef.value = q.field
      pendingSuggestions.splice(0, pendingSuggestions.length, ...q.chips)
    }
  }
  if (onToken) {
    return streamResponse(messages, pendingRecommendations, pendingSuggestions, isComparison, diagnosticoRef, intencaoRef, debugRef, usage, pendingQuestionFieldRef, onToken, signal)
  }
  const finalResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_CACHED,
    tools: agentTools,
    messages,
  }, { signal })
  addUsage(usage, finalResponse.usage)
  const textBlock = finalResponse.content.find(b => b.type === 'text')
  return {
    text: textBlock?.type === 'text' ? textBlock.text : '',
    recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
    suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
    isComparison: isComparison || undefined,
    diagnostico: pendingRecommendations.length > 0 ? (diagnosticoRef.value ?? undefined) : undefined,
    intencao: intencaoRef.value ?? undefined,
    usage,
    debug: debugRef.value,
  }
}

async function streamResponse(
  messages: Anthropic.MessageParam[],
  pendingRecommendations: RecommendedRacket[],
  pendingSuggestions: string[],
  isComparison: boolean,
  diagnosticoRef: { value: FaixaIdeal | null },
  intencaoRef: { value: IntencaoTipo | null },
  debugRef: { value: AgentDebugInfo },
  usage: TokenUsage,
  pendingQuestionFieldRef: { value: string | null },
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<AgentResult> {
  // Stable part is cached; dynamic FAIXA VINCULANTE appended as a second uncached block.
  const systemBlocks: Anthropic.TextBlockParam[] = [...SYSTEM_CACHED]
  if (diagnosticoRef.value) {
    systemBlocks.push({
      type: 'text',
      text: `\n\n[FAIXA VINCULANTE CALCULADA PELO CÓDIGO]\npeso_min=${diagnosticoRef.value.peso_min}g  peso_max=${diagnosticoRef.value.peso_max}g  balance=${diagnosticoRef.value.balance_preferido}\nNarre EXATAMENTE estes valores. É proibido usar qualquer outro número de peso no diagnóstico desta conversa.`,
    })
  }
  // When chips are pending, inject system instruction.
  // For akinator fields AND preco: model writes only a short phrase, code injects question text.
  // For marca/disambig: model writes the question itself, with code fallback for empty responses.
  if (pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
    const field = pendingQuestionFieldRef.value
    const fixedText = field
      ? field === 'preco' ? PRECO_QUESTION_TEXT
        : field === 'lesao_local' ? LESAO_LOCAL_QUESTION_TEXT
        : field === 'marca' ? (pendingRecommendations.length > 0 ? MARCA_FILTRO_QUESTION_TEXT : MARCA_QUESTION_TEXT)
        : field.startsWith('disambig:') ? `Achei algumas ${field.slice('disambig:'.length)}. Qual delas é a sua?`
        : getFixedQuestionText(field as FieldKey)
      : null
    // preco joins akinator fields: model writes a short transition, code appends the fixed question.
    // Prevents improvisation like "Espera aí, preciso... 😊" before the price chips.
    const isAkinatorField = field && !field.startsWith('disambig:') && field !== 'marca'
    systemBlocks.push({
      type: 'text',
      text: isAkinatorField
        ? (field === 'preco'
          ? `\n\n[INSTRUÇÃO OBRIGATÓRIA]\nEscreva SOMENTE uma frase curta de transição (ex: "Achei boas opções pra você!", "Encontrei candidatas pro seu perfil."). NÃO escreva a pergunta de preço — o código a injetará automaticamente. NÃO cite valores, faixas ou marcas.`
          : `\n\n[INSTRUÇÃO OBRIGATÓRIA]\nEscreva SOMENTE uma frase curta de acolhimento (ex: "Entendido!", "Boa!", "Certo!"). NÃO escreva a pergunta — o código a injetará automaticamente. NÃO mencione lesão, nível, estilo, preço ou marca. NÃO mencione chips, botões, interface ou qualquer mecânica do sistema ("os chips vão aparecer", "pode tocar", "as opções vão aparecer aí").`)
        : fixedText
          ? `\n\n[INSTRUÇÃO OBRIGATÓRIA — PERGUNTA PARA OS CHIPS]\nSua resposta DEVE conter EXATAMENTE esta pergunta, sem alterar uma palavra:\n"${fixedText}"\nVocê pode escrever UMA frase curta de acolhimento ANTES da pergunta. Nada depois.`
          : `\n\n[INSTRUÇÃO OBRIGATÓRIA — PERGUNTA PARA OS CHIPS]\nSua resposta DEVE conter uma frase introdutória que explique ao usuário o que os botões significam — sem ela os chips aparecem "órfãos".`,
    })
  }

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    // Include tools + tool_choice:none so the model understands the conversation
    // context (which has tool_use/tool_result blocks) without being able to call
    // tools again. Without this, the model falls back to emitting <function_calls>
    // XML as visible text — a critical leak of internal machinery to users.
    tools: agentTools,
    tool_choice: { type: 'none' },
    messages,
  }, { signal })

  let text = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text
      onToken(event.delta.text)
    }
  }

  const finalMsg = await stream.finalMessage()
  addUsage(usage, finalMsg.usage)

  // For akinator fields AND preco: always append the fixed question text after the model's phrase.
  // The question is code-injected, never model-generated — deterministic across all runs.
  // For marca/disambig: model writes the question; fallback only when text is empty.
  if (pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
    const field = pendingQuestionFieldRef.value
    const isAkinator = field && !field.startsWith('disambig:') && field !== 'marca'
    if (isAkinator) {
      const fixedQ = field === 'preco' ? PRECO_QUESTION_TEXT : field === 'lesao_local' ? LESAO_LOCAL_QUESTION_TEXT : getFixedQuestionText(field as FieldKey)
      if (fixedQ && !text.includes(fixedQ)) {
        const addition = (text.trim() ? '\n\n' : '') + fixedQ
        text += addition
        onToken(addition)
      }
    } else if (!text.trim()) {
      const fallback = field
        ? field === 'marca' ? (pendingRecommendations.length > 0 ? MARCA_FILTRO_QUESTION_TEXT : MARCA_QUESTION_TEXT)
          : field.startsWith('disambig:') ? `Achei algumas ${field.slice('disambig:'.length)}. Qual delas é a sua?`
          : null
        : null
      if (fallback) {
        text = fallback
        onToken(fallback)
      }
    }
  }

  // Hard guarantee: the apertura turn must NEVER return blank.
  // If the model emitted no text AND no chips/recs were set by any tool,
  // force the first Akinator question so the user always gets something.
  if (!text.trim() && pendingSuggestions.length === 0 && pendingRecommendations.length === 0) {
    const fallbackConf = computeProfileConfidence({}, 0, undefined)
    const q = fallbackConf.nextQuestion
    if (q) {
      const qText = getFixedQuestionText(q.field as FieldKey)
      if (qText) {
        text = qText
        onToken(qText)
        pendingSuggestions.splice(0, pendingSuggestions.length, ...q.chips)
      }
    }
  }

  return {
    text,
    recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
    suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
    isComparison: isComparison || undefined,
    diagnostico: pendingRecommendations.length > 0 ? (diagnosticoRef.value ?? undefined) : undefined,
    intencao: intencaoRef.value ?? undefined,
    usage,
    debug: debugRef.value,
  }
}
