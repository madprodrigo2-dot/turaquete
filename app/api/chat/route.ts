import { NextRequest, NextResponse } from 'next/server'
import { runAgentTurn, ChatMessage } from '@/lib/agent/agent'
import { getSupabase } from '@/lib/supabase'
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
        { text: 'Opa, muitas mensagens! Tenta de novo em alguns minutos.', recommendations: undefined },
        { status: 429 }
      )
    }

    const { text, recommendations } = await runAgentTurn(messages)

    // Persistir conversa de forma assíncrona (sem bloquear a resposta)
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

    return NextResponse.json({ text, recommendations })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
