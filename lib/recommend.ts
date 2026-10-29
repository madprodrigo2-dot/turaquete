import { getSupabase } from './supabase'
import { scoreRacket } from './scorer'
import { getSaidaDeBola } from './saidaBola'
import { classifyCore } from './motor'
import type { FilterStep } from './debug-types'

// Inline para evitar dependência circular com nivel.ts (que importa RacketWithInsights daqui).
// Mantida idêntica à fórmula em lib/nivel.ts — derivarNivel() delega a esta lógica.
function computeNivelFormula(r: RacketWithInsights): 'iniciante' | 'intermediario' | 'avancado' | null {
  const ins = r.racket_insights
  if (!ins) return null
  const f = ins.forgiveness, p = ins.power, c = ins.control, co = ins.comfort

  let formula: 'iniciante' | 'intermediario' | 'avancado' | null = null
  if (f != null && p != null && c != null && co != null) {
    if (f <= 4 || (f <= 6 && (p >= 7 || c >= 7)) || (f <= 7 && p >= 9)) formula = 'avancado'
    else if (f >= 7 && co >= 6 && p <= 6) formula = 'iniciante'
    else formula = 'intermediario'
  }

  // Override editorial: só existe quando admin registrou motivo explícito.
  // Vence sempre, mesmo com os 4 scores completos (bug antigo: só era
  // consultado quando faltava algum score, ignorando override em raquetes
  // com ficha completa — ex. Aria By Pininfarina).
  return ins.nivel_override ?? formula
}

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
  pref_carbono?: '3k' | '12k' | '18k'    // carbono preferido (boost apenas)
  pref_eva?: 'soft' | 'medium' | 'hard'   // EVA preferido (boost apenas)
  pref_espessura?: 'fina' | 'media' | 'grossa'  // espessura preferida (boost apenas)
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
  nivel_override: 'iniciante' | 'intermediario' | 'avancado' | null
  nivel_override_motivo: string | null
  confianca: 'alta' | 'media' | 'baixa' | null
}

