import { getSupabase } from './supabase'
import { scoreRacket } from './scorer'
import type { FilterStep } from './debug-types'

export interface RacketFilters {
  nome?: string
  atleta?: string
  nivel?: 'iniciante' | 'intermediario' | 'avancado'
  presupuesto_min?: number  // 0 = "tanto faz" (acknowledges price without filtering); >0 = real floor
  presupuesto_max?: number
  prioridade?: 'potencia' | 'controle' | 'equilibrio' | 'defesa'
  cotovelo_sensivel?: boolean
  ombro_sensivel?: boolean
  punho_sensivel?: boolean
  frequencia_alta?: boolean
  contexto_vento?: boolean
  marca_preferida?: string | null  // undefined = not asked yet; null = "tanto faz"; string = brand name
}

// ── FIELD SEMANTICS — do not mix these up ─────────────────────────────────────
// publicada : true → visible in Turaquete (agent, scorer, landing, pages,
//             sitemap). THE ONLY field that gates visibility.
// is_active : true → model still current in market (not discontinued/superseded
//             by brand). A publicada=true racket can have is_active=false (older
//             gen selling in clearance). Does NOT control visibility. Metadata only.
// stock     : not modelled. "Ver na loja" always navigates. Nothing disables
//             links or hides rackets based on store stock.
// ──────────────────────────────────────────────────────────────────────────────

export interface Insights {
  power: number | null
  control: number | null
  comfort: number | null
  maneuverability: number | null
  stability: number | null
  spin: number | null
  forgiveness: number | null
  good_for_beginners: boolean
  good_for_intermediate: boolean
  good_for_advanced: boolean
  elbow_friendly: boolean
  shoulder_friendly: boolean
  observations: string[]
  summary: string | null
  perfil_resumo: string | null
  nivel_sugerido: 'iniciante' | 'intermediario' | 'avancado' | null
  confianca: 'alta' | 'media' | 'baixa' | null
}

export interface RacketWithInsights {
  id: number
  name: string
  slug: string
  model_year: number | null
  weight_g: number | null
  balance: string | null
  format: string | null
  face_material: string | null
  core: string | null
  price: number | null
  currency: string
  affiliate_url: string | null
  source_url: string | null
  image_url: string | null
  technologies: string[] | null
  specs_extra: Record<string, unknown> | null
  publicada: boolean
  racket_insights: Insights | null
  brands?: { name: string } | null
}

export interface RecommendedRacket {
  racket: RacketWithInsights
  razao: string
  match_score?: number  // score do scorer para esta consulta; undefined em comparações diretas
}

// Supabase returns one-to-many joins as arrays — normalise to single object
function normalizeRacket(raw: unknown): RacketWithInsights {
  const r = raw as RacketWithInsights & { racket_insights: unknown }
  return {
    ...r,
    racket_insights: Array.isArray(r.racket_insights)
      ? ((r.racket_insights[0] as Insights) ?? null)
      : (r.racket_insights as Insights | null),
  }
}

const SELECT_FIELDS = `
  id, name, slug, model_year, weight_g, balance, format,
  face_material, core, price, currency, affiliate_url, source_url, image_url, technologies,
  specs_extra, publicada,
  brands ( name ),
  racket_insights (
    power, control, comfort, maneuverability, stability, spin, forgiveness,
    good_for_beginners, good_for_intermediate, good_for_advanced,
    elbow_friendly, shoulder_friendly, observations, summary,
    perfil_resumo, nivel_sugerido, confianca
  )
`.trim()

export interface BuscarResult {
  raquetes: (RacketWithInsights & { match_score: number })[]
  criteriosRelaxados: string[]
  filterTrace: FilterStep[]
}

