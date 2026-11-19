'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'

// Mede Core Web Vitals reais (LCP, INP, CLS...) por página. Mesmo filtro de modo teste do
// VercelAnalytics: com o cookie turaquete_test_mode=1 (admin/testes) nada é enviado.
//
// Plano Vercel: Speed Insights existe no Hobby e no Pro; o que muda é a cota de pontos de dados
// incluída e o que acontece ao estourá-la (a coleta pausa até o próximo ciclo; o site não quebra).
// Para desligar: remover <VercelSpeedInsights /> do app/layout.tsx (e, se quiser, o pacote
// @vercel/speed-insights). Ver "Dependências do plano Vercel" no CLAUDE.md.
function isTestMode(): boolean {
  return document.cookie.split(';').some(c => c.trim() === 'turaquete_test_mode=1')
}

export default function VercelSpeedInsights() {
  return <SpeedInsights beforeSend={(data) => (isTestMode() ? null : data)} />
}
