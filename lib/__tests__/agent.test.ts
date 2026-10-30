/**
 * Testes do fluxo reordenado por nível (2026-10-30).
 *
 * Cobre a garantia central do pedido: o perfil que chega no motor de scoring
 * tem que ser idêntico, campo a campo, entre o caminho novo (nível primeiro,
 * iniciante pula estilo e preferência) e o caminho manual equivalente de
 * antes (estilo → nível → ...). Testa só extractConfirmedProfileFromHistory
 * — a única função que monta esse perfil a partir do histórico de chips —
 * sem mockar a API da Anthropic, que fica fora do escopo de um teste de
 * unidade puro.
 */
import { describe, test, expect } from 'vitest'
import { extractConfirmedProfileFromHistory, type ChatMessage } from '../agent/agent'

function userTurns(...texts: string[]): ChatMessage[] {
  return texts.map(content => ({ role: 'user' as const, content }))
}

describe('extractConfirmedProfileFromHistory: fluxo reordenado por nível', () => {
  // ── Caminho iniciante: nível primeiro, sem perguntar estilo/preferência ────

  test('iniciante sozinho → injeta estilo="misto" (mesmo valor de "Equilibrado")', () => {
    const novo = extractConfirmedProfileFromHistory(
      userTurns('Estou começando (cat. E/D)')
    )
    expect(novo).toEqual({ nivel: 'iniciante', estilo: 'misto' })
  })

  test('iniciante + dor no cotovelo → perfil idêntico ao caminho manual (Equilibrado + Estou começando + Sim, cotovelo)', () => {
    const novo = extractConfirmedProfileFromHistory(
      userTurns('Estou começando (cat. E/D)', 'Sim, cotovelo')
    )
    const manual = extractConfirmedProfileFromHistory(
      userTurns('Equilibrado', 'Estou começando (cat. E/D)', 'Sim, cotovelo')
    )
    expect(novo).toEqual(manual)
    expect(novo).toEqual({ nivel: 'iniciante', estilo: 'misto', cotovelo_sensivel: true })
  })

  test('iniciante não sobrescreve estilo se por algum motivo já veio respondido antes', () => {
    // Histórico legado/atípico: estilo respondido manualmente antes do nível.
    // A injeção automática não deve pisar numa resposta real do usuário.
    const perfil = extractConfirmedProfileFromHistory(
      userTurns('Ataque (potência, smash)', 'Estou começando (cat. E/D)')
    )
    expect(perfil).toEqual({ estilo: 'ofensivo', nivel: 'iniciante' })
  })

  // ── Caminho intermediário/avançado: sem mudança de comportamento ──────────

  test('intermediário + estilo explícito → sem injeção automática', () => {
    const perfil = extractConfirmedProfileFromHistory(
      userTurns('Intermediário (cat. C/B)', 'Ataque (potência, smash)')
    )
    expect(perfil).toEqual({ nivel: 'intermediario', estilo: 'ofensivo' })
  })

  test('avançado + estilo explícito → sem injeção automática', () => {
    const perfil = extractConfirmedProfileFromHistory(
      userTurns('Avançado (cat. A/Pro)', 'Defesa e controle')
    )
    expect(perfil).toEqual({ nivel: 'avancado', estilo: 'defensivo' })
  })

  // ── Chip "Ainda não sei" (novo, só aparece pra intermediário/avançado) ────

  test('"Ainda não sei" mapeia pro mesmo valor que "Equilibrado" (estilo="misto")', () => {
    const comAindaNaoSei = extractConfirmedProfileFromHistory(
      userTurns('Avançado (cat. A/Pro)', 'Ainda não sei')
    )
    const comEquilibrado = extractConfirmedProfileFromHistory(
      userTurns('Avançado (cat. A/Pro)', 'Equilibrado')
    )
    expect(comAindaNaoSei).toEqual(comEquilibrado)
    expect(comAindaNaoSei).toEqual({ nivel: 'avancado', estilo: 'misto' })
  })

  test('"Ainda não sei" funciona igual pra intermediário', () => {
    const perfil = extractConfirmedProfileFromHistory(
      userTurns('Intermediário (cat. C/B)', 'Ainda não sei')
    )
    expect(perfil).toEqual({ nivel: 'intermediario', estilo: 'misto' })
  })
})