export async function buscarRaquetas(filtros: RacketFilters): Promise<BuscarResult> {
  // Hard constraints in SQL — never relaxed
  let query = getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .order('name')

  if (filtros.nome) {
    query = query.ilike('name', `%${filtros.nome}%`)
  }

  if (filtros.atleta) {
    query = query.filter('specs_extra->>atleta', 'ilike', `%${filtros.atleta}%`)
  }

  if (filtros.presupuesto_min && filtros.presupuesto_min > 0) {
    query = query.gte('price', filtros.presupuesto_min)
  }

  if (filtros.presupuesto_max) {
    query = query.lte('price', filtros.presupuesto_max)
  }

  const { data, error } = await query.limit(30)
  if (error) throw new Error(`Supabase: ${error.message}`)

  const allCandidates = ((data as unknown[]) ?? []).map(normalizeRacket)
  const criteriosRelaxados: string[] = []
  const filterTrace: FilterStep[] = []
  let results = [...allCandidates]

  // Record SQL step
  const sqlParts = ['publicada=true']
  if (filtros.nome) sqlParts.push(`nome="${filtros.nome}"`)
  if (filtros.atleta) sqlParts.push(`atleta ilike "%${filtros.atleta}%"`)
  if (filtros.presupuesto_min && filtros.presupuesto_min > 0) sqlParts.push(`preço≥${filtros.presupuesto_min}`)
  if (filtros.presupuesto_max) sqlParts.push(`preço≤${filtros.presupuesto_max}`)
  filterTrace.push({ filtro: `SQL [${sqlParts.join(', ')}]`, depois: allCandidates.length, relaxado: false })

  // Nivel: NOT a filter — the scorer already adjusts ranking via baseWeights().
  // Filtering by nivel_sugerido==='avancado' would exclude comfort-first rackets
  // (CÉU, Kronos, Athena tagged 'iniciante') that are exactly right for injured advanced players.
  if (filtros.nivel) {
    filterTrace.push({
      filtro: `nível "${filtros.nivel}" → pesos do scorer (não filtra)`,
      depois: results.length,
      relaxado: false,
      note: 'candidatas abertas para todos os níveis; scorer pondera conforme perfil',
    })
  }

  // Injury filter: cotovelo — highest-priority rule, relax only if truly 0 results.
  // Criterion: elbow_friendly=true (explicit tag), OR elbow_friendly not set AND comfort≥8
  // AND saida_de_bola not 'exigente'. elbow_friendly=false is a hard exclusion.
  if (filtros.cotovelo_sensivel && results.length > 0) {
    const before = results.length
    const filtered = results.filter(r => {
      const ins = r.racket_insights
      if (!ins) return false
      if (ins.elbow_friendly === true) return true
      if (ins.elbow_friendly === false) return false
      const saida = r.specs_extra?.saida_de_bola as string | undefined
      return (ins.comfort ?? 0) >= 8 && saida !== 'exigente'
    })
    if (filtered.length >= 1) {
      results = filtered
      filterTrace.push({ filtro: 'cotovelo sensível (elbow_friendly ou conforto≥8)', antes: before, depois: results.length, relaxado: false })
    } else {
      criteriosRelaxados.push('cotovelo sensível: nenhuma raquete com flag ou conforto≥8 — avalie manualmente')
      filterTrace.push({ filtro: 'cotovelo sensível (elbow_friendly ou conforto≥8)', antes: before, depois: results.length, relaxado: true, note: 'nenhuma raquete passou o critério' })
    }
  }

  // Injury filter: ombro — same logic as cotovelo
  if (filtros.ombro_sensivel && results.length > 0) {
    const before = results.length
    const filtered = results.filter(r => {
      const ins = r.racket_insights
      if (!ins) return false
      if (ins.shoulder_friendly === true) return true
      if (ins.shoulder_friendly === false) return false
      const saida = r.specs_extra?.saida_de_bola as string | undefined
      return (ins.comfort ?? 0) >= 8 && saida !== 'exigente'
    })
    if (filtered.length >= 1) {
      results = filtered
      filterTrace.push({ filtro: 'ombro sensível (shoulder_friendly ou conforto≥8)', antes: before, depois: results.length, relaxado: false })
    } else {
      criteriosRelaxados.push('ombro sensível: nenhuma raquete com flag ou conforto≥8 — avalie manualmente')
      filterTrace.push({ filtro: 'ombro sensível (shoulder_friendly ou conforto≥8)', antes: before, depois: results.length, relaxado: true, note: 'nenhuma raquete passou o critério' })
    }
  }

  // Injury filter: punho / outro — same DUPLO logic as cotovelo/ombro
  if (filtros.punho_sensivel && results.length > 0) {
    const before = results.length
    const filtered = results.filter(r => {
      const ins = r.racket_insights
      if (!ins) return false
      const saida = r.specs_extra?.saida_de_bola as string | undefined
      return (ins.comfort ?? 0) >= 8 && saida !== 'exigente'
    })
    if (filtered.length >= 1) {
      results = filtered
      filterTrace.push({ filtro: 'punho/outro sensível (conforto≥8 + saída não exigente)', antes: before, depois: results.length, relaxado: false })
    } else {
      criteriosRelaxados.push('punho/outro sensível: nenhuma raquete com conforto≥8 sem saída exigente — avalie manualmente')
      filterTrace.push({ filtro: 'punho/outro sensível (conforto≥8 + saída não exigente)', antes: before, depois: results.length, relaxado: true, note: 'nenhuma raquete passou o critério' })
    }
  }

  // Deterministic scorer — ranks by profile weights (turaquete-matriz-pesos.md Level 2)
  const BRAND_BOOST = 1.5
  const scored = results
    .map(r => {
      const base = scoreRacket(r, filtros)
      const preferred = filtros.marca_preferida
        ? r.brands?.name?.toLowerCase() === filtros.marca_preferida.toLowerCase()
        : false
      return { ...r, match_score: base + (preferred ? BRAND_BOOST : 0) }
    })
    .sort((a, b) => b.match_score - a.match_score)
  filterTrace.push({ filtro: 'scorer (ranking por pesos)', antes: results.length, depois: scored.length, relaxado: false, note: 'sem eliminação, apenas ordenação' })
  if (filtros.marca_preferida) {
    const ndaMarca = scored.filter(r => r.brands?.name?.toLowerCase() === filtros.marca_preferida!.toLowerCase()).length
    const topNaoE = scored.length > 0 && scored[0].brands?.name?.toLowerCase() !== filtros.marca_preferida.toLowerCase()
    filterTrace.push({
      filtro: `marca preferida "${filtros.marca_preferida}" (+${BRAND_BOOST} pts boost)`,
      depois: scored.length,
      relaxado: false,
      note: `${ndaMarca} raquete(s) da marca no pool; top candidata ${topNaoE ? 'NÃO é' : 'é'} da marca preferida`,
    })
  }

  return { raquetes: scored, criteriosRelaxados, filterTrace }
}

