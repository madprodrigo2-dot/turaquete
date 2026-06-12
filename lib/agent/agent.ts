import Anthropic from '@anthropic-ai/sdk'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompt'
import { buscarRaquetas, detalleRaqueta, getRaquetasByIds, RacketFilters, RecommendedRacket, RacketWithInsights } from '../recommend'
import { calcular_faixa_ideal, FaixaIdeal, FittingProfile } from '../scorer'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024
const MAX_TOOL_ROUNDS = 5

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type IntencaoTipo =
  | 'primeira_raquete' | 'troca' | 'ajuste_da_atual' | 'lesao_dor'
  | 'comparacao' | 'presente' | 'preco_orcamento' | 'curiosidade' | 'outra'

export type AgentResult = {
  text: string
  recommendations?: RecommendedRacket[]
  suggestions?: string[]
  isComparison?: boolean
  diagnostico?: FaixaIdeal
  intencao?: IntencaoTipo
}

export type { FaixaIdeal }

type RecommendInput = {
  raquetes: Array<{ id: number; razao: string }>
  tipo?: 'recomendacao' | 'comparacao'
}

type SuggestInput = {
  opcoes: string[]
}

// Marks rackets with fora_da_faixa and sorts in-range first.
// Tolerance ±5g accounts for factory variation; spec rule: a 330g nominal racket
// is never "in range" for a 320g-max faixa (330 > 320+5).
function applyFaixaFilter(
  raquetes: (RacketWithInsights & { match_score: number })[],
  faixa: FaixaIdeal
): (RacketWithInsights & { match_score: number; fora_da_faixa: boolean })[] {
  const TOLERANCIA = 5
  const marked = raquetes.map(r => {
    const peso = r.weight_g
    const fora = peso != null
      ? peso < faixa.peso_min - TOLERANCIA || peso > faixa.peso_max + TOLERANCIA
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
  intencaoRef: { value: IntencaoTipo | null }
): Promise<string> {
  if (name === 'registrar_intencao') {
    intencaoRef.value = input.intencao as IntencaoTipo
    return JSON.stringify({ registrado: true })
  }

  if (name === 'diagnosticar_perfil') {
    const faixa = calcular_faixa_ideal(input as FittingProfile)
    diagnosticoRef.value = faixa
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
    const { raquetes, criteriosRelaxados } = await buscarRaquetas(input as RacketFilters)
    const ranked = diagnosticoRef.value ? applyFaixaFilter(raquetes, diagnosticoRef.value) : raquetes
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
      .map(r => {
        const racket = rackets.find(rk => rk.id === r.id)
        if (!racket) return null
        return { racket, razao: r.razao }
      })
      .filter((r): r is RecommendedRacket => r !== null)

    // Mutate the array passed in — caller reads it after the loop
    pendingRecommendations.push(...built)

    return JSON.stringify({ confirmado: true, registradas: built.length })
  }

  return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` })
}

export async function runAgentTurn(
  history: ChatMessage[],
  onToken?: (token: string) => void
): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role,
    content: m.content,
  }))

  const pendingRecommendations: RecommendedRacket[] = []
  const pendingSuggestions: string[] = []
  const diagnosticoRef: { value: FaixaIdeal | null } = { value: null }
  const intencaoRef: { value: IntencaoTipo | null } = { value: null }
  let isComparison = false
  let rounds = 0
  let hasSearchResults = false

  while (rounds < MAX_TOOL_ROUNDS) {
    // Once we have search results and haven't committed to recommendations yet,
    // force recomendar_raquetas — prevents the model from narrating "agora vou escolher"
    // without actually choosing.
    const toolChoice = (hasSearchResults && pendingRecommendations.length === 0)
      ? { type: 'tool' as const, name: 'recomendar_raquetas' }
      : { type: 'auto' as const }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: agentTools,
      tool_choice: toolChoice,
      messages,
    })

    if (response.stop_reason !== 'tool_use') {
      if (onToken) {
        return streamResponse(messages, pendingRecommendations, pendingSuggestions, isComparison, diagnosticoRef, intencaoRef, onToken)
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
      }
    }

    rounds++
    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      let result: string
      try {
        result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations, pendingSuggestions, diagnosticoRef, intencaoRef)
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
    return streamResponse(messages, pendingRecommendations, pendingSuggestions, isComparison, diagnosticoRef, intencaoRef, onToken)
  }
  const finalResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: agentTools,
    messages,
  })
  const textBlock = finalResponse.content.find(b => b.type === 'text')
  return {
    text: textBlock?.type === 'text' ? textBlock.text : '',
    recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
    suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
    isComparison: isComparison || undefined,
    diagnostico: diagnosticoRef.value ?? undefined,
    intencao: intencaoRef.value ?? undefined,
  }
}

async function streamResponse(
  messages: Anthropic.MessageParam[],
  pendingRecommendations: RecommendedRacket[],
  pendingSuggestions: string[],
  isComparison: boolean,
  diagnosticoRef: { value: FaixaIdeal | null },
  intencaoRef: { value: IntencaoTipo | null },
  onToken: (token: string) => void
): Promise<AgentResult> {
  // Inject the calculated faixa into the system prompt so the final narrative
  // is forced to use the exact numbers from calcular_faixa_ideal, not the model's own calculation.
  const systemForStream = diagnosticoRef.value
    ? `${SYSTEM_PROMPT}\n\n[FAIXA VINCULANTE CALCULADA PELO CÓDIGO]\npeso_min=${diagnosticoRef.value.peso_min}g  peso_max=${diagnosticoRef.value.peso_max}g  balance=${diagnosticoRef.value.balance_preferido}\nNarre EXATAMENTE estes valores. É proibido usar qualquer outro número de peso no diagnóstico desta conversa.`
    : SYSTEM_PROMPT

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemForStream,
    messages,
  })

  let text = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text
      onToken(event.delta.text)
    }
  }

  return {
    text,
    recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
    suggestions: pendingSuggestions.length > 0 ? pendingSuggestions : undefined,
    isComparison: isComparison || undefined,
    diagnostico: diagnosticoRef.value ?? undefined,
    intencao: intencaoRef.value ?? undefined,
  }
}
