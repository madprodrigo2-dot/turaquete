import Anthropic from '@anthropic-ai/sdk'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompt'
import { PRICING, TokenUsage } from './pricing'
import { buscarRaquetas, detalleRaqueta, getRaquetasByIds, RacketFilters, RecommendedRacket, RacketWithInsights, Insights } from '../recommend'
import { calcular_faixa_ideal_traced, computeScorerWeights, FaixaIdeal, FittingProfile } from '../scorer'
import type { DecisionTrace, FilterStep, PrecoDecision, MarcaDecision } from '../debug-types'
import { computeProfileConfidence, CONFIDENCE_CONFIG, getFixedQuestionText, getChipsForField, PRECO_QUESTION_TEXT, type ConfidenceInfo, type FieldKey } from './confidence'

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

// Price dispersion: ask budget only when spread among top candidates >= R$1000.
// Narrow spreads (all candidates similarly priced) don't need a budget gate —
// the budget question adds friction without changing the recommendation.
const PRICE_DISPERSION_CONFIG = {
  topN: 5,         // candidates to examine
  minRangeBrl: 1000, // R$ spread that triggers the question
} as const

function computePrecoDecision(
  ranked: Array<{ price: number | null; fora_da_faixa?: boolean }>,
  budgetKnown: boolean,
): PrecoDecision {
  if (budgetKnown) {
    return { status: 'budget_known', note: 'usuário informou faixa de preço — filtrado na busca' }
  }
  // Prefer in-range candidates; fall back to all if fewer than 2 in-range have prices
  const inRange = ranked.filter(r => !r.fora_da_faixa)
  const pool    = (inRange.length >= 2 ? inRange : ranked).slice(0, PRICE_DISPERSION_CONFIG.topN)
  const prices  = pool.map(r => r.price).filter((p): p is number => p != null && p > 0)

  if (prices.length < 2) {
    return { status: 'sem_preco', note: 'dados de preço insuficientes nas candidatas top' }
  }

  const rangeMin = Math.min(...prices)
  const rangeMax = Math.max(...prices)
  const rangeBrl = rangeMax - rangeMin

  if (rangeBrl >= PRICE_DISPERSION_CONFIG.minRangeBrl) {
    return {
      status: 'disparo',
      note: `orçamento desconhecido + candidatas R$${rangeMin}–R$${rangeMax} → perguntar faixa`,
      rangeMin, rangeMax, rangeBrl,
    }
  }
  return {
    status: 'similar',
    note: `preços similares (R$${rangeMin}–R$${rangeMax}, spread R$${rangeBrl}) — não precisa perguntar`,
    rangeMin, rangeMax, rangeBrl,
  }
}

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
}

