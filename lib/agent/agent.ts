import Anthropic from '@anthropic-ai/sdk'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompt'
import { PRICING, TokenUsage } from './pricing'
import { buscarRaquetas, detalleRaqueta, getRaquetasByIds, RacketFilters, RecommendedRacket, RacketWithInsights } from '../recommend'
import { calcular_faixa_ideal_traced, computeScorerWeights, FaixaIdeal, FittingProfile } from '../scorer'
import type { DecisionTrace, FilterStep } from '../debug-types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = PRICING.model
const MAX_TOKENS = 2048  // 1024 was too tight for tool call JSON + final recommendation text
const MAX_TOOL_ROUNDS = 5

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

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  pendingRecommendations: RecommendedRacket[],
  pendingSuggestions: string[],
  diagnosticoRef: { value: FaixaIdeal | null },
  intencaoRef: { value: IntencaoTipo | null },
  debugRef: { value: AgentDebugInfo }
): Promise<string> {
  if (name === 'registrar_intencao') {
    intencaoRef.value = input.intencao as IntencaoTipo
    return JSON.stringify({ registrado: true })
  }

  if (name === 'diagnosticar_perfil') {
    const { faixa, trace } = calcular_faixa_ideal_traced(input as FittingProfile)
    diagnosticoRef.value = faixa
    debugRef.value.perfilInput = input
    if (!debugRef.value.decisionTrace) debugRef.value.decisionTrace = {}
    debugRef.value.decisionTrace.faixaSteps = trace.steps
    debugRef.value.decisionTrace.conflitos = trace.conflitos
    return JSON.stringify({
      peso_min: faixa.peso_min,
      peso_max: faixa.peso_max,
      balance_preferido: faixa.balance_preferido,
      prioridades: faixa.prioridades,
      descricao: `${faixa.peso_min}–${faixa.peso_max}g, balance ${faixa.balance_preferido}, priorize ${faixa.prioridades.join(', ')}`,
      DADO_VINCULANTE: `Narre EXATAMENTE "${faixa.peso_min}–${faixa.peso_max}g" no diagnóstico. PROIBIDO usar outros valores de peso. Estes números vieram do código e são definitivos.`,
    })
  }

  if (name === 'buscar_raquetas') {
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
    if (ranked.length === 0) {
      return JSON.stringify({ encontradas: 0, mensagem: 'Nenhuma raquete encontrada dentro do orçamento informado. O preço mínimo das raquetes disponíveis é por volta de R$1.400.' })
    }
    const payload: Record<string, unknown> = { encontradas: ranked.length, raquetes: ranked }
    if (criteriosRelaxados.length > 0) payload.criterios_relaxados = criteriosRelaxados
    return JSON.stringify(payload)
  }

  if (name === 'detalle_raqueta') {
    const racket = await detalleRaqueta(input.id as number)
    if (!racket) return JSON.stringify({ erro: 'Raquete não encontrada.' })
    return JSON.stringify(racket)
  }

  if (name === 'sugerir_opcoes') {
    const { opcoes } = input as SuggestInput
    pendingSuggestions.push(...opcoes.slice(0, 4))
    return JSON.stringify({ exibidas: opcoes.length })
  }

  if (name === 'recomendar_raquetas') {
    const { raquetes } = input as RecommendInput
    // Limitar a 3 aunque el modelo mande más
    const capped = raquetes.slice(0, 3)
    const ids = capped.map(r => r.id)
    const rackets = await getRaquetasByIds(ids)

    // Construir recommendations preservando el orden y la razao del modelo
    const built: RecommendedRacket[] = capped
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
  const usage: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  let isComparison = false
  let rounds = 0
  let hasSearchResults = false
  // Stall recovery: if the model emits pure text with no tool calls on the first
  // round (e.g. "Um segundo." / "Deixa eu buscar..."), we retry once with
  // tool_choice:'any' to force it to actually call a tool. The stall response is
  // discarded — messages stays untouched so the forced retry gets a clean slate.
  let stalledOnce = false

  while (rounds < MAX_TOOL_ROUNDS) {
    const nothingDoneYet = !diagnosticoRef.value && pendingRecommendations.length === 0 && !hasSearchResults

    // tool_choice priority:
    //   1. Force recomendar_raquetas when search results exist but no picks yet
    //   2. Force any tool when the model just stalled on a first-round text-only response
    //   3. Auto otherwise
    const toolChoice = (hasSearchResults && pendingRecommendations.length === 0)
      ? { type: 'tool' as const, name: 'recomendar_raquetas' }
      : (stalledOnce && nothingDoneYet)
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
      if (nothingDoneYet && !stalledOnce && response.stop_reason === 'end_turn') {
        stalledOnce = true
        rounds++ // charge against budget to prevent infinite loop
        console.warn('[agent] stall detected — retrying with tool_choice:any')
        continue  // messages unchanged; model gets forced tool choice on next iteration
      }

      if (onToken) {
        return streamResponse(messages, pendingRecommendations, pendingSuggestions, isComparison, diagnosticoRef, intencaoRef, debugRef, usage, onToken, signal)
      }
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock?.type === 'text' ? textBlock.text : ''
      return {
        text,
        recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
        suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
        isComparison: isComparison || undefined,
        diagnostico: diagnosticoRef.value ?? undefined,
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
        result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef, debugRef)
      } catch (toolErr) {
        console.error(`Tool ${block.name} error:`, toolErr)
        result = JSON.stringify({ erro: 'Ferramenta temporariamente indisponível. Continue sem ela.', encontradas: 0 })
      }

      if (block.name === 'buscar_raquetas') {
        try {
          const parsed = JSON.parse(result) as { encontradas: number }
          if (parsed.encontradas > 0) hasSearchResults = true
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

  // Fallback if MAX_TOOL_ROUNDS exhausted
  if (onToken) {
    return streamResponse(messages, pendingRecommendations, pendingSuggestions, isComparison, diagnosticoRef, intencaoRef, debugRef, usage, onToken, signal)
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
    diagnostico: diagnosticoRef.value ?? undefined,
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

  return {
    text,
    recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
    suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
    isComparison: isComparison || undefined,
    diagnostico: diagnosticoRef.value ?? undefined,
    intencao: intencaoRef.value ?? undefined,
    usage,
    debug: debugRef.value,
  }
}
