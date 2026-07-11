/**
 * Motor recalc — fonte única de verdade: importa lib/motor.ts diretamente.
 * Nunca diverge do motor de produção.
 *
 * Usage: npx tsx scripts/recalc-motor-v4.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { calcularMotor, MOTOR_DIMS } from '../lib/motor'

const raw = readFileSync('.env.local', 'utf8')
const env: Record<string, string> = {}
raw.split('\n').forEach(l => { const i = l.indexOf('='); if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim() })

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: rackets, error } = await sb
    .from('rackets')
    .select(`id, name, slug, face_material, core, weight_g, balance, specs_extra,
      racket_insights(${MOTOR_DIMS.join(',')}, overrides, motor_cache)`)
    .eq('publicada', true)
    .order('name')

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  let updated = 0, errors = 0
  const changed: string[] = []

  for (const r of rackets as any[]) {
    const ins = Array.isArray(r.racket_insights) ? r.racket_insights[0] : r.racket_insights
    if (!ins) { console.log(`[SKIP] ${r.name} — sem racket_insights`); continue }

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

    const ovr = ins.overrides ?? {}
    const effective: Record<string, number> = {}
    for (const dim of MOTOR_DIMS) {
      effective[dim] = dim in ovr ? (ovr[dim]?.valor ?? nv[dim]) : nv[dim]
    }

    // elbow_friendly: true se comfort>=8 e saída não exigente, false se comfort<=3 ou exigente, null caso contrário
    const elbow_friendly =
      effective.comfort >= 8 && nv.saida_de_bola !== 'exigente' ? true
      : effective.comfort <= 3 || nv.saida_de_bola === 'exigente' ? false
      : null

    const deltas = MOTOR_DIMS.filter(d => ins[d] !== effective[d])
    if (deltas.length > 0) {
      changed.push(`${r.name}: ${deltas.map((d: string) => `${d} ${ins[d]}→${effective[d]}`).join(', ')}`)
    }

    const { error: e } = await sb.from('racket_insights').update({
      ...effective,
      motor_cache: { ...nv },
      elbow_friendly,
    }).eq('racket_id', r.id)

    if (e) { console.error(`[ERR] ${r.name}: ${e.message}`); errors++ }
    else updated++
  }

  console.log(`\nConcluído: ${updated} OK | ${errors} erros`)
  console.log(`Com mudanças: ${changed.length}`)
  if (changed.length) console.log(changed.map((l: string) => `  ${l}`).join('\n'))
}

main()
