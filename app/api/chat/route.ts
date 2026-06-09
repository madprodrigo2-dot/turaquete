import { NextRequest, NextResponse } from 'next/server'
import { runAgentTurn, ChatMessage } from '@/lib/agent/agent'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, sessionId } = body as { messages: ChatMessage[]; sessionId: string }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages obrigatório' }, { status: 400 })
    }

    const text = await runAgentTurn(messages)

    // Persistir conversa de forma assíncrona (sem bloquear a resposta)
    getSupabase()
      .from('conversations')
      .insert({
        session_id: sessionId,
        messages: [...messages, { role: 'assistant', content: text }],
      })
      .then(({ error }) => {
        if (error) console.error('Conversations insert error:', error.message)
      })

    return NextResponse.json({ text })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
