import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { classifyFace, classifyCore } from '@/lib/motor'
import { clasificarNivel } from '@/lib/scorer'
import MotorTable from './MotorTable'

type RawRacket = {
  id: number
  name: string
  slug: string
  face_material: string | null
  core: string | null
  weight_g: number | null
  balance: string | null
  specs_extra: Record<string, unknown> | null
  brands: { name: string } | null
  racket_insights:
    | {
        power: number | null
        control: number | null
        comfort: number | null
        maneuverability: number | null
        stability: number | null
        spin: number | null
        forgiveness: number | null
        overrides: Record<string, { valor: number; motivo: string }> | null
      }
    | {
        power: number | null
        control: number | null
        comfort: number | null
        maneuverability: number | null
        stability: number | null
        spin: number | null
        forgiveness: number | null
        overrides: Record<string, { valor: number; motivo: string }> | null
      }[]
    | null
}

export type MotorRow = {
  id: number
  name: string
  slug: string
  brand: string
  face_material: string | null
  faceGrade: string
  core: string | null
  coreClass: string
  weight_g: number | null
  furos: number | null
  espessura_mm: number | null
  power: number | null
  control: number | null
  comfort: number | null
  maneuverability: number | null
  stability: number | null
  spin: number | null
  forgiveness: number | null
  scoreGeral: number | null
  scoreIni: number | null
  scoreInt: number | null
  scoreAva: number | null
  nivel: 'iniciante' | 'intermediario' | 'avancado' | null
  overrides: string[]
}

export default async function AdminMotorPage() {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const sb = getSupabase()

  const { data, error } = await sb
    .from('rackets')
    .select(`
      id, name, slug, face_material, core, weight_g, balance, specs_extra,
      brands(name),
      racket_insights(power, control, comfort, maneuverability, stability, spin, forgiveness, overrides)
    `)
    .eq('publicada', true)
    .order('name')

  if (error) console.error('[admin/motor] query error:', error.message)

  const rows: MotorRow[] = ((data ?? []) as unknown as RawRacket[]).map(r => {
    const ins = Array.isArray(r.racket_insights)
      ? (r.racket_insights[0] ?? null)
      : r.racket_insights

    const extra = (r.specs_extra ?? {}) as Record<string, unknown>
    const furos = typeof extra.furos === 'number' ? extra.furos : null
    const espessura_mm = typeof extra.espessura_mm === 'number' ? extra.espessura_mm : null

    const overrides: string[] = []
    if (ins?.overrides) {
      for (const [dim, entry] of Object.entries(ins.overrides)) {
        if (!(entry?.motivo ?? '').includes('bulk-heurístico')) {
          overrides.push(dim)
        }
      }
    }

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      brand: r.brands?.name ?? '—',
      face_material: r.face_material,
      faceGrade: classifyFace(r.face_material),
      core: r.core,
      coreClass: classifyCore(r.core),
      weight_g: r.weight_g,
      furos,
      espessura_mm,
      power: ins?.power ?? null,
      control: ins?.control ?? null,
      comfort: ins?.comfort ?? null,
      maneuverability: ins?.maneuverability ?? null,
      stability: ins?.stability ?? null,
      spin: ins?.spin ?? null,
      forgiveness: ins?.forgiveness ?? null,
      scoreGeral: (() => {
        const vals = [ins?.power, ins?.control, ins?.maneuverability, ins?.stability].filter((v): v is number => v != null)
        return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
      })(),
      scoreIni: (() => {
        const pw = ins?.power, ct = ins?.control, cf = ins?.comfort, mn = ins?.maneuverability, st = ins?.stability, fg = ins?.forgiveness
        if (pw == null || ct == null || cf == null || mn == null || st == null || fg == null) return null
        return Math.round((pw*5 + ct*15 + cf*20 + mn*17 + st*18 + fg*25) / 10) / 10
      })(),
      scoreInt: (() => {
        const pw = ins?.power, ct = ins?.control, cf = ins?.comfort, mn = ins?.maneuverability, st = ins?.stability, fg = ins?.forgiveness
        if (pw == null || ct == null || cf == null || mn == null || st == null || fg == null) return null
        return Math.round((pw*12 + ct*25 + cf*12 + mn*15 + st*25 + fg*11) / 10) / 10
      })(),
      scoreAva: (() => {
        const pw = ins?.power, ct = ins?.control, cf = ins?.comfort, mn = ins?.maneuverability, st = ins?.stability, fg = ins?.forgiveness
        if (pw == null || ct == null || cf == null || mn == null || st == null || fg == null) return null
        return Math.round((pw*20 + ct*23 + cf*6 + mn*20 + st*23 + fg*8) / 10) / 10
      })(),
      nivel: (() => {
        const pw = ins?.power, ct = ins?.control, cf = ins?.comfort, mn = ins?.maneuverability, st = ins?.stability, fg = ins?.forgiveness
        if (pw == null || ct == null || cf == null || mn == null || st == null || fg == null) return null
        const sAva = (pw*20 + ct*23 + cf*6 + mn*20 + st*23 + fg*8) / 10
        const sIni = (pw*5  + ct*15 + cf*20 + mn*17 + st*18 + fg*25) / 10
        return clasificarNivel(sAva, sIni)
      })(),
      overrides,
    }
  })

  return <MotorTable rows={rows} />
}
