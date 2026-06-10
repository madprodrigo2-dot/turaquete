import { getSupabase } from './supabase'

export interface RacketFilters {
  nivel?: 'iniciante' | 'intermediario' | 'avancado'
  presupuesto_max?: number
  prioridade?: 'potencia' | 'controle' | 'equilibrio' | 'defesa'
  cotovelo_sensivel?: boolean
  ombro_sensivel?: boolean
}

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
  racket_insights: Insights | null
}

export interface RecommendedRacket {
  racket: RacketWithInsights
  razao: string
}

const SELECT_FIELDS = `
  id, name, slug, model_year, weight_g, balance, format,
  face_material, core, price, currency, affiliate_url, source_url, image_url, technologies,
  specs_extra,
  racket_insights (
    power, control, comfort, maneuverability, stability, spin, forgiveness,
    good_for_beginners, good_for_intermediate, good_for_advanced,
    elbow_friendly, shoulder_friendly, observations, summary,
    perfil_resumo, nivel_sugerido, confianca
  )
`.trim()

export interface BuscarResult {
  raquetes: RacketWithInsights[]
  criteriosRelaxados: string[]
}

export async function buscarRaquetas(filtros: RacketFilters): Promise<BuscarResult> {
  // Hard constraints in SQL — never relaxed
  let query = getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('is_active', true)
    .order('name')

  if (filtros.presupuesto_max) {
    query = query.lte('price', filtros.presupuesto_max)
  }

  const { data, error } = await query.limit(30)
  if (error) throw new Error(`Supabase: ${error.message}`)

  const allCandidates = (data as unknown as RacketWithInsights[]) ?? []
  const criteriosRelaxados: string[] = []
  let results = [...allCandidates]

  // Soft filter: nivel — prefer nivel_sugerido (new field), fall back to good_for_* booleans
  if (filtros.nivel && results.length > 0) {
    let filtered: RacketWithInsights[] = []

    const hasNivelSugerido = results.some(r => r.racket_insights?.nivel_sugerido != null)
    if (hasNivelSugerido) {
      filtered = results.filter(r => r.racket_insights?.nivel_sugerido === filtros.nivel)
    } else {
      if (filtros.nivel === 'iniciante') {
        filtered = results.filter(r => r.racket_insights?.good_for_beginners === true)
      } else if (filtros.nivel === 'intermediario') {
        filtered = results.filter(r => r.racket_insights?.good_for_intermediate === true)
      } else if (filtros.nivel === 'avancado') {
        filtered = results.filter(r => r.racket_insights?.good_for_advanced === true)
      }
    }

    if (filtered.length >= 2) {
      results = filtered
    } else {
      const motivo = filtered.length === 0 ? 'dados ausentes ou sem correspondência' : `apenas ${filtered.length} resultado`
      criteriosRelaxados.push(`nível "${filtros.nivel}" não aplicado (${motivo}) — retornando todos os candidatos dentro do orçamento`)
    }
  }

  // Soft filter: cotovelo — relax if < 2 results would remain
  if (filtros.cotovelo_sensivel && results.length > 0) {
    const filtered = results.filter(r => r.racket_insights?.elbow_friendly === true)
    if (filtered.length >= 2) {
      results = filtered
    } else {
      const motivo = filtered.length === 0 ? 'dados ausentes' : `apenas ${filtered.length} resultado`
      criteriosRelaxados.push(`cotovelo sensível não aplicado (${motivo}) — avalie peso e material no raciocínio`)
    }
  }

  // Soft filter: ombro — relax if < 2 results would remain
  if (filtros.ombro_sensivel && results.length > 0) {
    const filtered = results.filter(r => r.racket_insights?.shoulder_friendly === true)
    if (filtered.length >= 2) {
      results = filtered
    } else {
      const motivo = filtered.length === 0 ? 'dados ausentes' : `apenas ${filtered.length} resultado`
      criteriosRelaxados.push(`ombro sensível não aplicado (${motivo}) — avalie peso e balance no raciocínio`)
    }
  }

  // Pain mode: sort by comfort desc (+ stability as tiebreaker) — overrides prioridade
  const painMode = filtros.cotovelo_sensivel || filtros.ombro_sensivel
  if (painMode) {
    results = [...results].sort((a, b) => {
      const ca = a.racket_insights?.comfort ?? 0
      const cb = b.racket_insights?.comfort ?? 0
      if (cb !== ca) return cb - ca
      return (b.racket_insights?.stability ?? 0) - (a.racket_insights?.stability ?? 0)
    })
  } else if (filtros.prioridade) {
    const score = (r: RacketWithInsights): number => {
      switch (filtros.prioridade) {
        case 'potencia':   return r.racket_insights?.power ?? 0
        case 'controle':   return r.racket_insights?.control ?? 0
        case 'defesa':     return r.racket_insights?.maneuverability ?? 0
        case 'equilibrio': return ((r.racket_insights?.power ?? 0) + (r.racket_insights?.control ?? 0)) / 2
        default:           return 0
      }
    }
    results = [...results].sort((a, b) => score(b) - score(a))
  }

  return { raquetes: results, criteriosRelaxados }
}

export async function detalleRaqueta(id: number): Promise<RacketWithInsights | null> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .single()

  if (error) return null
  return data as unknown as RacketWithInsights
}

export async function listarRaquetas(): Promise<RacketWithInsights[]> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return (data as unknown as RacketWithInsights[]) ?? []
}

export async function getRaquetasByIds(ids: number[]): Promise<RacketWithInsights[]> {
  if (ids.length === 0) return []
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .in('id', ids)

  if (error) throw new Error(`Supabase: ${error.message}`)
  return (data as unknown as RacketWithInsights[]) ?? []
}

export interface Brand {
  id: number
  name: string
  slug: string
  country: string | null
  website: string | null
  status: 'disponivel' | 'em_breve'
}

export async function getRaquetaPorSlug(slug: string): Promise<RacketWithInsights | null> {
  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) return null
  return data as unknown as RacketWithInsights
}

export async function listarRaquetasPorMarca(
  brandSlug: string
): Promise<{ brand: Brand; rackets: RacketWithInsights[] } | null> {
  const { data: brandData, error: brandError } = await getSupabase()
    .from('brands')
    .select('id, name, slug, country, website, status')
    .eq('slug', brandSlug)
    .single()

  if (brandError || !brandData) return null

  const { data, error } = await getSupabase()
    .from('rackets')
    .select(SELECT_FIELDS)
    .eq('brand_id', (brandData as { id: number }).id)
    .eq('is_active', true)
    .order('price')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return {
    brand: brandData as Brand,
    rackets: (data as unknown as RacketWithInsights[]) ?? [],
  }
}

export async function listarMarcas(): Promise<Brand[]> {
  const { data, error } = await getSupabase()
    .from('brands')
    .select('id, name, slug, country, website, status')
    .order('status')   // disponivel primero, depois em_breve
    .order('name')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return (data as Brand[]) ?? []
}
