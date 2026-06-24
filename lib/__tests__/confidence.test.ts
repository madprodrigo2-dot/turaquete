/**
 * Testes do gating de confiança (lib/agent/confidence.ts).
 *
 * Invariante coberto:
 *   #2  Recomendação só dispara com estilo + nível + lesão confirmados.
 *       Faltando qualquer um dos três → não dispara.
 *       Com os três → dispara.
 */
import { describe, test, expect } from 'vitest'
import { computeProfileConfidence, CONFIDENCE_CONFIG } from '../agent/confidence'

// ── Helpers de fixture ────────────────────────────────────────────────────────

function profileWith(fields: {
  estilo?: string
  nivel?: string
  cotovelo?: boolean
  ombro?: boolean
  sem_lesao?: boolean
  forca?: string
  jogo_aereo?: boolean
}): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  if (fields.estilo !== undefined)   p.estilo   = fields.estilo
  if (fields.nivel !== undefined)    p.nivel    = fields.nivel
  if (fields.cotovelo !== undefined) p.cotovelo_sensivel = fields.cotovelo
  if (fields.ombro !== undefined)    p.ombro_sensivel    = fields.ombro
  if (fields.sem_lesao !== undefined) p.sem_lesao = fields.sem_lesao
  if (fields.forca !== undefined)    p.forca_declarada   = fields.forca
  if (fields.jogo_aereo !== undefined) p.jogo_aereo_predominante = fields.jogo_aereo
  return p
}

// ── INVARIANTE #2: Gating de confiança ───────────────────────────────────────

describe('INVARIANTE #2: gating de confiança — estilo + nível + lesão obrigatórios', () => {
  const THRESHOLD = CONFIDENCE_CONFIG.threshold  // 80

  // ── Nenhum campo: nunca recomenda ────────────────────────────────────────
  test('perfil vazio → não recomenda', () => {
    const result = computeProfileConfidence({}, 0)
    expect(result.willRecommend).toBe(false)
    expect(result.score).toBeLessThan(THRESHOLD)
  })

  // ── Faltando estilo ──────────────────────────────────────────────────────
  test('INVARIANTE #2a: nivel + lesao sem estilo → não recomenda (score 68 < 80)', () => {
    const profile = profileWith({
      nivel: 'intermediario',
      sem_lesao: true,
      forca: 'forte',
      jogo_aereo: false,
    })
    const result = computeProfileConfidence(profile, 0)
    // estilo pesa 32. Sem estilo: nivel(28)+lesao(22)+forca(11)+jogo_aereo(7) = 68
    expect(result.willRecommend).toBe(false)
    expect(result.score).toBeLessThan(THRESHOLD)
  })

  // ── Faltando nível ────────────────────────────────────────────────────────
  test('INVARIANTE #2b: estilo + lesao sem nivel → não recomenda (score 72 < 80)', () => {
    const profile = profileWith({
      estilo: 'ofensivo',
      sem_lesao: true,
      forca: 'forte',
      jogo_aereo: false,
    })
    const result = computeProfileConfidence(profile, 0)
    // Sem nivel: estilo(32)+lesao(22)+forca(11)+jogo_aereo(7) = 72
    expect(result.willRecommend).toBe(false)
    expect(result.score).toBeLessThan(THRESHOLD)
  })

  // ── Faltando lesão ────────────────────────────────────────────────────────
  test('INVARIANTE #2c: estilo + nivel sem lesao → não recomenda (score 78 < 80)', () => {
    const profile = profileWith({
      estilo: 'ofensivo',
      nivel: 'intermediario',
      forca: 'forte',
      jogo_aereo: false,
    })
    const result = computeProfileConfidence(profile, 0)
    // Sem lesao: estilo(32)+nivel(28)+forca(11)+jogo_aereo(7) = 78
    expect(result.willRecommend).toBe(false)
    expect(result.score).toBeLessThan(THRESHOLD)
  })

  // ── Todos os três presentes → dispara ────────────────────────────────────
  test('INVARIANTE #2d: estilo + nivel + lesao → recomenda (score 82 >= 80)', () => {
    const profile = profileWith({
      estilo: 'ofensivo',
      nivel: 'intermediario',
      sem_lesao: true,
    })
    const result = computeProfileConfidence(profile, 0)
    // estilo(32) + nivel(28) + lesao(22) = 82
    expect(result.willRecommend).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(THRESHOLD)
  })

  test('INVARIANTE #2d (variante dor): estilo + nivel + cotovelo → recomenda', () => {
    const profile = profileWith({
      estilo: 'defensivo',
      nivel: 'iniciante',
      cotovelo: true,
    })
    const result = computeProfileConfidence(profile, 0)
    expect(result.willRecommend).toBe(true)
  })

  // ── recommendAnyway só com hard gates (nivel + lesao) ──────────────────
  test('INVARIANTE #2e: após 4 turnos sem nivel → NÃO recomenda mesmo com rodadas esgotadas', () => {
    const profile = profileWith({
      estilo: 'ofensivo',
      sem_lesao: true,
      forca: 'forte',
      jogo_aereo: true,
    })
    const afterMaxTurns = computeProfileConfidence(profile, CONFIDENCE_CONFIG.maxQuestions)
    // hardGatesPass = hasNivel(false) && hasLesao(true) = false → recommendAnyway = false
    expect(afterMaxTurns.recommendAnyway).toBe(false)
    expect(afterMaxTurns.willRecommend).toBe(false)
  })

  test('INVARIANTE #2e: após 4 turnos sem lesao → NÃO recomenda mesmo com rodadas esgotadas', () => {
    const profile = profileWith({
      estilo: 'ofensivo',
      nivel: 'avancado',
      forca: 'forte',
      jogo_aereo: true,
    })
    const afterMaxTurns = computeProfileConfidence(profile, CONFIDENCE_CONFIG.maxQuestions)
    // hardGatesPass = hasNivel(true) && hasLesao(false) = false → recommendAnyway = false
    expect(afterMaxTurns.recommendAnyway).toBe(false)
    expect(afterMaxTurns.willRecommend).toBe(false)
  })

  test('INVARIANTE #2e: após 4 turnos COM nivel + lesao → recomenda de qualquer forma', () => {
    // Só tem nivel e lesao (score = 50 < 80), mas hard gates passam e rodadas esgotadas
    const profile = profileWith({
      nivel: 'avancado',
      sem_lesao: true,
    })
    const afterMaxTurns = computeProfileConfidence(profile, CONFIDENCE_CONFIG.maxQuestions)
    expect(afterMaxTurns.recommendAnyway).toBe(true)
    expect(afterMaxTurns.willRecommend).toBe(true)
  })
})

