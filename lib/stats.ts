import { getSupabaseAdmin } from './supabase'

export async function getPublishedRacketCount(): Promise<number> {
  try {
    const { count } = await getSupabaseAdmin()
      .from('rackets')
      .select('id', { count: 'exact', head: true })
      .eq('publicada', true)
    return count ?? 0
  } catch {
    return 0
  }
}

// Returns total sessions (all time) that reached a racket recommendation.
// Used server-side only — never exposed to client.
//
// Uses admin_recs_count (aggregates in SQL), not admin_cost_by_session (which
// returns 1 row per session, for the /admin/analise cost breakdown — needed
// there, but counting sessions.length client-side on it silently caps at
// PostgREST's default 1000-row response limit once total sessions pass 1000).
export async function getRecsCount(): Promise<number> {
  try {
    const { data } = await getSupabaseAdmin()
      .rpc('admin_recs_count', {
        cutoff_at: new Date(Date.now() - 3650 * 86_400_000).toISOString(),
        p_include_test: false,
      })
    return Number(data) || 0
  } catch {
    return 0
  }
}
