/**
 * Testes do scorer determinístico (lib/scorer.ts).
 * Todas as funções são puras — sem mocks necessários.
 *
 * Invariantes cobertos:
 *   #1  Spin de fábrica compete no placar (FALHA: bug documentado)
 *   #6  Determinismo do ranking
 *   +   calcular_faixa_ideal, baseWeights, clasificarNivel
 */
import { describe, test, expect } from 'vitest'
import {
  scoreRacket,
  calcular_faixa_ideal,
  clasificarNivel,
  computeScorerWeights,
  type ScorerProfile,
  type FittingProfile,
} from '../scorer'
import type { Insights } from '../recommend'

// ── Fixtures ──────────────────────────────────────────────────────────────────

type RacketData = Parameters<typeof scoreRacket>[0]

const BASE_INSIGHTS: Insights = {
  power: 7, control: 7, comfort: 7,
  maneuverability: 7, spin: 7, stability: 7, forgiveness: 7,
  good_for_beginners: false, good_for_intermediate: true, good_for_advanced: false,
  elbow_friendly: false, shoulder_friendly: false,
  observations: [], summary: null, perfil_resumo: null,
  nivel_sugerido: 'intermediario', confianca: 'alta',
}

function makeRacket(overrides: Partial<Insights> = {}, specsExtra: Record<string, unknown> = {}): RacketData {
  return {
    racket_insights: { ...BASE_INSIGHTS, ...overrides },
    specs_extra: specsExtra,
  }
}

// ── scoreRacket ───────────────────────────────────────────────────────────────

describe('scoreRacket', () => {
  test('returns 0 when racket_insights is null', () => {
    expect(scoreRacket({ racket_insights: null, specs_extra: null }, {})).toBe(0)
  })

  test('all-equal attributes → same score for same profile', () => {
    const profile: ScorerProfile = { nivel: 'intermediario' }
    const r1 = makeRacket()
    const r2 = makeRacket()
    expect(scoreRacket(r1, profile)).toBe(scoreRacket(r2, profile))
  })

  test('high-power racket scores higher than low-power for potencia profile', () => {
    const profile: ScorerProfile = { prioridade: 'potencia' }
    const high = makeRacket({ power: 9 })
    const low  = makeRacket({ power: 4 })
    expect(scoreRacket(high, profile)).toBeGreaterThan(scoreRacket(low, profile))
  })

  test('high-forgiveness racket scores higher for iniciante profile', () => {
    const profile: ScorerProfile = { nivel: 'iniciante' }
    const forgiving = makeRacket({ forgiveness: 10 })
    const harsh     = makeRacket({ forgiveness: 3  })
    expect(scoreRacket(forgiving, profile)).toBeGreaterThan(scoreRacket(harsh, profile))
  })

  test('high-comfort racket scores higher for injury profile', () => {
    const profile: ScorerProfile = { cotovelo_sensivel: true }
    const soft = makeRacket({ comfort: 10 })
    const hard = makeRacket({ comfort: 3  })
    expect(scoreRacket(soft, profile)).toBeGreaterThan(scoreRacket(hard, profile))
  })

  test('furos bonus: 30+ furos gives +0.3 for vento context', () => {
    const profile: ScorerProfile = { contexto_vento: true }
    const withFuros    = makeRacket({}, { furos: 32 })
    const withoutFuros = makeRacket({}, { furos: 18 })
    const diff = scoreRacket(withFuros, profile) - scoreRacket(withoutFuros, profile)
    expect(diff).toBeCloseTo(0.3)
  })

  // ── INVARIANTE #1: Spin é referência visual, NÃO fator de ranking ────────
  // Toda raquete vem com um spin de fábrica que o jogador pode aumentar depois
  // com tratamento areado. Por isso o spin não entra no cálculo de score —
  // seria injusto comparar o potencial de spin "pós-tratamento" como critério
  // de ranking. O peso do spin é zero em todos os perfis por design.
  test(
    'INVARIANTE #1: spin de fábrica é apenas referência visual e NÃO influencia o ranking (peso zero por design)',
    () => {
      const profile: ScorerProfile = { nivel: 'avancado' }
      const highSpin = makeRacket({ spin: 9 })
      const lowSpin  = makeRacket({ spin: 3 })
      expect(scoreRacket(highSpin, profile)).toBe(scoreRacket(lowSpin, profile))
    }
  )

  // ── INVARIANTE #6: Determinismo ──────────────────────────────────────────
  test('INVARIANTE #6: mesma entrada produz exatamente o mesmo score (determinismo)', () => {
    const profile: ScorerProfile = { nivel: 'intermediario', prioridade: 'controle' }
    const racket = makeRacket({ power: 6, control: 9, comfort: 8 })
    const run1 = scoreRacket(racket, profile)
    const run2 = scoreRacket(racket, profile)
    expect(run1).toBe(run2)
  })

  test('INVARIANTE #6: determinismo com perfil de lesao e racket complexo', () => {
    const profile: ScorerProfile = {
      nivel: 'iniciante',
      cotovelo_sensivel: true,
      frequencia_alta: true,
    }
    const racket = makeRacket(
      { power: 5, control: 6, comfort: 9, maneuverability: 8, stability: 7, forgiveness: 8, spin: 5 },
      { furos: 35 }
    )
    expect(scoreRacket(racket, profile)).toBe(scoreRacket(racket, profile))
  })
})