// ── Comportamento de nextQuestion ────────────────────────────────────────────

describe('nextQuestion: ordem de perguntas', () => {
  test('campo com maior peso é perguntado primeiro (estilo > nivel > lesao)', () => {
    const result = computeProfileConfidence({}, 0)
    // Todos os campos ausentes → maior peso é estilo (32)
    expect(result.nextQuestion?.field).toBe('estilo')
  })

  test('quando dor_mencionada=true e lesao ausente → pergunta lesao primeiro', () => {
    const profile: Record<string, unknown> = {
      dor_mencionada: true,
      nivel: 'intermediario',
      estilo: 'ofensivo',
    }
    const result = computeProfileConfidence(profile, 0)
    expect(result.dorMencionada).toBe(true)
    expect(result.nextQuestion?.field).toBe('lesao')
  })

  test('quando intencao=lesao_dor → lesao é prioritária', () => {
    const profile = profileWith({ estilo: 'ofensivo', nivel: 'intermediario' })
    const result = computeProfileConfidence(profile, 0, 'lesao_dor')
    expect(result.nextQuestion?.field).toBe('lesao')
  })

  test('quando tudo respondido → nextQuestion é null', () => {
    const profile = profileWith({
      estilo: 'ofensivo',
      nivel: 'intermediario',
      sem_lesao: true,
      forca: 'forte',
      jogo_aereo: false,
    })
    const result = computeProfileConfidence(profile, 0)
    expect(result.willRecommend).toBe(true)
    expect(result.nextQuestion).toBeNull()
  })
})

// ── Scores parciais ──────────────────────────────────────────────────────────

describe('scores de confiança parciais', () => {
  test('perfil completo tem score 100', () => {
    const profile = profileWith({
      estilo: 'misto',
      nivel: 'intermediario',
      sem_lesao: true,
      forca: 'forte',
      jogo_aereo: true,
    })
    expect(computeProfileConfidence(profile, 0).score).toBe(100)
  })

  test('score cresce conforme campos são adicionados', () => {
    const step1 = computeProfileConfidence(profileWith({ estilo: 'misto' }), 0).score
    const step2 = computeProfileConfidence(profileWith({ estilo: 'misto', nivel: 'iniciante' }), 0).score
    const step3 = computeProfileConfidence(profileWith({ estilo: 'misto', nivel: 'iniciante', sem_lesao: true }), 0).score
    expect(step2).toBeGreaterThan(step1)
    expect(step3).toBeGreaterThan(step2)
  })
})
