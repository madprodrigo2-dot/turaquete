/**
 * Calcula e grava grips.recomendado_para pra grips que tenham tipo + espessura_mm.
 * Regra documentada em lib/gripRecomendacao.ts — nunca estima o que falta: se
 * tipo ou espessura_mm forem null, o campo fica null (não roda pela metade).
 *
 * Uso: npx tsx scripts/seed-grip-recomendacao.ts            (catálogo inteiro)
 *      npx tsx scripts/seed-grip-recomendacao.ts 1 3 7       (só esses ids)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { buildRecomendadoPara } from '../lib/gripRecomendacao'

const raw = readFileSync('.env.local', 'utf8')
const env: Record<string, string> = {}
raw.split('\n').forEach(l => { const i = l.indexOf('='); if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim() })

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const ids = process.argv.slice(2).map(Number).filter(Boolean)

async function main() {
  let query = sb.from('grips').select('id, name, tipo, espessura_mm, recomendado_para')
  if (ids.length) query = query.in('id', ids)
  const { data: grips, error } = await query

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  let updated = 0, cleared = 0, unchanged = 0, errors = 0

  for (const g of grips as any[]) {
    const value = buildRecomendadoPara({ tipo: g.tipo, espessura_mm: g.espessura_mm })

    if (value === g.recomendado_para) { unchanged++; continue }

    const { error: e } = await sb.from('grips').update({ recomendado_para: value }).eq('id', g.id)
    if (e) { console.error(`[ERRO] ${g.name}: ${e.message}`); errors++; continue }

    if (value) { console.log(`[OK] ${g.name} → "${value}"`); updated++ }
    else { console.log(`[NULL] ${g.name} — sem tipo e/ou espessura_mm`); cleared++ }
  }

  console.log(`\n${updated} atualizados, ${cleared} limpos (null), ${unchanged} sem mudança, ${errors} erros.`)
}

main()