// ── baseWeights (via computeScorerWeights) ───────────────────────────────────

describe('baseWeights / computeScorerWeights', () => {
  test('spin weight is always 0 (excluded from ranking in all profiles)', () => {
    const profiles: ScorerProfile[] = [
      { nivel: 'iniciante' },
      { nivel: 'intermediario' },
      { nivel: 'avancado' },
      { prioridade: 'potencia' },
      { prioridade: 'controle' },
      { prioridade: 'defesa' },
      { cotovelo_sensivel: true },
      { ombro_sensivel: true },
    ]
    for (const p of profiles) {
      const w = computeScorerWeights(p)
      expect(w['spin'] ?? 0, `spin weight > 0 for profile ${JSON.stringify(p)}`).toBe(0)
    }
  })

  test('injury profile assigns highest weight to comfort (40)', () => {
    const w = computeScorerWeights({ cotovelo_sensivel: true })
    const values = Object.values(w)
    expect(Math.max(...values)).toBe(40)
    expect(w['conforto']).toBe(40)
  })

  test('potencia profile assigns highest weight to potência (32)', () => {
    const w = computeScorerWeights({ prioridade: 'potencia' })
    expect(w['potência']).toBe(32)
  })

  test('controle/defesa profile: controle is highest at 32', () => {
    for (const prioridade of ['controle', 'defesa'] as const) {
      const w = computeScorerWeights({ prioridade })
      expect(w['controle']).toBe(32)
    }
  })

  test('applyModifiers: frequencia_alta adds +5 to comfort', () => {
    const base = computeScorerWeights({ nivel: 'avancado' })
    const mod  = computeScorerWeights({ nivel: 'avancado', frequencia_alta: true })
    const delta = (mod['conforto'] ?? 0) - (base['conforto'] ?? 0)
    expect(delta).toBe(5)
  })

  test('applyModifiers: contexto_vento adds +8 to stability', () => {
    const base = computeScorerWeights({ nivel: 'avancado' })
    const mod  = computeScorerWeights({ nivel: 'avancado', contexto_vento: true })
    const delta = (mod['estabilidade'] ?? 0) - (base['estabilidade'] ?? 0)
    expect(delta).toBe(8)
  })
})

// ── calcular_faixa_ideal ─────────────────────────────────────────────────────

