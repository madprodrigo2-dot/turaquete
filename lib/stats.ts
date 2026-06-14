import { getSupabaseAdmin } from './supabase'

// Returns total sessions (all time) that reached a racket recommendation.
// Used server-side only — never exposed to client.
export async function getRecsCount(): Promise<number> {
  try {
    const { data } = await getSupabaseAdmin()
      .rpc('admin_cost_by_session', { days_back: 3650 })
    const sessions = (data || []) as { had_rec: boolean }[]
    return sessions.filter(s => s.had_rec).length
  } catch {
    return 0
  }
}
