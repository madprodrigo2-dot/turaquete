/**
 * Testes das regras de filtragem/ranking em lib/recommend.ts.
 * Supabase é mockado — as queries retornam fixtures controlados.
 * A lógica TypeScript (nivel ceiling, marca boost, lesão, scorer) corre normalmente.
 *
 * Invariantes cobertos:
 *   #3  Preço como desempate, nunca como filtro (orçamento aberto)
 *   #4  Preferência de marca é honesta, não exclusiva
 *   #5  Teto de nível
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { RacketWithInsights, Insights } from '../recommend'

// ── Mock do Supabase (deve vir antes do import de recommend) ──────────────────
// O mock retorna os dados de `mockFixtures` como se viessem do banco.
// Apenas o nível TypeScript de filtragem/ranking é testado aqui.

let mockFixtures: unknown[] = []

vi.mock('@/lib/supabase', () => {
  return {
    getSupabase: () => {
      const chain: Record<string, unknown> = {}
      const noop = () => chain
      Object.assign(chain, {
        from: noop, select: noop, eq: noop, order: noop,
        gte: noop, lte: noop, ilike: noop, filter: noop,
        limit: () => Promise.resolve({ data: mockFixtures, error: null }),
      })
      return chain
    },
  }
})

import { buscarRaquetas } from '../recommend'

// ── Helpers de fixture ────────────────────────────────────────────────────────

const BASE_INSIGHTS: Insights = {
  power: 6, control: 6, comfort: 6, maneuverability: 6,
  stability: 6, spin: 6, forgiveness: 7,
  good_for_beginners: false, good_for_intermediate: true, good_for_advanced: false,
  elbow_friendly: false, shoulder_friendly: false,
  observations: [], summary: null, perfil_resumo: null,
  nivel_sugerido: 'intermediario', confianca: 'alta',
}

let _id = 0
function makeRacket(
  name: string,
  overrides: Partial<RacketWithInsights> = {},
  insightsOverrides: Partial<Insights> = {},
): RacketWithInsights {
  _id++
  return {
    id: _id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    model_year: 2025,
    weight_g: 330,
    balance: 'medio',
    format: 'redonda',
    face_material: 'fibra',
    core: 'eva',
    price: 1500,
    price_updated_at: null,
    currency: 'BRL',
    affiliate_url: null,
    source_url: null,
    image_url: null,
    technologies: [],
    specs_extra: null,
    publicada: true,
    brands: { name: 'GenericBrand', slug: 'genericbrand' },
    racket_insights: { ...BASE_INSIGHTS, ...insightsOverrides },
    ...overrides,
  }
}

beforeEach(() => {
  _id = 0
  mockFixtures = []
})

// ── INVARIANTE #3: Preço como desempate, nunca como filtro ──────────────────

describe('INVARIANTE #3: orçamento aberto → nenhuma raquete é removida por preço', () => {
  test('presupuesto_min=0 (aberto): raquetes de qualquer preço aparecem', async () => {
    const cheap     = makeRacket('Barata',      { price: 400  })
    const medium    = makeRacket('Media',        { price: 1500 })
    const expensive = makeRacket('Cara',         { price: 4000 })
    mockFixtures = [cheap, medium, expensive]

    const { raquetes } = await buscarRaquetas({ presupuesto_min: 0 })
    const slugs = raquetes.map(r => r.slug)

    expect(slugs).toContain('barata')
    expect(slugs).toContain('media')
    expect(slugs).toContain('cara')
    expect(raquetes).toHaveLength(3)
  })

  test('sem filtro de preço: catálogo inteiro chega ao scorer', async () => {
    const rackets = Array.from({ length: 5 }, (_, i) =>
      makeRacket(`Raquete ${i}`, { price: (i + 1) * 1000 })
    )
    mockFixtures = rackets

    const { raquetes } = await buscarRaquetas({})
    expect(raquetes).toHaveLength(5)
  })
})

// ── INVARIANTE #4: Preferência de marca é honesta, não exclusiva ────────────

describe('INVARIANTE #4: marca preferida boost (+1.5) não esconde alternativas melhores', () => {
  test('raquete de outra marca mas com score muito maior ainda aparece nos resultados', async () => {
    const preferredBrand = makeRacket('Preferida A', {
      brands: { name: 'Adidas', slug: 'adidas' },
    }, {
      power: 5, control: 5, comfort: 5, maneuverability: 5, stability: 5, forgiveness: 5,
    })
    const betterOtherBrand = makeRacket('Melhor Head', {
      brands: { name: 'Head', slug: 'head' },
    }, {
      power: 9, control: 9, comfort: 9, maneuverability: 9, stability: 9, forgiveness: 9,
    })
    mockFixtures = [preferredBrand, betterOtherBrand]

    const { raquetes } = await buscarRaquetas({
      nivel: 'avancado',
      marca_preferida: 'Adidas',
    })

    // Ambas devem aparecer — a melhor não é filtrada
    const slugs = raquetes.map(r => r.slug)
    expect(slugs).toContain('preferida-a')
    expect(slugs).toContain('melhor-head')
    expect(raquetes).toHaveLength(2)
  })

  test('marca preferida com score suficiente (base + 1.5) supera concorrente', async () => {
    // Adidas: base ~6.0. Com boost 1.5 → ~7.5
    // Head:   base ~7.0. Sem boost → 7.0
    // Adidas preferred deve ficar em #1
    const adidas = makeRacket('Adidas X', {
      brands: { name: 'Adidas', slug: 'adidas' },
    }, {
      power: 6, control: 6, comfort: 6, maneuverability: 6, stability: 6, forgiveness: 6,
    })
    const head = makeRacket('Head Y', {
      brands: { name: 'Head', slug: 'head' },
    }, {
      power: 7, control: 7, comfort: 7, maneuverability: 7, stability: 7, forgiveness: 7,
    })
    mockFixtures = [adidas, head]

    const { raquetes } = await buscarRaquetas({
      nivel: 'avancado',
      marca_preferida: 'Adidas',
    })

    expect(raquetes[0].slug).toBe('adidas-x')
  })

  test('sem marca preferida: ranking é só por score (sem boost)', async () => {
    const r1 = makeRacket('Alta Performance', {
      brands: { name: 'BrandA', slug: 'brand-a' },
    }, { power: 9, control: 9, comfort: 9, maneuverability: 9, stability: 9, forgiveness: 9 })

    const r2 = makeRacket('Performance Baixa', {
      brands: { name: 'BrandB', slug: 'brand-b' },
    }, { power: 3, control: 3, comfort: 3, maneuverability: 3, stability: 3, forgiveness: 3 })

    mockFixtures = [r2, r1]  // intencionalmente na ordem errada

    const { raquetes } = await buscarRaquetas({ nivel: 'avancado' })
    expect(raquetes[0].slug).toBe('alta-performance')
  })
})

// ── INVARIANTE #5: Teto de nível ─────────────────────────────────────────────

describe('INVARIANTE #5: teto de nível protege iniciantes e intermediários', () => {
  // isNivelAvancado: f <= 4 || (f <= 6 && (p >= 8 || c >= 9)) || (f <= 7 && p >= 9)

  const avancadaRacket = makeRacket.bind(null, 'Avancada Pro')
  const iniciante = () => makeRacket('Amiga Iniciante', {}, {
    forgiveness: 8, power: 5, control: 5, nivel_sugerido: 'iniciante',
  })
  const avancada = () => makeRacket('Expert Elite', {}, {
    forgiveness: 4, power: 9, control: 8, nivel_sugerido: 'avancado',
  })
  const intermediaria = () => makeRacket('Intermediaria', {}, {
    forgiveness: 7, power: 7, control: 7, nivel_sugerido: 'intermediario',
  })

  test('INVARIANTE #5a: nivel=iniciante exclui raquete avancada (f=4, p=9)', async () => {
    mockFixtures = [iniciante(), avancada(), intermediaria()]

    const { raquetes } = await buscarRaquetas({ nivel: 'iniciante' })
    const slugs = raquetes.map(r => r.slug)

    expect(slugs).not.toContain('expert-elite')
    expect(slugs).toContain('amiga-iniciante')
    expect(slugs).toContain('intermediaria')
  })

  test('INVARIANTE #5a: nivel=iniciante também exclui raquete com forgiveness <= 5', async () => {
    const harshIntermediate = makeRacket('Intermediaria Dura', {}, {
      forgiveness: 5, power: 7, control: 7, nivel_sugerido: 'intermediario',
    })
    mockFixtures = [iniciante(), harshIntermediate]

    const { raquetes } = await buscarRaquetas({ nivel: 'iniciante' })
    const slugs = raquetes.map(r => r.slug)

    expect(slugs).not.toContain('intermediaria-dura')
    expect(slugs).toContain('amiga-iniciante')
  })

  test('INVARIANTE #5b: nivel=intermediario exclui avancada mas mantém iniciante', async () => {
    mockFixtures = [iniciante(), avancada(), intermediaria()]

    const { raquetes } = await buscarRaquetas({ nivel: 'intermediario' })
    const slugs = raquetes.map(r => r.slug)

    expect(slugs).not.toContain('expert-elite')
    expect(slugs).toContain('amiga-iniciante')
    expect(slugs).toContain('intermediaria')
  })

  test('INVARIANTE #5c: nivel=avancado vê catálogo completo (sem teto)', async () => {
    mockFixtures = [iniciante(), avancada(), intermediaria()]

    const { raquetes } = await buscarRaquetas({ nivel: 'avancado' })
    expect(raquetes).toHaveLength(3)
  })

  test('INVARIANTE #5d: teto NÃO se aplica a buscas por nome (usuário pediu modelo específico)', async () => {
    // Mesmo iniciante pedindo raquete avancada por nome → não é filtrada
    mockFixtures = [avancada()]

    const { raquetes } = await buscarRaquetas({
      nivel: 'iniciante',
      nome: 'Expert Elite',
    })
    expect(raquetes).toHaveLength(1)
    expect(raquetes[0].slug).toBe('expert-elite')
  })
})

// ── Filtro de lesão ───────────────────────────────────────────────────────────

describe('filtro de lesão: pool mínimo e relaxamento', () => {
  test('cotovelo: relaxa para comfort >= 7 se pool estrito < 3', async () => {
    // Pool estrito: só raquetes com elbow_friendly=true OU (comfort>=8 + saida=facil).
    // elbow_friendly=false é exclusão dura em AMBOS os tiers.
    // Para testar o relaxamento, "Relaxada 7" tem elbow_friendly=null (sem flag explícita
    // — como vem do DB quando ainda não avaliada): cai no caminho comfort>=7.
    const safe = makeRacket('Amiga Cotovelo', {}, {
      comfort: 9, elbow_friendly: true,
    })
    const relaxed = makeRacket('Relaxada 7', {}, {
      comfort: 7,
      // null como boolean: o DB pode retornar null quando flag não foi avaliada.
      // O código testa === false e === true, então null cai no caminho do comfort.
      elbow_friendly: null as unknown as boolean,
    })
    const bad = makeRacket('Ruim Cotovelo', {}, {
      comfort: 4, elbow_friendly: false,
    })
    mockFixtures = [safe, relaxed, bad]

    const { raquetes, criteriosRelaxados } = await buscarRaquetas({ cotovelo_sensivel: true })
    const slugs = raquetes.map(r => r.slug)

    expect(slugs).toContain('amiga-cotovelo')
    expect(slugs).toContain('relaxada-7')
    expect(slugs).not.toContain('ruim-cotovelo')
    expect(criteriosRelaxados.length).toBeGreaterThan(0)
  })
})
