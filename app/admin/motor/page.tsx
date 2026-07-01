import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { classifyFace, classifyCore } from '@/lib/motor'
import { scoreForNivel, scoreForProfile } from '@/lib/scorer'
import MotorTable from './MotorTable'

type RawRacket = {
  id: number
  name: string
  slug: string
  face_material: string | null
  core: string | null
  weight_g: number | null
  balance: string | null
  thickness_mm: string | number | null
  price: number | null
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
        nivel_sugerido: string | null
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
        nivel_sugerido: string | null
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
  scoreIntPot: number | null
  scoreIntDef: number | null
  scorePot: number | null
  scoreDef: number | null
  scoreLesao: number | null
  nivel: 'iniciante' | 'intermediario' | 'avancado' | null
  price: number | null
  overrides: string[]
  antivib: number
  estrutural: number
}

export default async function AdminMotorPage() {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const sb = getSupabase()

  const { data, error } = await sb
    .from('rackets')
    .select(`
      id, name, slug, face_material, core, weight_g, balance, thickness_mm, price, specs_extra,
      brands(name),
      racket_insights(power, control, comfort, maneuverability, stability, spin, forgiveness, nivel_sugerido, overrides)
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
    const espessura_mm =
      typeof extra.espessura_mm === 'number' ? extra.espessura_mm :
      r.thickness_mm != null ? Number(r.thickness_mm) :
      null

    const overrides: string[] = []
    if (ins?.overrides) {
      for (const [dim, entry] of Object.entries(ins.overrides)) {
        if (!(entry?.motivo ?? '').includes('bulk-heurístico')) {
          overrides.push(dim)
        }
      }
    }

    const techs = Array.isArray(extra.tecnologias) ? (extra.tecnologias as { tipo: string }[]) : []
    const antivib   = techs.filter(t => t.tipo === 'antivibracao' || t.tipo === 'antivibração').length
    const estrutural = techs.filter(t => t.tipo === 'estrutural').length

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
      scoreIni: scoreForNivel(ins ?? null, 'iniciante'),
      scoreInt: scoreForNivel(ins ?? null, 'intermediario'),
      scoreAva: scoreForNivel(ins ?? null, 'avancado'),
      scoreIntPot: scoreForProfile(ins ?? null, { nivel: 'intermediario', prioridade: 'potencia' }),
      scoreIntDef: scoreForProfile(ins ?? null, { nivel: 'intermediario', prioridade: 'defesa' }),
      scorePot: scoreForProfile(ins ?? null, { nivel: 'avancado', prioridade: 'potencia' }),
      scoreDef: scoreForProfile(ins ?? null, { nivel: 'avancado', prioridade: 'defesa' }),
      scoreLesao: scoreForProfile(ins ?? null, { cotovelo_sensivel: true }),
      nivel: (ins?.nivel_sugerido as 'iniciante' | 'intermediario' | 'avancado' | null) ?? null,
      price: r.price ?? null,
      overrides,
      antivib,
      estrutural,
    }
  })

  return <MotorTable rows={rows} />
}
