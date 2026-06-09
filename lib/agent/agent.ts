import Anthropic from '@anthropic-ai/sdk'
import { agentTools } from './tools'
import { SYSTEM_PROMPT } from './prompt'
import { buscarRaquetas, detalleRaqueta, RacketFilters } from '../recommend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Haiku para el loop completo (costo bajo); cambiar solo la constante para subir de modelo
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024
const MAX_TOOL_ROUNDS = 3 // evita loops infinitos

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === 'buscar_raquetas') {
    const results = await buscarRaquetas(input as RacketFilters)
    if (results.length === 0) {
      return JSON.stringify({ encontradas: 0, mensagem: 'Nenhuma raquete encontrada com esses filtros.' })
    }
    return JSON.stringify({ encontradas: results.length, raquetes: results })
  }

  if (name === 'detalle_raqueta') {
    const racket = await detalleRaqueta(input.id as number)
    if (!racket) return JSON.stringify({ erro: 'Raquete não encontrada.' })
    return JSON.stringify(racket)
  }

  return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` })
}

export async function runAgentTurn(history: ChatMessage[]): Promise<string> {
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role,
    content: m.content,
  }))

  let rounds = 0

  while (rounds < MAX_TOOL_ROUNDS) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: agentTools,
      messages,
    })

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find(b => b.type === 'text')
      return textBlock?.type === 'text' ? textBlock.text : ''
    }

    // Hay tool_use: ejecutar y continuar el loop
    rounds++
    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const result = await executeTool(block.name, block.input as Record<string, unknown>)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  // Fallback si se agota MAX_TOOL_ROUNDS
  const finalResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages,
  })
  const textBlock = finalResponse.content.find(b => b.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : ''
}
