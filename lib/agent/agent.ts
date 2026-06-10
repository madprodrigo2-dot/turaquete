import Anthropic from '@anthropic-ai/sdk'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompt'
import { buscarRaquetas, detalleRaqueta, getRaquetasByIds, RacketFilters, RecommendedRacket } from '../recommend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024
const MAX_TOOL_ROUNDS = 5

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AgentResult = {
  text: string
  recommendations?: RecommendedRacket[]
}

type RecommendInput = {
  raquetes: Array<{ id: number; razao: string }>
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  pendingRecommendations: RecommendedRacket[]
): Promise<string> {
  if (name === 'buscar_raquetas') {
    const { raquetes, criteriosRelaxados } = await buscarRaquetas(input as RacketFilters)
    if (raquetes.length === 0) {
      return JSON.stringify({ encontradas: 0, mensagem: 'Nenhuma raquete encontrada dentro do orçamento informado. O preço mínimo das raquetes disponíveis é por volta de R$1.400.' })
    }
    const payload: Record<string, unknown> = { encontradas: raquetes.length, raquetes }
    if (criteriosRelaxados.length > 0) payload.criterios_relaxados = criteriosRelaxados
    return JSON.stringify(payload)
  }

  if (name === 'detalle_raqueta') {
    const racket = await detalleRaqueta(input.id as number)
    if (!racket) return JSON.stringify({ erro: 'Raquete não encontrada.' })
    return JSON.stringify(racket)
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

export async function runAgentTurn(history: ChatMessage[]): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role,
    content: m.content,
  }))

  const pendingRecommendations: RecommendedRacket[] = []
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
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock?.type === 'text' ? textBlock.text : ''
      return {
        text,
        recommendations: pendingRecommendations.length > 0 ? pendingRecommendations : undefined,
      }
    }

    rounds++
    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const result = await executeTool(block.name, block.input as Record<string, unknown>, pendingRecommendations)

      if (block.name === 'buscar_raquetas') {
        try {
          const parsed = JSON.parse(result) as { encontradas: number }
          if (parsed.encontradas > 0) hasSearchResults = true
        } catch { /* ignore parse errors */ }
      }

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  // Fallback if MAX_TOOL_ROUNDS exhausted — keep tools available so recomendar can still fire
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
  }
}
