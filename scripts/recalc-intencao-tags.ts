/**
 * Retroactive recalculation of intencao_tags for sessions since 2026-07-01.
 * Parses messages JSONB to extract nivel/lesao/estilo.
 * Sets confirmed_profile_source = 'parsed' to distinguish from live-captured data.
 * sem_match is NOT retroactively inferred (no record exists).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (no dotenv dep needed)
const envPath = resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ── Chip detection maps ────────────────────────────────────────────────────

const NIVEL_MAP: Record<string, string> = {
  // Chips atuais
  'Estou começando (cat. E/D)': 'iniciante',
  'Intermediário (cat. C/B)':   'intermediario',
  'Avançado (cat. A/Pro)':      'avancado',
  // Chips antigos (fallback histórico)
  'Intermediário (cat. C)':     'intermediario',
  'Avançado (cat. B ou acima)': 'avancado',
}

const ESTILO_MAP: Record<string, string> = {
  'Ataque (potência, smash)': 'ofensivo',
  'Defesa e controle':        'defensivo',
  'Equilibrado':              'misto',
}

const LESAO_FALSE_PATTERNS = ['Não tenho dor', 'Sem dor', 'Nao tenho dor']
const LESAO_TRUE_PARTS  = ['Ombro', 'Cotovelo', 'Punho']

function parseProfile(messages: Array<{ role: string; content?: string }>) {
  const userMsgs = messages.filter(m => m.role === 'user').map(m => m.content ?? '')

  let nivel: string | undefined
  let lesao: boolean | undefined
  let estilo: string | undefined
  let verMaisCount = 0

  for (const msg of userMsgs) {
    const t = msg.trim()
    if (!nivel && NIVEL_MAP[t])   nivel  = NIVEL_MAP[t]
    if (!estilo && ESTILO_MAP[t]) estilo = ESTILO_MAP[t]
    if (lesao === undefined) {
      if (LESAO_FALSE_PATTERNS.some(p => t.includes(p))) lesao = false
      else if (LESAO_TRUE_PARTS.some(p => t.includes(p))) lesao = true
    }
    if (t === 'Ver mais opções') verMaisCount++
  }

  return { nivel, lesao, estilo, verMaisCount }
}

function computeTags(opts: {
  nivel?: string
  lesao?: boolean
  orcamentoMin?: number | null
  verMaisCount?: number
}): string[] {
  const { nivel, lesao, orcamentoMin, verMaisCount = 0 } = opts
  const isLesao = lesao === true
  const principal = isLesao ? 'resolver_dor'
    : nivel === 'iniciante' ? 'primeira_raquete'
    : (nivel === 'intermediario' || nivel === 'avancado') ? 'upgrade_tecnico'
    : 'indefinido'

  const tags = [principal]
  if ((orcamentoMin ?? 0) >= 2000) tags.push('ticket_alto')
  if (verMaisCount >= 2) tags.push('indeciso')
  return tags
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching sessions since 2026-07-01 without intencao_tags...')

  // Fetch ALL rows since Jul 1 — full recalc (not just IS NULL)
  const { data: rows, error } = await sb
    .from('conversations')
    .select('id, session_id, messages, profile, created_at')
    .gte('created_at', '2026-07-01T00:00:00Z')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }
  if (!rows?.length) { console.log('No rows to update.'); return }

  // Dedupe: latest row per session
  const sessionMap = new Map<string, typeof rows[0]>()
  for (const r of rows) {
    if (!sessionMap.has(r.session_id)) sessionMap.set(r.session_id, r)
  }
  console.log(`Found ${sessionMap.size} unique sessions to recalculate.`)

  let updated = 0, skipped = 0

  for (const [sessionId, row] of sessionMap) {
    const msgs: Array<{ role: string; content?: string }> = Array.isArray(row.messages) ? row.messages : []
    const { nivel, lesao, estilo, verMaisCount } = parseProfile(msgs)

    // Skip only if absolutely nothing is parseable (empty messages)
    if (!nivel && lesao === undefined && !estilo && verMaisCount === 0) { skipped++; continue }

    const profile = (row.profile ?? {}) as Record<string, unknown>
    const orcamentoMin = profile.orcamento_min as number | null | undefined

    const intencao_tags = computeTags({ nivel, lesao, orcamentoMin, verMaisCount })
    const confirmed_profile = {
      ...(nivel  ? { nivel }  : {}),
      ...(estilo ? { estilo } : {}),
      ...(lesao === true  ? { ombro_sensivel: true }  : {}),
      ...(lesao === false ? { ombro_sensivel: false } : {}),
    }

    // Full recalc: update regardless of existing intencao_tags value
    const { error: upErr } = await sb
      .from('conversations')
      .update({
        intencao_tags,
        confirmed_profile,
        confirmed_profile_source: 'parsed',
      })
      .eq('session_id', sessionId)

    if (upErr) {
      console.error(`  ❌ ${sessionId}: ${upErr.message}`)
    } else {
      updated++
      if (updated % 50 === 0) console.log(`  ✓ ${updated} sessions updated...`)
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (no profile data): ${skipped}`)

  // Distribution summary (fallback query — simple enough for Supabase client)
  const dist = null
  if (!dist) {
    // Fallback: manual query
    const { data: tags } = await sb
      .from('conversations')
      .select('intencao_tags')
      .gte('created_at', '2026-07-01T00:00:00Z')
      .not('intencao_tags', 'is', null)
      .limit(5000)

    if (tags) {
      const counter = new Map<string, number>()
      for (const row of tags) {
        const arr = row.intencao_tags as string[] | null
        if (!arr) continue
        const key = arr.join(', ')
        counter.set(key, (counter.get(key) ?? 0) + 1)
      }
      console.log('\nDistribution (tag combination → count):')
      ;[...counter.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}× [${k}]`))
    }
  }
}

main().catch(console.error)