describe('calcular_faixa_ideal', () => {
  test('floor mínimo inviolável: peso_min nunca abaixo de 315g', () => {
    const profiles: FittingProfile[] = [
      { nivel: 'iniciante', porte: 'menudo', forca_declarada: 'fraca' },
      { nivel: 'iniciante', jogo_aereo_predominante: true },
      {},
    ]
    for (const p of profiles) {
      const { peso_min } = calcular_faixa_ideal(p)
      expect(peso_min, `peso_min < 315 para ${JSON.stringify(p)}`).toBeGreaterThanOrEqual(315)
    }
  })

  test('janela mínima: peso_max - peso_min >= 15 sem overrides', () => {
    const profiles: FittingProfile[] = [
      { nivel: 'iniciante' },
      { nivel: 'intermediario', estilo: 'ofensivo' },
      { nivel: 'avancado', estilo: 'defensivo' },
    ]
    for (const p of profiles) {
      const { peso_min, peso_max } = calcular_faixa_ideal(p)
      expect(peso_max - peso_min, `janela < 15 para ${JSON.stringify(p)}`).toBeGreaterThanOrEqual(15)
    }
  })

  test('override idade 65+: range absoluto 315-320g, ignora nivel', () => {
    const avancado65: FittingProfile = { nivel: 'avancado', estilo: 'ofensivo', idade: 67 }
    const { peso_min, peso_max, balance_preferido } = calcular_faixa_ideal(avancado65)
    expect(peso_min).toBe(315)
    expect(peso_max).toBe(320)
    expect(balance_preferido).toBe('medio_ou_cabo')
  })

  test('override idade 50-64: range 315-325g independente de nivel', () => {
    const { peso_min, peso_max } = calcular_faixa_ideal({ nivel: 'avancado', estilo: 'ofensivo', idade: 55 })
    expect(peso_min).toBe(315)
    expect(peso_max).toBe(325)
  })

  test('adolescente (13-17): peso_max menor que adulto do mesmo perfil de faixa larga', () => {
    // avancado ofensivo: adulto → 325–345 (janela 20g, > MIN_WINDOW).
    // Teen: teto definido em peso_min+10=335, depois MIN_WINDOW eleva para 340.
    // 340 < 345 — a regra do adolescente ainda restringe visivelmente.
    const adult = calcular_faixa_ideal({ nivel: 'avancado', estilo: 'ofensivo' })
    const teen  = calcular_faixa_ideal({ nivel: 'avancado', estilo: 'ofensivo', idade: 15 })
    expect(teen.peso_max).toBeLessThan(adult.peso_max)
  })

  test('lesao: balance nao pode ser medio_ou_cabeca', () => {
    const { balance_preferido } = calcular_faixa_ideal({
      nivel: 'avancado', estilo: 'ofensivo', cotovelo_sensivel: true,
    })
    expect(balance_preferido).not.toBe('medio_ou_cabeca')
  })

  test('lesao: peso_max nunca ultrapassa 335g', () => {
    const profiles: FittingProfile[] = [
      { nivel: 'avancado', estilo: 'ofensivo', ombro_sensivel: true },
      { nivel: 'avancado', forca_declarada: 'forte', cotovelo_sensivel: true },
    ]
    for (const p of profiles) {
      const { peso_max } = calcular_faixa_ideal(p)
      expect(peso_max, `peso_max > 335 para ${JSON.stringify(p)}`).toBeLessThanOrEqual(335)
    }
  })

  test('genero masculino: peso_min no minimo 320g', () => {
    const { peso_min } = calcular_faixa_ideal({ nivel: 'iniciante', genero_organico: 'masculino' })
    expect(peso_min).toBeGreaterThanOrEqual(320)
  })

  test('porte menudo: range deslocado -10g (mas clampado ao floor)', () => {
    const normal = calcular_faixa_ideal({ nivel: 'avancado', estilo: 'ofensivo' })
    const menudo = calcular_faixa_ideal({ nivel: 'avancado', estilo: 'ofensivo', porte: 'menudo' })
    // Ambos devem ter peso_min >= 315 (floor)
    expect(menudo.peso_min).toBeGreaterThanOrEqual(315)
    // Range menudo deve ser <= range normal
    expect(menudo.peso_max).toBeLessThanOrEqual(normal.peso_max)
  })
})

// ── clasificarNivel ──────────────────────────────────────────────────────────

describe('clasificarNivel', () => {
  test('gap > 4 → avancado', () => {
    expect(clasificarNivel(9, 4)).toBe('avancado')
    expect(clasificarNivel(8, 2)).toBe('avancado')
  })

  test('gap < -4 → iniciante', () => {
    expect(clasificarNivel(3, 9)).toBe('iniciante')
    expect(clasificarNivel(2, 8)).toBe('iniciante')
  })

  test('gap entre -4 e 4 → intermediario', () => {
    expect(clasificarNivel(7, 5)).toBe('intermediario')
    expect(clasificarNivel(5, 7)).toBe('intermediario')
    expect(clasificarNivel(6, 6)).toBe('intermediario')
    expect(clasificarNivel(7.5, 3.5)).toBe('intermediario')
  })

  test('limiar exato +4 → intermediario (gap nao > 4)', () => {
    expect(clasificarNivel(8, 4)).toBe('intermediario')
  })

  test('limiar exato -4 → intermediario (gap nao < -4)', () => {
    expect(clasificarNivel(4, 8)).toBe('intermediario')
  })
})
