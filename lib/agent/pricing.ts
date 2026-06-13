// Preços por milhão de tokens — atualizar quando a Anthropic mudar as tarifas.
// Fonte: https://www.anthropic.com/pricing (consultado 2026-06-13)
// Modelo: claude-haiku-4-5-20251001
export const PRICING = {
  model:      'claude-haiku-4-5-20251001',
  input:       1.00,   // USD / MTok
  output:      5.00,   // USD / MTok
  cacheWrite:  1.25,   // USD / MTok  (cache creation)
  cacheRead:   0.10,   // USD / MTok  (cache hit)
} as const

// Taxa de câmbio USD → BRL: atualizar conforme necessário
export const USD_TO_BRL = 5.70

export type TokenUsage = {
  input:      number
  output:     number
  cacheRead:  number
  cacheWrite: number
}

export function calcCost(usage: TokenUsage): { usd: number; brl: number } {
  const usd =
    (usage.input      * PRICING.input      / 1_000_000) +
    (usage.output     * PRICING.output     / 1_000_000) +
    (usage.cacheWrite * PRICING.cacheWrite / 1_000_000) +
    (usage.cacheRead  * PRICING.cacheRead  / 1_000_000)
  return { usd, brl: usd * USD_TO_BRL }
}
