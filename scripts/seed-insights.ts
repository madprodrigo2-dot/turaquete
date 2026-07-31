/**
 * Seed racket_insights para raquetes novas que ainda não têm row.
 * Usage: npx tsx scripts/seed-insights.ts 398 399 400 401 402
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { calcularMotor, MOTOR_DIMS } from '../lib/motor'

const raw = readFileSync('.env.local', 'utf8')
const env: Record<string, string> = {}
raw.split('\n').forEach(l => { const i = l.indexOf('='); if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim() })

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const ids = process.argv.slice(2).map(Number).filter(Boolean)
if (!ids.length) { console.error('Uso: npx tsx scripts/seed-insights.ts <id1> <id2> ...'); process.exit(1) }

async function main() {
  const { data: rackets, error } = await sb
    .from('rackets')
    .select('id, name, slug, face_material, core, weight_g, balance, specs_extra')
    .in('id', ids)

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  let inserted = 0, skipped = 0, errors = 0
  const insertedSlugs: { name: string; slug: string }[] = []

  for (const r of rackets as any[]) {
    const { data: existing } = await sb
      .from('racket_insights')
      .select('racket_id')
      .eq('racket_id', r.id)
      .maybeSingle()

    if (existing) { console.log(`[SKIP] ${r.name} — já tem racket_insights`); skipped++; continue }

    const sx = r.specs_extra ?? {}
    const nv = calcularMotor({
      superficie: sx.superficie,
      furos: sx.furos,
      espessura_mm: sx.espessura_mm,
      tecnologias: sx.tecnologias,
      face_material: r.face_material,
      core: r.core,
      weight_g: r.weight_g,
      balance: r.balance,
    })

    const elbow_friendly =
      nv.comfort >= 8 && nv.saida_de_bola !== 'exigente' ? true
      : nv.comfort <= 3 || nv.saida_de_bola === 'exigente' ? false
      : null

    const dims: Record<string, number> = {}
    for (const dim of MOTOR_DIMS) dims[dim] = nv[dim]

    const { error: e } = await sb.from('racket_insights').insert({
      racket_id: r.id,
      ...dims,
      motor_cache: { ...nv },
      elbow_friendly,
      review_status: 'draft',
      ai_drafted: true,
    })

    if (e) { console.error(`[ERR] ${r.name}: ${e.message}`); errors++ }
    else {
      const vals = MOTOR_DIMS.map(d => `${d}=${nv[d]}`).join(' ')
      console.log(`[OK] ${r.name} — ${vals}`)
      inserted++
      insertedSlugs.push({ name: r.name, slug: r.slug })
    }
  }

  console.log(`\nConcluído: ${inserted} inseridos | ${skipped} já existiam | ${errors} erros`)

  if (insertedSlugs.length > 0) {
    console.log(`\n⚠️  ${insertedSlugs.length} raquete(s) cadastrada(s) SEM perfil_resumo:`)
    for (const { name, slug } of insertedSlugs) {
      console.log(`  - ${slug}  (${name})`)
    }
    console.log('Acesse /admin/rackets/<slug> → aba C para adicionar a descrição.')
  }
}

main()
