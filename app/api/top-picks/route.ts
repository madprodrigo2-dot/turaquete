import { NextRequest, NextResponse } from 'next/server'
import { getRaquetasPorNivel, getTopRaquetasPorNivel } from '@/lib/recommend'

// Rota só-leitura — devolve os IDs do Top Picks ativo de um nível, pra uso
// client-side (comparador embutido no chat, 'use client', não pode chamar
// lib/recommend.ts diretamente). Não participa do pipeline de geração de
// recomendação do agente (lib/agent/agent.ts) — só consulta o que já existe
// depois que o agente já decidiu o que recomendar. Mesmo dado/lógica do
// TopPicksSection e do CTA dourado da ficha de detalhe.
export async function GET(req: NextRequest) {
  const nivel = req.nextUrl.searchParams.get('nivel')
  if (nivel !== 'iniciante' && nivel !== 'intermediario' && nivel !== 'avancado') {
    return NextResponse.json({ error: 'nivel inválido' }, { status: 400 })
  }

  try {
    const pool = await getRaquetasPorNivel(nivel)
    const topPicks = await getTopRaquetasPorNivel(nivel, pool, 4)
    return NextResponse.json(
      { ids: topPicks.map(r => r.id) },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ ids: [] })
  }
}
