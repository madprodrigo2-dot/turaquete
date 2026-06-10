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
  racket_insights: Insights | null
}

export interface RecommendedRacket {
  racket: RacketWithInsights
  razao: string
}

const SELECT_FIELDS = `
  id, name, slug, model_year, weight_g, balance, format,
  face_material, core, price, currency, affiliate_url, source_url, image_url, technologies,
  racket_insights (
    power, control, comfort, maneuverability, stability, spin, forgiveness,
    good_for_beginners, good_for_intermediate, good_for_advanced,
    elbow_friendly, shoulder_friendly, observations, summary
  )
`.trim()

export async function buscarRaquetas(filtros: RacketFilters): Promise<RacketWithInsights[]> {
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

  let results = (data as unknown as RacketWithInsights[]) ?? []

  // Filtros sobre tabla relacionada se aplican en JS
  if (filtros.nivel === 'iniciante') {
    results = results.filter(r => r.racket_insights?.good_for_beginners)
  } else if (filtros.nivel === 'intermediario') {
    results = results.filter(r => r.racket_insights?.good_for_intermediate)
  } else if (filtros.nivel === 'avancado') {
    results = results.filter(r => r.racket_insights?.good_for_advanced)
  }

  if (filtros.cotovelo_sensivel) {
    results = results.filter(r => r.racket_insights?.elbow_friendly)
  }
  if (filtros.ombro_sensivel) {
    results = results.filter(r => r.racket_insights?.shoulder_friendly)
  }

  // Ordenar por prioridade dentro del resultado filtrado
  if (filtros.prioridade === 'potencia') {
    results.sort((a, b) => (b.racket_insights?.power ?? 0) - (a.racket_insights?.power ?? 0))
  } else if (filtros.prioridade === 'controle') {
    results.sort((a, b) => (b.racket_insights?.control ?? 0) - (a.racket_insights?.control ?? 0))
  } else if (filtros.prioridade === 'defesa') {
    results.sort((a, b) => (b.racket_insights?.maneuverability ?? 0) - (a.racket_insights?.maneuverability ?? 0))
  } else if (filtros.prioridade === 'equilibrio') {
    results.sort((a, b) => {
      const scoreB = ((b.racket_insights?.power ?? 0) + (b.racket_insights?.control ?? 0)) / 2
      const scoreA = ((a.racket_insights?.power ?? 0) + (a.racket_insights?.control ?? 0)) / 2
      return scoreB - scoreA
    })
  }

  return results
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

export async function listarMarcas(): Promise<Brand[]> {
  const { data, error } = await getSupabase()
    .from('brands')
    .select('id, name, slug, country, website, status')
    .order('status')   // disponivel primero, depois em_breve
    .order('name')

  if (error) throw new Error(`Supabase: ${error.message}`)
  return (data as Brand[]) ?? []
}
