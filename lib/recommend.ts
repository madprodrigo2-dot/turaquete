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
  price_updated_at: string | null
  currency: string
  affiliate_url: string | null
  source_url: string | null
  image_url: string | null
  technologies: string[] | null
  specs_extra: Record<string, unknown> | null
  publicada: boolean
  racket_insights: Insights | null
  brands?: { name: string; slug?: string } | null
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
  face_material, core, price, price_updated_at, currency, affiliate_url, source_url, image_url, technologies,
  specs_extra, publicada,
  brands ( name, slug ),
  racket_insights (
    power, control, comfort, maneuverability, stability, spin, forgiveness,
    good_for_beginners, good_for_intermediate, good_for_advanced,
    elbow_friendly, shoulder_friendly, observations, summary,
    perfil_resumo, nivel_sugerido, confianca
  )
`.trim()

export interface YearMatchInfo {
  requestedYear: number
  status: 'exact_match' | 'model_match_year_differs' | 'no_match'
  available: Array<{ name: string; model_year: number | null; id: number }>
}

export interface BuscarResult {
  raquetes: (RacketWithInsights & { match_score: number })[]
  criteriosRelaxados: string[]
  filterTrace: FilterStep[]
  yearMatchInfo?: YearMatchInfo
}

// Extracts an explicit year from a nome string and returns the base name without it.
// Handles 4-digit years (2020–2039) and 2-digit suffixes (20–39 → 2020–2039).
// Examples: "ison 2024" → {baseName:"ison", year:2024}
//           "rebel 25"  → {baseName:"rebel", year:2025}
//           "ison"      → {baseName:"ison", year:null}
function parseYearFromNome(nome: string): { baseName: string; year: number | null } {
  const m4 = nome.match(/\b(202\d|203\d)\b/)
  if (m4) {
    const year = parseInt(m4[1])
    const baseName = nome.replace(m4[0], '').replace(/\s+/g, ' ').trim()
    return { baseName: baseName || nome, year }
  }
  const m2 = nome.match(/\b(2[0-9]|3[0-9])\b/)
  if (m2) {
    const short = parseInt(m2[1])
    const year = 2000 + short
    const baseName = nome.replace(m2[0], '').replace(/\s+/g, ' ').trim()
    return { baseName: baseName || nome, year }
  }
  return { baseName: nome, year: null }
}

export async function buscarRaquetas(filtros: RacketFilters): Promise<BuscarResult> {
  // Hard constraints in SQL — never relaxed
  let query = getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .order('name')

  // Parse year from nome (e.g., "ison 2024" → baseName="ison", requestedYear=2024)
  const { baseName: nomeBase, year: requestedYear } = filtros.nome
    ? parseYearFromNome(filtros.nome)
    : { baseName: '', year: null }

  if (filtros.nome) {
    // Broad SQL pre-filter on base name (without year); TypeScript word-boundary filter follows.
    query = query.ilike('name', `%${nomeBase}%`)
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

  const { data, error } = await query.limit(500)
  if (error) throw new Error(`Supabase: ${error.message}`)

  const allCandidates = ((data as unknown[]) ?? []).map(normalizeRacket)
  const criteriosRelaxados: string[] = []
  const filterTrace: FilterStep[] = []
  let results = [...allCandidates]

  // Record SQL step
  const sqlParts = ['publicada=true']
  if (filtros.nome) sqlParts.push(`nome ilike "%${nomeBase}%"`)
  if (filtros.atleta) sqlParts.push(`atleta ilike "%${filtros.atleta}%"`)
  if (filtros.presupuesto_min && filtros.presupuesto_min > 0) sqlParts.push(`preço≥${filtros.presupuesto_min}`)
  if (filtros.presupuesto_max) sqlParts.push(`preço≤${filtros.presupuesto_max}`)
  filterTrace.push({ filtro: `SQL [${sqlParts.join(', ')}]`, depois: allCandidates.length, relaxado: false })

  // Word-boundary TypeScript filter — prevents substring matches (e.g., "ison" must not match "Poison Bee")
  if (filtros.nome && nomeBase) {
    const safe = nomeBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const wordRe = new RegExp(`\\b${safe}\\b`, 'i')
    const before = results.length
    results = results.filter(r => wordRe.test(r.name))
    if (before !== results.length) {
      filterTrace.push({ filtro: `word-boundary "${nomeBase}"`, antes: before, depois: results.length, relaxado: false })
    }
  }

  // Year match analysis — populated when nome includes a year token
  let yearMatchInfo: YearMatchInfo | undefined
  if (filtros.nome && requestedYear !== null) {
    const exactMatches = results.filter(r => r.model_year === requestedYear)
    if (results.length === 0) {
      yearMatchInfo = { requestedYear, status: 'no_match', available: [] }
    } else if (exactMatches.length > 0) {
      const beforeYear = results.length
      results = exactMatches
      yearMatchInfo = {
        requestedYear,
        status: 'exact_match',
        available: exactMatches.slice(0, 4).map(r => ({ name: r.name, model_year: r.model_year, id: r.id })),
      }
      filterTrace.push({ filtro: `ano ${requestedYear} (exact)`, antes: beforeYear, depois: results.length, relaxado: false })
    } else {
      yearMatchInfo = {
        requestedYear,
        status: 'model_match_year_differs',
        available: results.slice(0, 4).map(r => ({ name: r.name, model_year: r.model_year, id: r.id })),
      }
    }
  }

  // Nivel ceiling filter — asymmetric teto: users can receive rackets BELOW their level,
  // but NOT above. Iniciante/intermediário are protected from expert rackets.
  // Avançado sees the full catalog (including iniciante-tagged comfort rackets for injuries).
  // Not applied for name/athlete lookups (user asked for a specific model by name).
  //
  // Inline version of derivarNivel() — avoids circular import with lib/nivel.ts.
  const isNivelAvancado = (r: RacketWithInsights): boolean => {
    const ins = r.racket_insights
    if (!ins) return false
    const f = ins.forgiveness, p = ins.power, c = ins.control, co = ins.comfort
    if (f == null || p == null || c == null || co == null) return ins.nivel_sugerido === 'avancado'
    return f <= 4 || (f <= 6 && (p >= 7 || c >= 7)) || (f <= 7 && p >= 9)
  }

  if (filtros.nivel && !filtros.nome && !filtros.atleta && results.length > 0) {
    const before = results.length

    if (filtros.nivel === 'iniciante') {
      // Exclude avancado + any intermediario with forgiveness ≤ 5 (borderline harsh rackets
      // like ML10 PRO CUP f=3 that formula calls intermediario but punish beginners' arms).
      // Pool never silently degrades: if empty in a price range, agent reports honestly.
      results = results.filter(r => {
        const ins = r.racket_insights
        if (!ins) return true  // no insights → keep (unknown is not confirmed harmful)
        if (ins.forgiveness != null && ins.forgiveness <= 5) return false
        return !isNivelAvancado(r)
      })
      filterTrace.push({
        filtro: 'teto de nível: iniciante (exclui avancado + forgiveness ≤ 5)',
        antes: before,
        depois: results.length,
        relaxado: false,
        note: `${before - results.length} raquete(s) removida(s) do pool`,
      })
    } else if (filtros.nivel === 'intermediario') {
      // Exclude avancado only — borderline forgiveness 4-5 intermediario stays (intermediary
      // players can handle some demanding rackets; no forgiveness floor here).
      results = results.filter(r => !isNivelAvancado(r))
      filterTrace.push({
        filtro: 'teto de nível: intermediario (exclui avancado)',
        antes: before,
        depois: results.length,
        relaxado: false,
        note: `${before - results.length} raquete(s) removida(s) do pool`,
      })
    } else {
      // avancado: no ceiling — full catalog visible, scorer weights handle ranking
      filterTrace.push({
        filtro: `nível "avancado" → sem teto (vê todo o catálogo)`,
        depois: results.length,
        relaxado: false,
        note: 'scorer pondera conforme perfil',
      })
    }
  } else if (filtros.nivel) {
    // Nome/atleta lookup: skip ceiling, just log
    filterTrace.push({
      filtro: `nível "${filtros.nivel}" em busca por nome/atleta → teto não aplicado`,
      depois: results.length,
      relaxado: false,
    })
  }

  // Minimum pool size before injury filter relaxes to avoid collapsing to 1 candidate.
  // Root cause: unscored rackets (comfort=null) fail the strict ≥8 threshold even though
  // they are not confirmed bad — NULL means unknown, not harmful.
  const INJURY_MIN_POOL = 3

  // Injury filter: cotovelo — two-tier: strict (≥8 + fácil) → relaxed (≥7 or null, not exigente).
  // elbow_friendly=false is always a hard exclusion.
  if (filtros.cotovelo_sensivel && results.length > 0) {
    const before = results.length
    const strict = results.filter(r => {
      const ins = r.racket_insights
      if (!ins) return false
      if (ins.elbow_friendly === true) return true
      if (ins.elbow_friendly === false) return false
      const saida = r.specs_extra?.saida_de_bola as string | undefined
      return (ins.comfort ?? 0) >= 8 && saida === 'fácil'
    })
    if (strict.length >= INJURY_MIN_POOL) {
      results = strict
      filterTrace.push({ filtro: 'cotovelo sensível (elbow_friendly ou conforto≥8 + saída fácil)', antes: before, depois: results.length, relaxado: false })
    } else {
      // Relaxed tier: exclude explicit bad, include unknown scores and comfort≥7
      const relaxed = results.filter(r => {
        const ins = r.racket_insights
        if (!ins) return false
        if (ins.elbow_friendly === false) return false
        if (ins.elbow_friendly === true) return true
        const saida = r.specs_extra?.saida_de_bola as string | undefined
        return ins.comfort == null || (ins.comfort >= 7 && saida !== 'exigente')
      })
      if (relaxed.length >= 1) {
        results = relaxed
        const note = strict.length > 0
          ? `conforto≥7 (relaxado — apenas ${strict.length} com conforto≥8)`
          : 'conforto≥7 (relaxado — catálogo sem scores suficientes)'
        criteriosRelaxados.push(`cotovelo sensível: ${note}`)
        filterTrace.push({ filtro: 'cotovelo sensível (conforto≥7 ou flag, relaxado)', antes: before, depois: results.length, relaxado: true, note })
      } else {
        criteriosRelaxados.push('cotovelo sensível: nenhuma raquete apta — avalie manualmente')
        filterTrace.push({ filtro: 'cotovelo sensível', antes: before, depois: results.length, relaxado: true, note: 'nenhuma raquete passou o critério' })
      }
    }
  }

  // Injury filter: ombro — same two-tier logic as cotovelo
  if (filtros.ombro_sensivel && results.length > 0) {
    const before = results.length
    const strict = results.filter(r => {
      const ins = r.racket_insights
      if (!ins) return false
      if (ins.shoulder_friendly === true) return true
      if (ins.shoulder_friendly === false) return false
      const saida = r.specs_extra?.saida_de_bola as string | undefined
      return (ins.comfort ?? 0) >= 8 && saida === 'fácil'
    })
    if (strict.length >= INJURY_MIN_POOL) {
      results = strict
      filterTrace.push({ filtro: 'ombro sensível (shoulder_friendly ou conforto≥8 + saída fácil)', antes: before, depois: results.length, relaxado: false })
    } else {
      const relaxed = results.filter(r => {
        const ins = r.racket_insights
        if (!ins) return false
        if (ins.shoulder_friendly === false) return false
        if (ins.shoulder_friendly === true) return true
        const saida = r.specs_extra?.saida_de_bola as string | undefined
        return ins.comfort == null || (ins.comfort >= 7 && saida !== 'exigente')
      })
      if (relaxed.length >= 1) {
        results = relaxed
        const note = strict.length > 0
          ? `conforto≥7 (relaxado — apenas ${strict.length} com conforto≥8)`
          : 'conforto≥7 (relaxado — catálogo sem scores suficientes)'
        criteriosRelaxados.push(`ombro sensível: ${note}`)
        filterTrace.push({ filtro: 'ombro sensível (conforto≥7 ou flag, relaxado)', antes: before, depois: results.length, relaxado: true, note })
      } else {
        criteriosRelaxados.push('ombro sensível: nenhuma raquete apta — avalie manualmente')
        filterTrace.push({ filtro: 'ombro sensível', antes: before, depois: results.length, relaxado: true, note: 'nenhuma raquete passou o critério' })
      }
    }
  }

  // Injury filter: punho / outro — two-tier (no explicit flag, relies on comfort + saida)
  if (filtros.punho_sensivel && results.length > 0) {
    const before = results.length
    const strict = results.filter(r => {
      const ins = r.racket_insights
      if (!ins) return false
      const saida = r.specs_extra?.saida_de_bola as string | undefined
      return (ins.comfort ?? 0) >= 8 && saida === 'fácil'
    })
    if (strict.length >= INJURY_MIN_POOL) {
      results = strict
      filterTrace.push({ filtro: 'punho/outro sensível (conforto≥8 + saída fácil)', antes: before, depois: results.length, relaxado: false })
    } else {
      const relaxed = results.filter(r => {
        const ins = r.racket_insights
        if (!ins) return false
        const saida = r.specs_extra?.saida_de_bola as string | undefined
        return ins.comfort == null || (ins.comfort >= 7 && saida !== 'exigente')
      })
      if (relaxed.length >= 1) {
        results = relaxed
        const note = strict.length > 0
          ? `conforto≥7 (relaxado — apenas ${strict.length} com conforto≥8)`
          : 'conforto≥7 (relaxado — catálogo sem scores suficientes)'
        criteriosRelaxados.push(`punho sensível: ${note}`)
        filterTrace.push({ filtro: 'punho/outro sensível (conforto≥7, relaxado)', antes: before, depois: results.length, relaxado: true, note })
      } else {
        criteriosRelaxados.push('punho sensível: nenhuma raquete apta — avalie manualmente')
        filterTrace.push({ filtro: 'punho/outro sensível', antes: before, depois: results.length, relaxado: true, note: 'nenhuma raquete passou o critério' })
      }
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

  return { raquetes: scored, criteriosRelaxados, filterTrace, yearMatchInfo }
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

export async function getRandomExpensiveRacket(minPrice = 2000): Promise<RacketWithInsights | null> {
  const { data } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .gte('price', minPrice)
  if (!data || data.length === 0) return null
  const idx = Math.floor(Math.random() * data.length)
  return normalizeRacket((data as unknown[])[idx])
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

  let finalRackets: RacketWithInsights[]

  // Fill remaining slots from fallback, skipping already included slugs
  if (realRackets.length < TOP_N) {
    const realSlugSet = new Set(realRackets.map(r => r.slug))
    const gapSlugs = (CURATED_SLUGS as readonly string[])
      .filter(s => !realSlugSet.has(s))
      .slice(0, TOP_N - realRackets.length)
    const gapRackets = await getRaquetasPorSlug(gapSlugs)
    finalRackets = [...realRackets, ...gapRackets]
  } else {
    finalRackets = realRackets.slice(0, TOP_N)
  }

  // Ensure at least one entry-level racket in the carousel
  const hasEntry = finalRackets.some(r => r.racket_insights?.nivel_sugerido === 'iniciante')
  if (!hasEntry) {
    const [entry] = await getRaquetasPorSlug(['beast-2023'])
    if (entry && !finalRackets.some(r => r.slug === 'beast-2023')) {
      finalRackets[finalRackets.length - 1] = entry
    }
  }

  return { rackets: finalRackets, source: 'real' }
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

export async function getRaquetasPorNivel(
  nivel: 'iniciante' | 'intermediario' | 'avancado'
): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .order('name')
  if (error) throw new Error(`Supabase: ${error.message}`)
  const all = ((data as unknown[]) ?? []).map(normalizeRacket)
  return all.filter(r => r.racket_insights?.nivel_sugerido === nivel)
}

export async function getRaquetasPorOrcamento(max: number): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .lte('price', max)
    .not('price', 'is', null)
    .order('price')
  if (error) throw new Error(`Supabase: ${error.message}`)
  return ((data as unknown[]) ?? []).map(normalizeRacket)
}

export async function getRaquetasConforto(): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .order('name')
  if (error) throw new Error(`Supabase: ${error.message}`)
  const all = ((data as unknown[]) ?? []).map(normalizeRacket)
  return all.filter(r =>
    r.racket_insights?.elbow_friendly === true ||
    r.racket_insights?.shoulder_friendly === true
  )
}
