import Anthropic from '@anthropic-ai/sdk'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompt'
import { PRICING, TokenUsage } from './pricing'
import { buscarRaquetas, detalleRaqueta, getRaquetasByIds, RacketFilters, RecommendedRacket, RacketWithInsights } from '../recommend'
import { calcular_faixa_ideal_traced, computeScorerWeights, FaixaIdeal, FittingProfile } from '../scorer'
import type { DecisionTrace, FilterStep, PrecoDecision, MarcaDecision } from '../debug-types'
import { computeProfileConfidence, CONFIDENCE_CONFIG, getFixedQuestionText, getChipsForField, PRECO_QUESTION_TEXT, AKINATOR_QUESTION_TEXTS, type ConfidenceInfo, type FieldKey } from './confidence'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = PRICING.model
const MAX_TOKENS = 2048  // 1024 was too tight for tool call JSON + final recommendation text
const MAX_TOOL_ROUNDS = 5  // nominal flow needs 3-4 rounds; 5 covers stall+chips edge cases

const MARCA_QUESTION_TEXT = 'Tem alguma marca que você curte ou tanto faz?'
const MARCA_CHIPS = ['AMA Sport', 'Drop Shot', "Heroe's", 'Tanto faz']
const BRAND_BOOST = 1.5  // must match recommend.ts BRAND_BOOST

