import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — no se crea hasta la primera llamada (request time, no build time)
let _admin: SupabaseClient | null = null
let _public: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

export function getSupabase(): SupabaseClient {
  if (!_public) {
    _public = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
  }
  return _public
}