export type AgentResult = {
  text: string
  recommendations?: RecommendedRacket[]
  suggestions?: string[]
  isComparison?: boolean
  diagnostico?: FaixaIdeal
  intencao?: IntencaoTipo
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
  chatHistory: readonly ChatMessage[]
): Promise<string> {
  if (name === 'registrar_intencao') {
    intencaoRef.value = input.intencao as IntencaoTipo
    return JSON.stringify({ registrado: true })
  }

  if (name === 'diagnosticar_perfil') {
    // Strip lesão fields — prevent model from inferring cotovelo/ombro from free text like "braço".
    // Then inject all chip-confirmed fields (estilo, nível, força, jogo aéreo, lesão).
    // Chip answers override model values, guaranteeing no dimension reappears as missing once answered.
    const safeInput = { ...input }
    delete safeInput.cotovelo_sensivel
    delete safeInput.ombro_sensivel
    delete safeInput.punho_sensivel
    delete safeInput.sem_lesao
    Object.assign(safeInput, confirmedProfile)

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
      pendingQuestionFieldRef.value = q.field
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
    const { raquetes, criteriosRelaxados, filterTrace, yearMatchInfo } = await buscarRaquetas(effectiveFilters)
    const ranked = diagnosticoRef.value ? applyFaixaFilter(raquetes, diagnosticoRef.value) : raquetes
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
      const filters = input as RacketFilters
      if (filters.presupuesto_max) {
        // Budget filter yielded zero — degrade: re-run without budget ceiling and mark results.
        const { raquetes: raquetesSemOrc, criteriosRelaxados: relSemOrc } = await buscarRaquetas({ ...filters, presupuesto_max: undefined })
        const rankedSemOrc = diagnosticoRef.value ? applyFaixaFilter(raquetesSemOrc, diagnosticoRef.value) : raquetesSemOrc
        if (rankedSemOrc.length > 0) {
          const topSemOrc = rankedSemOrc.slice(0, MAX_CANDIDATES).map(slimForModel)
          // Sort by price to surface the most affordable option in the instruction
          const cheapest = [...rankedSemOrc].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0]
          const cheapestDesc = cheapest.price != null ? `${cheapest.name} (R$${cheapest.price})` : cheapest.name
          const payload: Record<string, unknown> = {
            encontradas: rankedSemOrc.length,
            raquetes: topSemOrc,
            fora_do_orcamento: true,
            AVISO_ORCAMENTO_OBRIGATORIO: {
              status: 'ZERO_NA_FAIXA',
              faixa_solicitada: `até R$${filters.presupuesto_max}`,
              mais_acessivel: cheapestDesc,
              instrucao_OBRIGATORIA:
                `Nenhuma raquete disponível dentro de R$${filters.presupuesto_max}. ` +
                `As raquetes listadas estão ACIMA desse valor. ` +
                `AÇÃO OBRIGATÓRIA: ` +
                `(1) diga com honestidade que não há opções nessa faixa — ex.: "Dentro de R$${filters.presupuesto_max} não tenho opções. A mais em conta que tenho é a ${cheapestDesc}."; ` +
                `(2) ofereça alternativas: "Quer que eu te mostre as mais acessíveis, ou prefere ajustar o valor?"; ` +
                `(3) NÃO chame recomendar_raquetas nesta resposta — espere o usuário confirmar que quer ver opções acima do orçamento. ` +
                `PROIBIDO apresentar essas raquetes como se cumprissem o orçamento pedido.`,
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
    const priceDecision = computePrecoDecision(ranked, budgetKnown)
    debugRef.value.decisionTrace!.precoDecision = priceDecision
    priceAskPendingRef.value = priceDecision.status === 'disparo'
    if (priceDecision.status === 'disparo') pendingQuestionFieldRef.value = 'preco'

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

    // Disambiguation: when a lookup (nome/atleta) returns multiple candidates, inject a
    // fixed question text so the model's sugerir_opcoes chips are never orphaned.
    if (isLookupCall && ranked.length > 1) {
      const rawTerm = (input as RacketFilters).nome ?? (input as RacketFilters).atleta ?? 'raquete'
      const term = rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1)
      pendingQuestionFieldRef.value = `disambig:${term}`
    }

    const topCandidates = candidatePool.slice(0, MAX_CANDIDATES).map(slimForModel)
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
      const precoChips = computePrecoChips(ranked)
      precoChipsRef.value = precoChips
      const bucketMappings = PRECO_BUCKETS
        .filter(b => precoChips.includes(b.label))
        .map(b => `"${b.label}" → ${b.instrucao}`)
        .concat(['"Tanto faz" → presupuesto_min=0 (sem filtro de preço)'])
        .join('; ')
      payload.PRECO = {
        status: 'ORCAMENTO_DESCONHECIDO',
        candidatas: priceDecision.rangeMin != null ? `R$${priceDecision.rangeMin}–R$${priceDecision.rangeMax}` : undefined,
        instrucao_OBRIGATORIA:
          `Orçamento não informado. ` +
          `AÇÃO OBRIGATÓRIA: (1) escreva uma frase de pergunta sobre faixa de preço no texto — ex.: "${PRECO_QUESTION_TEXT}" — sem essa frase os chips ficam órfãos e o usuário não entende o que os botões significam; ` +
          `(2) chame sugerir_opcoes com chips ${JSON.stringify(precoChips)}. ` +
          `PROIBIDO chamar recomendar_raquetas antes de receber a resposta. ` +
          `Após receber a faixa, chame buscar_raquetas novamente com os filtros ANTES de recomendar: ` +
          `${bucketMappings}. ` +
          `Se a faixa escolhida retornar 0 raquetes: diga honestamente e mostre a opção mais próxima fora da faixa.`,
      }
    } else {
      payload.PRECO = {
        status: priceDecision.status === 'similar' ? 'PRECO_SIMILAR' : 'BUDGET_CONHECIDO',
        note: priceDecision.note,
        ...(isBudgetOpen ? {
          instrucao_custo_beneficio: 'Orçamento aberto ("tanto faz"). Na recomendação, mencione brevemente qual opção oferece melhor custo-benefício — ex.: "a [modelo] rende quase igual às outras e é a mais em conta".',
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

    // Offer brand filter AFTER recommendations, only once, not for direct purchases.
    const builtMarcaJaFornecida = confirmedMarca !== undefined
    const shouldOfferBrandFilter = !brandAskedRef.value && !builtMarcaJaFornecida && built.length > 0 && tipoDaRec !== 'compra_direta'
    if (shouldOfferBrandFilter) {
      brandAskedRef.value = true
      marcaAskPendingRef.value = true
      pendingQuestionFieldRef.value = 'marca'
      const recBrands = [...new Set(
        built
          .map(r => (r.racket as unknown as { brands?: { name: string } | null }).brands?.name)
          .filter((n): n is string => n != null)
      )]
      const brandChips = [...recBrands, 'Tanto faz']
      marcaChipsRef.value = brandChips
      return JSON.stringify({
        confirmado: true,
        registradas: built.length,
        MARCA_FILTRO: {
          status: 'OFERECER_FILTRO_POS_REC',
          marcas_disponiveis: recBrands,
          instrucao_OBRIGATORIA:
            `Recomendação concluída. Após narrar as raquetes, ofereça o filtro de marca no FINAL da resposta. ` +
            `AÇÃO OBRIGATÓRIA: (1) escreva UMA frase curta — ex.: "${MARCA_FILTRO_QUESTION_TEXT}"; ` +
            `(2) chame sugerir_opcoes com chips ${JSON.stringify(brandChips)}. ` +
            `Se o usuário escolher uma marca: chame buscar_raquetas com essa marca_preferida e recomende novamente. ` +
            `Se responder "Tanto faz": encerre sem nova busca.`,
        },
      })
    }

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
  signal?: AbortSignal
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
  const PRICE_ANSWERS = new Set([
    // Current buckets
    'Até R$1.000', 'R$1.000 a R$2.000', 'R$2.000 a R$3.000', 'Mais de R$3.000',
    // Legacy buckets (backward compat — old BUDGET_CHIPS labels from before 0.3.439)
    'Até R$1.500', 'R$1.500–2.500', 'R$2.500–3.500', 'Acima de R$3.500', 'Acima de R$2.500', 'Acima de R$3.000',
    'Tanto faz / me mostra opções',
  ])
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
        result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, currentRacketNotFoundRef, confirmedProfile, budgetAnsweredRef, precoChipsRef, marcaChipsRef, showAllBrandsRef, confirmedMarca, history)
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
          if (parsed.encontradas > 0 && !parsed.fora_do_orcamento && !isLookup) hasSearchResults = true
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
          const result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, currentRacketNotFoundRef, confirmedProfile, budgetAnsweredRef, precoChipsRef, marcaChipsRef, showAllBrandsRef, confirmedMarca, history)
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

  // Fallback if MAX_TOOL_ROUNDS exhausted
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
  // For akinator fields: model writes only the acuse; the code injects the question text
  // deterministically below (after the stream). For preco/marca/disambig: model writes
  // the question itself, with a code-level fallback for empty responses.
  if (pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
    const field = pendingQuestionFieldRef.value
    const fixedText = field
      ? field === 'preco' ? PRECO_QUESTION_TEXT
        : field === 'marca' ? (pendingRecommendations.length > 0 ? MARCA_FILTRO_QUESTION_TEXT : MARCA_QUESTION_TEXT)
        : field.startsWith('disambig:') ? `Achei algumas ${field.slice('disambig:'.length)}. Qual delas é a sua?`
        : getFixedQuestionText(field as FieldKey)
      : null
    const isAkinatorField = field && !field.startsWith('disambig:') && field !== 'preco' && field !== 'marca'
    systemBlocks.push({
      type: 'text',
      text: isAkinatorField
        ? `\n\n[INSTRUÇÃO OBRIGATÓRIA]\nEscreva SOMENTE uma frase curta de acolhimento (ex: "Entendido!", "Boa!"). NÃO escreva a pergunta — o código a injetará automaticamente. NÃO mencione lesão, nível, estilo, preço ou marca.`
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

  // For akinator fields: always append the fixed question text after the model's acuse.
  // The question comes from the fixed set — never from the model — making it deterministic.
  // For preco/marca/disambig: model writes the question; fallback only when text is empty.
  if (pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
    const field = pendingQuestionFieldRef.value
    const isAkinator = field && !field.startsWith('disambig:') && field !== 'preco' && field !== 'marca'
    if (isAkinator) {
      const fixedQ = getFixedQuestionText(field as FieldKey)
      if (fixedQ && !text.includes(fixedQ)) {
        const addition = (text.trim() ? '\n\n' : '') + fixedQ
        text += addition
        onToken(addition)
      }
    } else if (!text.trim()) {
      const fallback = field
        ? field === 'preco' ? PRECO_QUESTION_TEXT
          : field === 'marca' ? (pendingRecommendations.length > 0 ? MARCA_FILTRO_QUESTION_TEXT : MARCA_QUESTION_TEXT)
          : field.startsWith('disambig:') ? `Achei algumas ${field.slice('disambig:'.length)}. Qual delas é a sua?`
          : null
        : null
      if (fallback) {
        text = fallback
        onToken(fallback)
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