export async function detalleRaqueta(id: number): Promise<RacketWithInsights | null> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .eq('publicada', true)
    .single()

  if (error) return null
  return normalizeRacket(data)
}

export async function listarRaquetas(): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .order('name')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return ((data as unknown[]) ?? []).map(normalizeRacket)
}

export async function getRaquetasByIds(ids: number[]): Promise<RacketWithInsights[]> {
  if (ids.length === 0) return []
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .in('id', ids)
    .eq('publicada', true)   // never surface unpublished rackets from event data

  if (error) throw new Error(`Supabase: ${error.message}`)
  return ((data as unknown[]) ?? []).map(normalizeRacket).filter((r): r is RacketWithInsights => r !== null)
}

export interface Brand {
  id: number
  name: string
  slug: string
  country: string | null
  website: string | null
  status: 'disponivel' | 'em_breve'
  logo_url: string | null
}

export async function getRaquetaPorSlug(slug: string): Promise<RacketWithInsights | null> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('slug', slug)
    .eq('publicada', true)
    .single()

  if (error) return null
  return normalizeRacket(data)
}

export async function listarRaquetasPorMarca(
  brandSlug: string
): Promise<{ brand: Brand; rackets: RacketWithInsights[] } | null> {
  const { data: brandData, error: brandError } = await getSupabase()
    .from('brands')
    .select('id, name, slug, country, website, status, logo_url')
    .eq('slug', brandSlug)
    .single()

  if (brandError || !brandData) return null

  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('brand_id', (brandData as { id: number }).id)
    .eq('publicada', true)
    .order('price')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return {
    brand: brandData as Brand,
    rackets: ((data as unknown[]) ?? []).map(normalizeRacket),
  }
}

