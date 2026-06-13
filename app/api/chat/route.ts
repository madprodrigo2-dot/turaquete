import { NextRequest, NextResponse } from 'next/server'
import { runAgentTurn, ChatMessage } from '@/lib/agent/agent'
import { calcCost, PRICING } from '@/lib/agent/pricing'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'

// In-memory dedup: rejects the same message arriving twice within 2s for the same session.
// Map key = sessionId, value = { lastMsg, timestamp }.
// Module-scoped so it persists across requests in the same serverless instance.
const dedupCache = new Map<string, { lastMsg: string; ts: number }>()
const DEDUP_WINDOW_MS = 2_000

const VOCAB_BLOCKLIST: [RegExp, string][] = [
  [/\bforgiveness\b/gi, 'sweet spot'],
  [/\bmaneuverability\b/gi, 'manuseio'],
]

function sanitizeToken(token: string): string {
  let t = token
    .replace(/ — /g, ', ')
    .replace(/— /g, ', ')
    .replace(/ —/g, ', ')
    .replace(/—/g, ',')
  for (const [re, replacement] of VOCAB_BLOCKLIST) {
    if (re.test(t)) {
      console.warn(`[sanitize] blocked internal term, replacing with "${replacement}"`)
      re.lastIndex = 0
      t = t.replace(re, replacement)
    }
  }
  return t
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, sessionId, primeiraMensagem, starterUsado } = body as {
      messages: ChatMessage[]
      sessionId: string
      primeiraMensagem?: string
      starterUsado?: string | null
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages obrigatório' }, { status: 400 })
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      '127.0.0.1'

    if (!checkRateLimit(ip, sessionId || undefined)) {
      return NextResponse.json(
        { error: 'Opa, muitas mensagens! Tenta de novo em alguns minutos.' },
        { status: 429 }
      )
    }

    // Server-side dedup: reject identical consecutive messages within DEDUP_WINDOW_MS
    if (sessionId) {
      const lastMsg = messages[messages.length - 1]
      const key = sessionId
      const prev = dedupCache.get(key)
      const now = Date.now()
      if (
        prev &&
        prev.lastMsg === lastMsg.content &&
        now - prev.ts < DEDUP_WINDOW_MS
      ) {
        return NextResponse.json({ error: 'Mensagem duplicada.' }, { status: 429 })
      }
      dedupCache.set(key, { lastMsg: lastMsg.content, ts: now })
      // Prune stale entries (keep map small — serverless instances are ephemeral anyway)
      if (dedupCache.size > 500) {
        const cutoff = now - 60_000
        for (const [k, v] of dedupCache) {
          if (v.ts < cutoff) dedupCache.delete(k)
        }
      }
    }

    const encoder = new TextEncoder()
    const writeEvent = (controller: ReadableStreamDefaultController, data: object) => {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      } catch { /* client disconnected */ }
    }

    const agentController = new AbortController()
    const agentTimeout = setTimeout(() => agentController.abort(), 45_000)

    const stream = new ReadableStream({
      async start(controller) {
        // Heartbeat: keeps the SSE connection alive during tool-call processing
        // (which sends no tokens). Without this, the client's reader.read() can
        // block indefinitely in environments where AbortController doesn't
        // propagate to the stream reader (Safari, some proxy setups).
        const heartbeat = setInterval(() => {
          writeEvent(controller, { type: 'ping' })
        }, 5_000)

        try {
          const { text, recommendations, suggestions, isComparison, diagnostico, intencao, usage } = await runAgentTurn(messages, (token) => {
            writeEvent(controller, { type: 'token', token: sanitizeToken(token) })
          }, agentController.signal)
          clearTimeout(agentTimeout)

          const { usd, brl } = calcCost(usage)

          // Fire-and-forget persistence
          getSupabase()
            .from('conversations')
            .insert({
              session_id: sessionId,
              messages: [...messages, { role: 'assistant', content: text }],
              recommended_racket_ids: recommendations?.map(r => r.racket.id) ?? [],
              tokens_input:       usage.input,
              tokens_output:      usage.output,
              tokens_cache_read:  usage.cacheRead,
              tokens_cache_write: usage.cacheWrite,
              modelo_usado:       PRICING.model,
              custo_usd:          usd,
              custo_brl:          brl,
              ...(primeiraMensagem !== undefined && {
                primeira_mensagem: primeiraMensagem,
                starter_usado: starterUsado ?? null,
                intencao_detectada: intencao ?? null,
              }),
            })
            .then(({ error }) => {
              if (error) console.error('Conversations insert error:', error.message)
            })

          if (recommendations && recommendations.length > 0) {
            getSupabaseAdmin()
              .from('recommendation_events')
              .insert(recommendations.map(r => ({
                racket_id: r.racket.id,
                conversation_id: sessionId,
              })))
              .then(({ error }) => {
                if (error) console.error('Recommendation events insert error:', error.message)
              })
          }

          writeEvent(controller, {
            type: 'done',
            recommendations: recommendations ?? null,
            suggestions: suggestions ?? null,
            isComparison: isComparison ?? false,
            diagnostico: diagnostico ?? null,
            intencao: intencao ?? null,
          })
        } catch (err) {
          clearTimeout(agentTimeout)
          if (err instanceof Error && err.name === 'AbortError') {
            writeEvent(controller, { type: 'error', message: 'Opa, travei aqui. Pode mandar de novo?' })
          } else {
            console.error('Chat stream error:', err)
            writeEvent(controller, { type: 'error', message: 'Erro interno. Tente novamente.' })
          }
        } finally {
          clearInterval(heartbeat)
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