export interface RacketWithInsights {
  id: number
  name: string
  slug: string
  nome_base: string | null
  model_year: number | null
  racket_family_count: number | null
  weight_g: number | null
  balance: string | null
  format: string | null
  face_material: string | null
  core: string | null
  price: number | null
  price_previous: number | null
  price_updated_at: string | null
  updated_at: string | null
  created_at: string | null
  currency: string
  affiliate_url: string | null
  source_url: string | null
  image_url: string | null
  technologies: string[] | null
  specs_extra: Record<string, unknown> | null
  publicada: boolean
  is_active: boolean | null
  racket_insights: Insights | null
  brands?: { name: string; slug?: string; logo_url?: string | null } | null
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
  id, name, slug, nome_base, model_year, racket_family_count, weight_g, balance, format,
  face_material, core, price, price_previous, price_updated_at, updated_at, created_at, currency, affiliate_url, source_url, image_url, technologies,
  specs_extra, publicada, is_active,
  brands ( name, slug, logo_url ),
  racket_insights (
    power, control, comfort, maneuverability, stability, spin, forgiveness,
    good_for_beginners, good_for_intermediate, good_for_advanced,
    elbow_friendly, shoulder_friendly, observations, summary,
    perfil_resumo, nivel_override, nivel_override_motivo, confianca
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
  // is_active=true exigido por decisão explícita do Rodrigo (2026-09):
  // raquetes de geração anterior/liquidação não devem mais ser recomendadas
  // pelo chat, mesmo que publicada=true. Reverte parcialmente o fix de
  // 2026-06 (ff8bbb0) que tirou is_active do gate de visibilidade — aqui é
  // deliberado, só nesta função.
  let query = getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .eq('is_active', true)
    .order('name')

  // Parse year from nome (e.g., "ison 2024" → baseName="ison", requestedYear=2024)
  const { baseName: nomeBase, year: requestedYear } = filtros.nome
    ? parseYearFromNome(filtros.nome)
    : { baseName: '', year: null }

  if (filtros.nome) {
    // Broad SQL pre-filter on name OR nome_base (without year); TypeScript word-boundary filter follows.
    query = query.or(`name.ilike.%${nomeBase}%,nome_base.ilike.%${nomeBase}%`)
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

  // Profile searches only show current models (≥2024).
  // Name/athlete lookups are exempt — user asked for a specific racket.
  if (!filtros.nome && !filtros.atleta) {
    query = query.gte('model_year', 2024)
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

  // Portão de filtragem: protege iniciantes e intermediários de raquetes avançadas.
  // Teto assimétrico — um usuário pode receber raquetes ABAIXO do seu nível, nunca acima.
  // Avançado vê o catálogo completo. Não aplicado para buscas por nome/atleta.
  //
  // DISTINTO de derivarNivel() em lib/nivel.ts — são perguntas diferentes por design:
  //   derivarNivel        → "que label exibir publicamente?" (fórmula runtime; nivel_override vence se preenchido)
  //   isAvancadaParaFiltro → "bloquear esta raquete para não-avançados?" (usa scores)
  // Os thresholds divergem intencionalmente: p>=8 ou c>=9 aqui vs p>=7 ou c>=7 lá.
  // Mais permissivo = mais raquetes chegam ao iniciante; a etiqueta de exibição não muda.
  const isAvancadaParaFiltro = (r: RacketWithInsights): boolean => {
    const ins = r.racket_insights
    if (!ins) return false
    const f = ins.forgiveness, p = ins.power, c = ins.control, co = ins.comfort
    if (f == null || p == null || c == null || co == null) return ins.nivel_override === 'avancado'
    return f <= 4 || (f <= 6 && (p >= 8 || c >= 9)) || (f <= 7 && p >= 9)
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
        return !isAvancadaParaFiltro(r)
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
      results = results.filter(r => !isAvancadaParaFiltro(r))
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

  // Injury filter: braço (cotovelo / ombro / punho) — all treated as one bucket.
  // elbow_friendly=false is always a hard exclusion; elbow_friendly=true always passes.
  if ((filtros.cotovelo_sensivel || filtros.ombro_sensivel || filtros.punho_sensivel) && results.length > 0) {
    const before = results.length
    const strict = results.filter(r => {
      const ins = r.racket_insights
      if (!ins) return false
      if (ins.elbow_friendly === true) return true
      if (ins.elbow_friendly === false) return false
      const saida = getSaidaDeBola(ins.comfort, ins.power)
      return (ins.comfort ?? 0) >= 8 && saida === 'fácil'
    })
    if (strict.length >= INJURY_MIN_POOL) {
      results = strict
      filterTrace.push({ filtro: 'braço sensível (elbow_friendly ou conforto≥8 + saída fácil)', antes: before, depois: results.length, relaxado: false })
    } else {
      const relaxed = results.filter(r => {
        const ins = r.racket_insights
        if (!ins) return false
        if (ins.elbow_friendly === false) return false
        if (ins.elbow_friendly === true) return true
        const saida = getSaidaDeBola(ins.comfort, ins.power)
        return ins.comfort == null || (ins.comfort >= 7 && saida !== 'exigente')
      })
      if (relaxed.length >= 1) {
        results = relaxed
        const note = strict.length > 0
          ? `conforto≥7 (relaxado — apenas ${strict.length} com conforto≥8)`
          : 'conforto≥7 (relaxado — catálogo sem scores suficientes)'
        criteriosRelaxados.push(`braço sensível: ${note}`)
        filterTrace.push({ filtro: 'braço sensível (conforto≥7 ou flag, relaxado)', antes: before, depois: results.length, relaxado: true, note })
      } else {
        criteriosRelaxados.push('braço sensível: nenhuma raquete apta — avalie manualmente')
        filterTrace.push({ filtro: 'braço sensível', antes: before, depois: results.length, relaxado: true, note: 'nenhuma raquete passou o critério' })
      }
    }
  }

  // Deterministic scorer — ranks by profile weights (turaquete-matriz-pesos.md Level 2)
  // Reservado para desempate entre raquetes equivalentes. Não conectar como boost sobre match_score: viola neutralidade. Ver decisão de produto.
  const BRAND_BOOST = 1.5 // eslint-disable-line @typescript-eslint/no-unused-vars
  const TECH_PREF_BOOST = 1.5
  const scored = results
    .map(r => {
      const base = scoreRacket(r, filtros)
      let techBoost = 0
      if (filtros.pref_carbono) {
        const face = (r.face_material || '').toLowerCase()
        const m3k = (face.includes('carbono') || face.includes('carbon')) &&
          !face.includes('18k') && !face.includes('21k') && !face.includes('24k') && !face.includes('triaxial') &&
          !face.includes('12k') && !face.includes('15k') && !face.includes('16k') && !face.includes('6k') &&
          !face.includes('forjad') && !face.includes('forged') &&
          !face.includes('titanio') && !face.includes('titânio') && !face.includes('metal fusion') &&
          !face.includes('silver') && !face.includes('mft') && !face.includes('aluminizado')
        const m12k = face.includes('12k') || face.includes('15k') || face.includes('16k') || face.includes('6k')
        const m18k = face.includes('18k') || face.includes('21k') || face.includes('24k') || face.includes('triaxial') || face.includes('forjad') || face.includes('forged')
        const matches = filtros.pref_carbono === '3k' ? m3k : filtros.pref_carbono === '12k' ? m12k : m18k
        if (matches) techBoost += TECH_PREF_BOOST
      }
      if (filtros.pref_eva) {
        const cc = classifyCore(r.core)
        const matches = filtros.pref_eva === 'soft'   ? (cc === 'SOFT' || cc === 'SUPERSOFT')
                      : filtros.pref_eva === 'medium' ? cc === 'MEDIUM'
                      : cc === 'HARD'
        if (matches) techBoost += TECH_PREF_BOOST
      }
      if (filtros.pref_espessura) {
        const esp = (r.specs_extra?.espessura_mm as number | null | undefined) ?? null
        const matches = esp != null && (
          filtros.pref_espessura === 'fina' ? esp <= 20 : filtros.pref_espessura === 'media' ? (esp === 21 || esp === 22) : esp >= 23
        )
        if (matches) techBoost += TECH_PREF_BOOST
      }
      return { ...r, match_score: base + techBoost }
    })
    .sort((a, b) => b.match_score - a.match_score)
  filterTrace.push({ filtro: 'scorer (ranking por pesos)', antes: results.length, depois: scored.length, relaxado: false, note: 'sem eliminação, apenas ordenação' })
  if (filtros.marca_preferida) {
    const ndaMarca = scored.filter(r => r.brands?.name?.toLowerCase() === filtros.marca_preferida!.toLowerCase()).length
    const topNaoE = scored.length > 0 && scored[0].brands?.name?.toLowerCase() !== filtros.marca_preferida.toLowerCase()
    filterTrace.push({
      filtro: `marca preferida "${filtros.marca_preferida}" (sem boost — apenas registro)`,
      depois: scored.length,
      relaxado: false,
      note: `${ndaMarca} raquete(s) da marca no pool; top candidata ${topNaoE ? 'NÃO é' : 'é'} da marca preferida`,
    })
  }
  if (filtros.pref_carbono || filtros.pref_eva || filtros.pref_espessura) {
    const pk = filtros.pref_carbono ? `carbono=${filtros.pref_carbono}` : filtros.pref_eva ? `eva=${filtros.pref_eva}` : `espessura=${filtros.pref_espessura}`
    filterTrace.push({ filtro: `pref técnica "${pk}" (+${TECH_PREF_BOOST} pts boost)`, depois: scored.length, relaxado: false, note: 'sem eliminação, apenas boost de ranking' })
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

// ── Comparações sugeridas ────────────────────────────────────────────────────
// Mesma regra usada na ficha de produto ("Comparações populares") e no sitemap,
// pra garantir que toda URL de comparação listada no sitemap tenha um link
// real (crawlable) apontando pra ela em pelo menos uma ficha de produto.
export function suggestComparisons(
  racket: RacketWithInsights,
  allRackets: RacketWithInsights[],
  limit = 6
): RacketWithInsights[] {
  return allRackets
    .filter(r => r.slug !== racket.slug)
    .map(r => ({
      r,
      score:
        (r.nome_base && r.nome_base === racket.nome_base && r.brands?.name === racket.brands?.name ? 20 : 0) +
        (r.brands?.name === racket.brands?.name ? 10 : 0) +
        (racket.price && r.price
          ? Math.abs(r.price - racket.price) / racket.price < 0.3 ? 5 : 0
          : 0),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.r)
}

// ── Featured carousel config ─────────────────────────────────────────────────
const TOP_N = 18
const TOP_POOL = 50 // pool maior que o limite pra poder aplicar o teto de 1 por marca

// Piso de qualidade técnica — equivale ao top 70% do catálogo publicado por
// scoreGeral no snapshot usado pra calibrar (286 raquetes, 2026-08). Não é
// recalculado em runtime pra não pesar a home a cada load; revisar o valor
// se o catálogo mudar muito. Mesma fórmula do "Grl" em /admin/motor.
const SCORE_GERAL_FLOOR = 5.8

function scoreGeral(ins: RacketWithInsights['racket_insights'] | undefined): number | null {
  const vals = [ins?.power, ins?.control, ins?.maneuverability, ins?.stability].filter((v): v is number => v != null)
  return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
}

export async function getTopRaquetas(): Promise<TopRaquetasResult> {
  const supabase = getSupabase()

  // Nível 1 — clicks reais em /ir/ nos últimos 30 dias (exclui is_test na
  // própria função SQL). Pool maior que TOP_N pra sobrar candidatas depois
  // do teto de 1 por marca e do piso de qualidade.
  const { data: clickRows } = await supabase.rpc('get_top_rackets_30d', { lim: TOP_POOL })
  const rawClickIds = ((clickRows as { racket_id: number; cnt: number }[] | null) ?? []).map(r => r.racket_id)

  // Nível 2 — recomendações reais do chat nos últimos 30 dias, usado só pra
  // completar os slots que o nível 1 não preencheu (pouco clique, marca
  // repetida ou abaixo do piso). Nunca substitui uma raquete que já entrou
  // por clique real.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recRows } = await supabase
    .from('recommendation_events')
    .select('racket_id')
    .eq('is_test', false)
    .gte('created_at', thirtyDaysAgo)
    .limit(5000)

  const recCounts = new Map<number, number>()
  for (const r of (recRows as { racket_id: number }[] | null) ?? []) {
    recCounts.set(r.racket_id, (recCounts.get(r.racket_id) ?? 0) + 1)
  }
  const rawRecIds = [...recCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)

  const allIds = [...new Set([...rawClickIds, ...rawRecIds])]
  const racketsById = new Map((await getRaquetasByIds(allIds)).map(r => [r.id, r]))

  // Piso de qualidade: descarta candidatas com scoreGeral abaixo do corte
  // antes de rankear por clique/recs — resolve a queixa de raquetes de gama
  // baixa aparecendo só por volume de clique, sem abandonar o dado real.
  const passesFloor = (id: number) => {
    const s = scoreGeral(racketsById.get(id)?.racket_insights)
    return s != null && s >= SCORE_GERAL_FLOOR
  }
  const clickIds = rawClickIds.filter(passesFloor)
  const recIds = rawRecIds.filter(passesFloor)

  const seenBrands = new Set<string>()
  const finalRackets: RacketWithInsights[] = []

  function tryAdd(id: number): void {
    const r = racketsById.get(id)
    if (!r) return
    const brandKey = r.brands?.slug
    if (brandKey) {
      if (seenBrands.has(brandKey)) return
      seenBrands.add(brandKey)
    }
    finalRackets.push(r)
  }

  for (const id of clickIds) {
    if (finalRackets.length >= TOP_N) break
    tryAdd(id)
  }
  if (finalRackets.length < TOP_N) {
    const usedIds = new Set(finalRackets.map(r => r.id))
    for (const id of recIds) {
      if (finalRackets.length >= TOP_N) break
      if (usedIds.has(id)) continue
      tryAdd(id)
    }
  }

  // Garante ao menos uma raquete de nível iniciante — troca o último slot
  // pela melhor candidata real (clique, depois recs) que não repita marca.
  const hasEntry = finalRackets.some(r => computeNivelFormula(r) === 'iniciante')
  if (!hasEntry && finalRackets.length > 0) {
    const usedIds = new Set(finalRackets.map(r => r.id))
    const usedBrands = new Set(
      finalRackets.slice(0, -1).map(r => r.brands?.slug).filter((s): s is string => !!s)
    )
    for (const id of [...clickIds, ...recIds]) {
      if (usedIds.has(id)) continue
      const r = racketsById.get(id)
      if (!r || computeNivelFormula(r) !== 'iniciante') continue
      const brandKey = r.brands?.slug
      if (brandKey && usedBrands.has(brandKey)) continue
      finalRackets[finalRackets.length - 1] = r
      break
    }
  }

  return { rackets: finalRackets }
}

// Brand chips for pref step — top N by model count, independent of fitting profile.
// 5-min TTL so new rackets appear without a redeploy.
let _brandChipsCache: { chips: string[]; at: number } | null = null
export async function getBrandChipsForPref(): Promise<string[]> {
  const now = Date.now()
  if (_brandChipsCache && now - _brandChipsCache.at < 5 * 60_000) return _brandChipsCache.chips

  const { data } = await getSupabase()
    .from('rackets')
    .select('brands!inner(name, status)')
    .eq('publicada', true)

  const cnt: Record<string, number> = {}
  for (const r of (data ?? []) as unknown as Array<{ brands: { name: string; status: string } | null }>) {
    const b = r.brands
    if (!b || b.status !== 'disponivel') continue
    cnt[b.name] = (cnt[b.name] ?? 0) + 1
  }

  const sorted = Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)

  const chips = [...sorted.slice(0, 7), 'Ver todas as marcas', 'Tanto faz']
  _brandChipsCache = { chips, at: now }
  return chips
}

export async function listarMarcas(): Promise<Brand[]> {
  // Join a partir de rackets (publicada=true) — mesmo padrão de getBrandChipsForPref()
  // e /api/busca. Marcas sem nenhuma raquete publicada (ex: marcas só de grips) nunca
  // aparecem aqui, sem depender de nenhum flag manual.
  const { data, error } = await getSupabase()
    .from('rackets')
    .select('brands!inner(id, name, slug, country, website, status, logo_url)')
    .eq('publicada', true)

  if (error) throw new Error(`Supabase: ${error.message}`)

  const byId = new Map<number, Brand>()
  for (const r of (data ?? []) as unknown as Array<{ brands: Brand | Brand[] | null }>) {
    const b = Array.isArray(r.brands) ? r.brands[0] : r.brands
    if (b) byId.set(b.id, b)
  }

  return [...byId.values()].sort((a, b) =>
    a.status !== b.status ? (a.status === 'disponivel' ? -1 : 1) : a.name.localeCompare(b.name)
  )
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
  return all.filter(r => computeNivelFormula(r) === nivel)
}

// ── "Top 3" por nível ────────────────────────────────────────────────────────
// Ranking dentro do pool que a própria página de nível já buscou (nunca
// aparece um "top" que não esteja na grade abaixo). Fonte: recomendações
// reais do chat nos últimos 30 dias, filtradas pelo nível que o usuário
// confirmou na conversa (conversations.confirmed_profile->>'nivel') — RPC
// get_top_rackets_by_nivel_30d faz esse join em SQL, mesmo padrão de
// get_top_rackets_30d (usado em getTopRaquetas). Piso de scoreGeral e teto de
// 1 por marca reaproveitados de getTopRaquetas, pelo mesmo motivo: não deixar
// uma raquete de baixa qualidade subir só por volume de recomendação.
const TOP_NIVEL_POOL = 50

// Regra do Rodrigo 2026-10-29: raquete com mais de ~2 anos de lançamento não
// entra no Top 3, mesmo com bom volume de recomendação — "2024 pra trás fica
// de fora" (hoje, 2026, isso é model_year >= 2025). Calculado a partir do ano
// atual, não fixo, pra não precisar lembrar de subir isso todo janeiro.
// model_year null também fica de fora — sem o dado, não dá pra confirmar que
// é recente (mesmo princípio do piso de scoreGeral abaixo).
function minModelYearTopNivel(): number {
  return new Date().getFullYear() - 1
}

// Pool pra RPC de clicks globais (desempate) — folgado de propósito: o
// catálogo inteiro tem no máximo ~12 clicks/30d numa raquete só hoje, então
// 200 cobre tudo com margem sem custo real (ver nota no caller).
const TOP_NIVEL_CLICKS_POOL = 200

// Agrupa edições da mesma raquete reeditada ano a ano (ex. NG17 do Nico
// Gianotti: 2023/2024/2025/2026 como linhas separadas no catálogo) — sem
// isso, a recomendação real se divide entre os SKUs e a raquete nunca sobe
// no ranking, mesmo sendo a mais escolhida de fato (caso real investigado
// 2026-10-29). Chave: (marca, atleta) quando a ficha tem atleta assinado —
// sinal mais confiável que nome pra "é a mesma linha" (testado: agrupar só
// por prefixo do nome junta raquetes diferentes por coincidência, ex. "BT
// Bullet"/"BT Destroyer"/"BT Cruiser" da Ocean Air viram "um grupo" só por
// começarem com "BT"). Sem atleta, cai pro (marca, nome_base) exato.
function consolidationKey(r: RacketWithInsights): string {
  const specs = r.specs_extra as Record<string, unknown> | null
  const atleta = typeof specs?.atleta === 'string' ? specs.atleta : null
  const brandKey = r.brands?.slug ?? `sem-marca-${r.id}`
  return atleta ? `atleta:${brandKey}:${atleta}` : `nome:${brandKey}:${r.nome_base ?? r.name}`
}

export async function getTopRaquetasPorNivel(
  nivel: 'iniciante' | 'intermediario' | 'avancado',
  pool: RacketWithInsights[],
  topN = 3
): Promise<RacketWithInsights[]> {
  if (pool.length === 0) return []

  const { data: rows } = await getSupabase().rpc('get_top_rackets_by_nivel_30d', {
    p_nivel: nivel,
    lim: TOP_NIVEL_POOL,
  })
  const countById = new Map(
    ((rows as { racket_id: number; cnt: number }[] | null) ?? []).map(r => [r.racket_id, r.cnt])
  )
  if (countById.size === 0) return []

  const minModelYear = minModelYearTopNivel()
  const eligible = pool
    .filter(r => (countById.get(r.id) ?? 0) > 0)
    .filter(r => {
      const s = scoreGeral(r.racket_insights)
      return s != null && s >= SCORE_GERAL_FLOOR
    })
    .filter(r => r.model_year != null && r.model_year >= minModelYear)
  if (eligible.length === 0) return []

  // Só soma cnt de edições que já passaram no filtro de antiguidade acima —
  // uma edição 2023 nunca "empresta" volume pra uma 2026 só por compartilhar
  // atleta/nome_base, senão reabriria a porta que esse filtro fechou.
  const groups = new Map<string, RacketWithInsights[]>()
  for (const r of eligible) {
    const key = consolidationKey(r)
    const group = groups.get(key)
    if (group) group.push(r)
    else groups.set(key, [r])
  }

  const consolidated = [...groups.values()].map(members => ({
    representative: members.reduce((best, r) => (r.model_year ?? 0) > (best.model_year ?? 0) ? r : best),
    cnt: members.reduce((sum, r) => sum + (countById.get(r.id) ?? 0), 0),
  }))

  // Clicks globais (não atribuíveis por página/nível — essa é a limitação
  // conhecida) só entram pra desempatar cnt exatamente igual, nunca somados
  // ou ponderados ao score: a escala é outra (unidades vs. dezenas de
  // recomendação real), então misturar os dois de outro jeito distorceria
  // mais do que ajudaria.
  const { data: clickRows } = await getSupabase().rpc('get_top_rackets_30d', { lim: TOP_NIVEL_CLICKS_POOL })
  const clicksById = new Map(
    ((clickRows as { racket_id: number; cnt: number }[] | null) ?? []).map(r => [r.racket_id, r.cnt])
  )

  consolidated.sort((a, b) =>
    b.cnt - a.cnt || (clicksById.get(b.representative.id) ?? 0) - (clicksById.get(a.representative.id) ?? 0)
  )

  const seenBrands = new Set<string>()
  const result: RacketWithInsights[] = []
  for (const { representative: r } of consolidated) {
    if (result.length >= topN) break
    const brandKey = r.brands?.slug
    if (brandKey) {
      if (seenBrands.has(brandKey)) continue
      seenBrands.add(brandKey)
    }
    result.push(r)
  }
  return result
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

// ── "Melhor custo-benefício" ─────────────────────────────────────────────────
// Corte de preço puro (getRaquetasPorOrcamento) deixava a lista dominada por
// quem tinha mais modelos baratos cadastrados (Pichau: 41% da faixa <=R$850,
// 2026-09). Piso de scoreGeral + teto por marca corrigem isso sem tocar
// getRaquetasPorOrcamento, que /raquetes/ate-1000 usa como filtro de
// orçamento puro — sem promessa de curadoria por qualidade.
const CUSTO_BENEFICIO_MAX_PRICE   = 2000
// Piso crescente por faixa de preço, não um score/preço nem um piso fixo.
// scoreGeral sobe muito pouco com o preço no catálogo real (médias 5.68 em
// R$0-600 -> 6.14 em R$1500-1800, span de 13x em preço pra menos de 0.5 ponto
// de score) — um ratio score/preço ficaria dominado pelo preço e voltaria a
// favorecer o mais barato, o problema original disfarçado. Cada piso abaixo
// fica perto da mediana real daquela faixa (2026-09), exceto R$1301-1700 que
// usa o mesmo SCORE_GERAL_FLOOR (5.8) do carrossel de destacados — a essa
// faixa de preço, exigimos o mesmo padrão que usamos pra recomendar de verdade.
function custoBeneficioFloor(price: number): number {
  if (price <= 850)  return 5.3
  if (price <= 1300) return 5.5
  if (price <= 1700) return SCORE_GERAL_FLOOR // 5.8
  return 6.0
}
// Página de listagem completa, não um carrossel de poucos slots — por isso
// teto 3, não o teto de 1 usado em getTopRaquetas/getNovidadesRaquetas.
const CUSTO_BENEFICIO_BRAND_CAP   = 3

export async function getRaquetasCustoBeneficio(): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .lte('price', CUSTO_BENEFICIO_MAX_PRICE)
    .not('price', 'is', null)
    .order('price') // desempate estável de scoreGeral: entre empatadas, a mais barata primeiro
  if (error) throw new Error(`Supabase: ${error.message}`)

  const candidates = ((data as unknown[]) ?? []).map(normalizeRacket)
    .map(r => ({ racket: r, score: scoreGeral(r.racket_insights) }))
    .filter((c): c is { racket: RacketWithInsights; score: number } =>
      c.score != null && c.racket.price != null && c.score >= custoBeneficioFloor(c.racket.price)
    )
    .sort((a, b) => b.score - a.score)

  const countByBrand = new Map<string, number>()
  const rackets: RacketWithInsights[] = []
  for (const { racket } of candidates) {
    const brandKey = racket.brands?.slug ?? `__no_brand_${racket.id}`
    const used = countByBrand.get(brandKey) ?? 0
    if (used >= CUSTO_BENEFICIO_BRAND_CAP) continue
    countByBrand.set(brandKey, used + 1)
    rackets.push(racket)
  }

  return rackets
}

export async function getRaquetasConforto(): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    .order('name')
  if (error) throw new Error(`Supabase: ${error.message}`)
  const all = ((data as unknown[]) ?? []).map(normalizeRacket)
  return all.filter(r => r.racket_insights?.elbow_friendly === true)
}

const NOVIDADES_MIN = 4
const NOVIDADES_LIMIT = 18
// 100 cobre as ~92 raquetes 2026+ elegíveis hoje com margem. Mesmo assim o
// carrossel entrega no máximo 1 raquete por marca que exista com model_year
// 2026+ e price >= 1500 — hoje são 16 marcas (de 17 no catálogo; Alma Genius
// fica de fora inteira, nenhum modelo dela passa do piso de preço). NÃO
// alcança 18 por falta de marcas elegíveis, não por tamanho de pool — só
// sobe pra 18 se o catálogo somar mais marcas 2026+ acima de R$1.500.
const NOVIDADES_POOL = 100

// Janela de "nova garantida" antes de entrar na disputa por clique — 14 dias,
// decisão de Rodrigo 2026-10-23 (ele deixou 14 ou 21 a meu critério). Dois
// motivos pro 14: (1) é metade da janela de 30d que get_top_rackets_30d já
// usa, então quando uma raquete sai do bucket "fresh" ela ainda está dentro
// da MESMA janela de 30d e já teve ~14-16 dias reais pra acumular clique, em
// vez de entrar no ranking do zero; (2) cobre confortavelmente o intervalo
// típico entre levas de lançamento no catálogo (levas de 2026-08 a 2026-10
// saíram a cada ~5-6 dias de mediana, maior intervalo real foi 26 dias) sem
// segurar uma raquete "nova" na prateleira por tempo demais.
const NOVIDADES_FRESH_WINDOW_DAYS = 14

export async function getNovidadesRaquetas(): Promise<RacketWithInsights[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('publicada', true)
    // >= em vez de = (decisão Rodrigo 2026-10-24): raquetes 2027+ já cadastradas
    // (ex. Aria By Pininfarina, Wolf 2027) também contam como "novidade", não só
    // o ano corrente do título do carrossel — título "Novidades 2026" fica como
    // está de propósito, decisão explícita dele, não é descuido.
    .gte('model_year', 2026)
    .neq('is_active', false)
    .neq('fora_de_linha', true)
    .gte('price', 1500)
    .not('price', 'is', null)
    .order('created_at', { ascending: false })
    .limit(NOVIDADES_POOL)

  if (error) throw new Error(`Supabase: ${error.message}`)
  const candidates = ((data as unknown[]) ?? []).map(normalizeRacket)

  // Híbrido (decisão Rodrigo 2026-10-23): dentro da janela "fresh", mantém
  // ordem por data (visibilidade de lançamento garantida, sem depender de
  // clique que ainda não deu tempo de acontecer). Fora da janela, reordena
  // por clique real dos últimos 30d — mesmo RPC de getTopRaquetas — senão um
  // lançamento antigo nunca mais sobe, mesmo brilhando de verdade.
  const freshCutoffMs = Date.now() - NOVIDADES_FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const isFresh = (r: RacketWithInsights) =>
    r.created_at != null && new Date(r.created_at).getTime() >= freshCutoffMs
  const fresh = candidates.filter(isFresh)
  const aged = candidates.filter(r => !isFresh(r))

  let orderedAged = aged
  if (aged.length > 0) {
    const { data: clickRows } = await supabase.rpc('get_top_rackets_30d', { lim: NOVIDADES_POOL })
    const clicksById = new Map(
      ((clickRows as { racket_id: number; cnt: number }[] | null) ?? []).map(r => [r.racket_id, r.cnt])
    )
    orderedAged = [...aged].sort((a, b) => {
      const clickDiff = (clicksById.get(b.id) ?? 0) - (clicksById.get(a.id) ?? 0)
      if (clickDiff !== 0) return clickDiff
      // Empate de clique (incluindo 0 x 0): mesmo desempate de hoje, mais recente primeiro.
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    })
  }

  const ordered = [...fresh, ...orderedAged]

  // Teto de 1 raquete por marca — evita que uma marca com vários lançamentos
  // recentes ocupe todos os lugares do carrossel (caso que antes exigia
  // excluir Alma Genius na mão; agora resolvido de forma genérica).
  const seenBrands = new Set<string>()
  const rackets: RacketWithInsights[] = []
  for (const r of ordered) {
    const brandKey = r.brands?.slug
    if (brandKey) {
      if (seenBrands.has(brandKey)) continue
      seenBrands.add(brandKey)
    }
    rackets.push(r)
    if (rackets.length >= NOVIDADES_LIMIT) break
  }

  return rackets.length >= NOVIDADES_MIN ? rackets : []
}
