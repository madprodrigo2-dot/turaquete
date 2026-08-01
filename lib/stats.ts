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
export async function getRecsCount(): Promise<number> {
  try {
    const { data } = await getSupabaseAdmin()
      .rpc('admin_cost_by_session', {
        cutoff_at: new Date(Date.now() - 3650 * 86_400_000).toISOString(),
        p_include_test: false,
      })
    const sessions = (data || []) as { had_rec: boolean }[]
    return sessions.filter(s => s.had_rec).length
  } catch {
    return 0
  }
}