// Budget decision: ask whenever the user hasn't told us their budget.
// The old "price dispersion" criterion was wrong — candidates can be similar to
// each other but still entirely out of the user's budget. Only skip when we
// already know the budget (presupuesto_max set, OR presupuesto_min !== undefined
// which covers "tanto faz" = min=0 and "acima de R$X" = min>0).
function computePrecoDecision(
  ranked: Array<{ price: number | null }>,
  budgetKnown: boolean,
): PrecoDecision {
  if (budgetKnown) {
    return { status: 'budget_known', note: 'usuário informou faixa de preço — filtrado na busca' }
  }

  const prices = ranked.slice(0, 5).map(r => r.price).filter((p): p is number => p != null && p > 0)
  const rangeMin = prices.length > 0 ? Math.min(...prices) : null
  const rangeMax = prices.length > 0 ? Math.max(...prices) : null
  const rangeNote = rangeMin != null && rangeMax != null
    ? `candidatas R$${rangeMin}–R$${rangeMax}`
    : 'sem dados de preço'

  return {
    status: 'disparo',
    note: `orçamento desconhecido + ${rangeNote} → perguntar faixa`,
    rangeMin:  rangeMin  ?? undefined,
    rangeMax:  rangeMax  ?? undefined,
    rangeBrl:  rangeMin != null && rangeMax != null ? rangeMax - rangeMin : undefined,
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
  | 'comparacao' | 'presente' | 'preco_orcamento' | 'curiosidade' | 'outra'

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
    if (a.fora_da_faixa !== b.fora_da_faixa) return a.fora_da_faixa ? 1 : -1
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
  return confirmed
}

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
  pendingQuestionFieldRef: { value: FieldKey | 'preco' | 'marca' | null },
  marcaAskPendingRef: { value: boolean },
  brandAskedRef: { value: boolean },
  currentRacketIds: Set<number>,
  confirmedProfile: Record<string, unknown>
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
      // Record which field is being asked so streamResponse can inject the exact
      // fixed question text — preventing chips from appearing without a question.
      pendingQuestionFieldRef.value = q.field
      // Do NOT include baseResult here — the faixa numbers are stored in diagnosticoRef.value
      // and will be injected via FAIXA VINCULANTE when the agent actually recommends.
      // Exposing peso/balance/prioridades now would cause the agent to show the "SEU PERFIL IDEAL"
      // block while still gathering info, which contradicts asking a follow-up question.
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
            `AÇÃO OBRIGATÓRIA: (1) chame sugerir_opcoes com os chips acima; ` +
            `(2) a pergunta já será emitida automaticamente pelo sistema — NÃO a escreva você mesmo. ` +
            `Você pode escrever uma frase CURTA de acolhimento do que o usuário disse (ex: "Entendido!", "Boa!") ANTES dos chips. ` +
            `PROIBIDO mostrar perfil ideal, peso ou balance agora. ` +
            `PROIBIDO chamar buscar_raquetas ou recomendar_raquetas nesta resposta.`,
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
    // Any call to buscar_raquetas after the brand question clears the pending flag
    if (marcaAskPendingRef.value && (input as RacketFilters).marca_preferida !== undefined) {
      marcaAskPendingRef.value = false
    }
    const { raquetes, criteriosRelaxados, filterTrace } = await buscarRaquetas(input as RacketFilters)
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
    const MAX_CANDIDATES = 8

    if (ranked.length === 0) {
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
    const budgetKnown = isNameSearch || !!(input as RacketFilters).presupuesto_max || (input as RacketFilters).presupuesto_min !== undefined
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

    const topCandidates = candidatePool.slice(0, MAX_CANDIDATES).map(slimForModel)
    const payload: Record<string, unknown> = {
      encontradas: ranked.length,
      raquetes: topCandidates,
      ...(ranked.length > MAX_CANDIDATES ? { nota: `Exibindo top ${MAX_CANDIDATES} de ${ranked.length} candidatas ordenadas por relevância.` } : {}),
    }
    if (criteriosRelaxados.length > 0) payload.criterios_relaxados = criteriosRelaxados

    // ── Marca decision ─────────────────────────────────────────────────────────
    // Ask brand preference once, after budget is known, for profile-based searches.
    // marca_preferida === undefined means "not yet provided" (distinct from null = "tanto faz").
    const marcaJaFornecida = (input as RacketFilters).marca_preferida !== undefined
    const shouldAskMarca = budgetKnown && !isNameSearch && !marcaJaFornecida && !brandAskedRef.value && !priceAskPendingRef.value
    if (shouldAskMarca) {
      brandAskedRef.value = true
      marcaAskPendingRef.value = true
      pendingQuestionFieldRef.value = 'marca'
    }

    // Capture MarcaDecision for debug
    const marcaPreferida = (input as RacketFilters).marca_preferida ?? null
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

    if (priceDecision.status === 'disparo') {
      const chips = ['Até R$1.500', 'R$1.500–2.500', 'Acima de R$2.500', 'Tanto faz / me mostra opções']
      payload.PRECO = {
        status: 'ORCAMENTO_DESCONHECIDO',
        candidatas: priceDecision.rangeMin != null ? `R$${priceDecision.rangeMin}–R$${priceDecision.rangeMax}` : undefined,
        instrucao_OBRIGATORIA:
          `Orçamento não informado. ` +
          `AÇÃO OBRIGATÓRIA: (1) escreva uma frase de pergunta sobre faixa de preço no texto — ex.: "Pra fechar a indicação certa, qual faixa de preço faz mais sentido pro seu bolso?" — sem essa frase os chips ficam órfãos e o usuário não entende o que os botões significam; ` +
          `(2) chame sugerir_opcoes com chips ${JSON.stringify(chips)}. ` +
          `PROIBIDO chamar recomendar_raquetas antes de receber a resposta. ` +
          `Após receber a faixa, chame buscar_raquetas novamente com os filtros abaixo ANTES de recomendar: ` +
          `"Até R$1.500" → presupuesto_max=1500; ` +
          `"R$1.500–2.500" → presupuesto_min=1500 + presupuesto_max=2500; ` +
          `"Acima de R$2.500" → presupuesto_min=2500 (sem teto); ` +
          `"Tanto faz" → presupuesto_min=0 (sem filtro de preço). ` +
          `Se a faixa escolhida retornar 0 raquetes: diga honestamente e mostre a opção mais próxima fora da faixa.`,
      }
    } else {
      payload.PRECO = {
        status: 'BUDGET_CONHECIDO',
        note: priceDecision.note,
        ...(isBudgetOpen ? {
          instrucao_custo_beneficio: 'Orçamento aberto ("tanto faz"). Na recomendação, mencione brevemente qual opção oferece melhor custo-benefício — ex.: "a [modelo] rende quase igual às outras e é a mais em conta".',
        } : {}),
      }
    }

    if (shouldAskMarca) {
      payload.MARCA = {
        status: 'PREFERENCIA_NAO_PERGUNTADA',
        marcas_disponiveis: MARCA_CHIPS.slice(0, -1),
        instrucao_OBRIGATORIA:
          `Preferência de marca não informada. ` +
          `AÇÃO OBRIGATÓRIA: (1) escreva uma frase curta perguntando sobre preferência de marca no texto — ex.: "${MARCA_QUESTION_TEXT}" — sem essa frase os chips ficam órfãos; ` +
          `(2) chame sugerir_opcoes com chips ${JSON.stringify(MARCA_CHIPS)}. ` +
          `PROIBIDO chamar recomendar_raquetas antes de receber a resposta. ` +
          `Após receber a resposta, chame buscar_raquetas novamente com o campo marca_preferida: ` +
          `"AMA Sport" → marca_preferida="AMA Sport"; "Drop Shot" → marca_preferida="Drop Shot"; "Heroe's" → marca_preferida="Heroe's"; "Tanto faz" → marca_preferida=null. ` +
          `Se a marca preferida não tiver raquetes aptas no perfil: diga honestamente e mostre as melhores disponíveis de outras marcas.`,
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
      chips = ['Até R$1.500', 'R$1.500–2.500', 'Acima de R$2.500', 'Tanto faz / me mostra opções']
    } else if (field === 'marca') {
      chips = MARCA_CHIPS
    } else if (field) {
      const canonical = getChipsForField(field)
      chips = canonical.length > 0 ? canonical : opcoes.slice(0, 4)
    } else {
      // Fallback: detect lesão chips by content when pendingQuestionFieldRef wasn't set
      // (model called sugerir_opcoes directly without going through diagnosticar_perfil)
      const LESAO_KW = ['cotovelo', 'ombro', 'punho', 'tenho dor']
      const looksLikeLesao = opcoes.some(o => LESAO_KW.some(kw => o.toLowerCase().includes(kw)))
      chips = looksLikeLesao
        ? ['Sim, cotovelo', 'Sim, ombro', 'Punho ou outro lugar', 'Não tenho dor']
        : opcoes.slice(0, 4)
    }
    pendingSuggestions.push(...chips)
    return JSON.stringify({ exibidas: chips.length })
  }

  if (name === 'recomendar_raquetas') {
    // Hard gate: block recommendation if profile confidence is still insufficient.
    // Prevents the model from recommending mid-questionnaire even if it tries.
    if (debugRef.value.confidenceInfo?.willRecommend === false) {
      return JSON.stringify({
        erro: 'GATE_CONFIANCA: perfil incompleto — lesão não respondida.',
        instrucao: 'NÃO repita recomendar_raquetas agora. Faça a pergunta indicada por diagnosticar_perfil antes de recomendar.',
      })
    }
    const { raquetes } = input as RecommendInput
    // Cap at 3, then exclude the current racket identified by lookup in TROCA flow
    const capped = raquetes.slice(0, 3)
    const filtered = currentRacketIds.size > 0 ? capped.filter(r => !currentRacketIds.has(r.id)) : capped
    const ids = filtered.map(r => r.id)
    const rackets = await getRaquetasByIds(ids)

    // Construir recommendations preservando el orden y la razao del modelo
    const built: RecommendedRacket[] = filtered
      .flatMap(r => {
        const racket = rackets.find(rk => rk.id === r.id)
        if (!racket) return []
        const scoreEntry = debugRef.value.scorerResults?.find(s => s.id === r.id)
        const rec: RecommendedRacket = { racket, razao: r.razao, match_score: scoreEntry?.score }
        return [rec]
      })
      .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))

    // Mutate the array passed in — caller reads it after the loop
    pendingRecommendations.push(...built)

    return JSON.stringify({ confirmado: true, registradas: built.length })
  }

  return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` })
}

export async function runAgentTurn(
  history: ChatMessage[],
  onToken?: (token: string) => void,
  signal?: AbortSignal
): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = history.map(m => ({
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
  const brandAskedRef: { value: boolean } = { value: false }
  const pendingQuestionFieldRef: { value: FieldKey | 'preco' | 'marca' | null } = { value: null }
  const usage: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  // Count only the Akinator questions actually presented in history, not total user messages.
  // Total user messages reach maxQuestions (4) fast in long "quero trocar" flows, firing
  // recommendAnyway before lesão is asked. Akinator question texts are fixed/verbatim,
  // so an includes() check on assistant messages gives the real question round count.
  const profileQuestionsAsked = history
    .filter(m => m.role === 'assistant')
    .filter(m => AKINATOR_QUESTION_TEXTS.some(q => m.content.includes(q)))
    .length
  // Profile state derived from chip answers in history — immune to model omission between turns.
  // Lesão fields are also stripped from model input and re-injected from here (prevents inference).
  const confirmedProfile = extractConfirmedProfileFromHistory(history)
  // Current racket IDs from lookup searches (TROCA flow) — excluded from recomendar_raquetas
  const currentRacketIds = new Set<number>()
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
    const toolChoice = (hasSearchResults && pendingRecommendations.length === 0 && !priceAskPendingRef.value && !marcaAskPendingRef.value && !confidenceInsufficient)
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
        result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, confirmedProfile)
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
          const result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef, profileQuestionsAsked, priceAskPendingRef, pendingQuestionFieldRef, marcaAskPendingRef, brandAskedRef, currentRacketIds, confirmedProfile)
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
  pendingQuestionFieldRef: { value: FieldKey | 'preco' | 'marca' | null },
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
  // When chips are pending, inject the EXACT fixed question text for the field.
  // The model must use that phrase verbatim — preventing improvisation and orphaned chips.
  // A code-level fallback below covers the case where the model still returns empty text.
  if (pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
    const field = pendingQuestionFieldRef.value
    const fixedText = field
      ? (field === 'preco' ? PRECO_QUESTION_TEXT : field === 'marca' ? MARCA_QUESTION_TEXT : getFixedQuestionText(field))
      : null
    systemBlocks.push({
      type: 'text',
      text: fixedText
        ? `\n\n[INSTRUÇÃO OBRIGATÓRIA — PERGUNTA PARA OS CHIPS]\nOs chips de opção foram exibidos automaticamente abaixo desta mensagem. Sua resposta DEVE conter EXATAMENTE esta pergunta, sem alterar uma palavra:\n"${fixedText}"\nVocê pode escrever UMA frase curta de acolhimento do que a pessoa disse ANTES da pergunta (ex: "Entendido!", "Boa!"). Nada depois da pergunta. Não improvise outra formulação.`
        : `\n\n[INSTRUÇÃO OBRIGATÓRIA — PERGUNTA PARA OS CHIPS]\nOs chips de opção foram exibidos automaticamente abaixo desta mensagem. Sua resposta DEVE conter uma frase introdutória que explique ao usuário o que os botões significam — sem ela os chips aparecem "órfãos".`,
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

  // Code-level fallback: if the model returned empty text but chips are pending,
  // emit the fixed question directly. This guarantees chips are never orphaned even
  // if the model ignores the system block instruction.
  if (!text.trim() && pendingSuggestions.length > 0 && pendingRecommendations.length === 0) {
    const field = pendingQuestionFieldRef.value
    const fallback = field
      ? (field === 'preco' ? PRECO_QUESTION_TEXT : field === 'marca' ? MARCA_QUESTION_TEXT : getFixedQuestionText(field))
      : null
    if (fallback) {
      text = fallback
      onToken(fallback)
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
