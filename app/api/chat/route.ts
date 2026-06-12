import { NextRequest, NextResponse } from 'next/server'
import { runAgentTurn, ChatMessage } from '@/lib/agent/agent'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, sessionId } = body as { messages: ChatMessage[]; sessionId: string }

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

    const encoder = new TextEncoder()
    const writeEvent = (controller: ReadableStreamDefaultController, data: object) => {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      } catch { /* client disconnected */ }
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { text, recommendations, suggestions, isComparison, diagnostico } = await runAgentTurn(messages, (token) => {
            writeEvent(controller, { type: 'token', token })
          })

          // Fire-and-forget persistence
          getSupabase()
            .from('conversations')
            .insert({
              session_id: sessionId,
              messages: [...messages, { role: 'assistant', content: text }],
              recommended_racket_ids: recommendations?.map(r => r.racket.id) ?? [],
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
          })
        } catch (err) {
          console.error('Chat stream error:', err)
          writeEvent(controller, { type: 'error', message: 'Erro interno. Tente novamente.' })
        } finally {
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