export interface TopRaquetasResult {
  rackets: RacketWithInsights[]
  source: 'real' | 'curated'
}

export async function getRaquetasPorSlug(slugs: readonly string[]): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .in('slug', slugs as string[])
    .eq('publicada', true)
  if (error || !data) return []
  // Preserve curated order
  return slugs
    .map(s => (data as unknown as RacketWithInsights[]).find(r => r.slug === s))
    .filter((r): r is RacketWithInsights => r != null)
    .map(normalizeRacket)
    .filter((r): r is RacketWithInsights => r != null)
}

// ── Featured carousel config ─────────────────────────────────────────────────
// Change slugs here to update the cold-start fallback order.
const CURATED_SLUGS = [
  'beast-2023', 'ceu', 'harley-25', 'rebel-25', 'starlight-ruby', 'kronos-25',
] as const

const TOP_N = 6
// Once this many recommendations are recorded in the last 30 days, real data
// fully drives the carousel (with fallback filling any remaining slots).
const COLD_START_THRESHOLD = 30

export async function getTopRaquetas(): Promise<TopRaquetasResult> {
  const supabase = getSupabase()

  // Fetch top N by recommendation count in rolling 30-day window
  const { data: topRows } = await supabase.rpc('get_top_rackets_30d', { lim: TOP_N })
  const rows = (topRows as { racket_id: number; cnt: number }[] | null) ?? []
  const totalInWindow = rows.reduce((sum, r) => sum + r.cnt, 0)

  // Cold-start: not enough real signal yet — return curated fallback
  if (totalInWindow < COLD_START_THRESHOLD || rows.length === 0) {
    const rackets = await getRaquetasPorSlug(CURATED_SLUGS)
    return { rackets, source: 'curated' }
  }

  // Fetch real rackets (getRaquetasByIds already filters publicada=true)
  const realIds = rows.map(r => r.racket_id)
  const unordered = await getRaquetasByIds(realIds)
  // Preserve leaderboard order
  const byId = new Map(unordered.map(r => [r.id, r]))
  const realRackets = realIds
    .map(id => byId.get(id))
    .filter((r): r is RacketWithInsights => r !== undefined)

  // Fill remaining slots from fallback, skipping already included slugs
  if (realRackets.length < TOP_N) {
    const realSlugSet = new Set(realRackets.map(r => r.slug))
    const gapSlugs = (CURATED_SLUGS as readonly string[])
      .filter(s => !realSlugSet.has(s))
      .slice(0, TOP_N - realRackets.length)
    const gapRackets = await getRaquetasPorSlug(gapSlugs)
    return { rackets: [...realRackets, ...gapRackets], source: 'real' }
  }

  return { rackets: realRackets.slice(0, TOP_N), source: 'real' }
}

export async function listarMarcas(): Promise<Brand[]> {
  const { data, error } = await getSupabase()
    .from('brands')
    .select('id, name, slug, country, website, status, logo_url')
    .order('status')   // disponivel primero, depois em_breve
    .order('name')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return (data as Brand[]) ?? []
}

export async function getRaquetasComAtleta(): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .eq('destaque_atleta', true)
    .order('name')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return ((data as unknown[]) ?? []).map(normalizeRacket)
}
