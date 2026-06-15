'use server'

import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { calcularMotor } from '@/lib/motor'
import { revalidatePath } from 'next/cache'

async function assertAdmin(): Promise<string> {
  const session = await auth()
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }
  return session.user.email
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TechEntry { nome: string; tipo: string }

export interface FisicosData {
  face_material: string
  core: string
  weight_g: number | null
  balance: string
  espessura_mm: number | null
  furos: number | null
  superficie: string
  tecnologias: TechEntry[]
}

export type DimKey =
  | 'power' | 'control' | 'comfort' | 'maneuverability'
  | 'stability' | 'spin' | 'forgiveness'

export interface NotaChange {
  dim: DimKey
  value: number
}

export interface EditorialData {
  price: number | null
  publicada: boolean
  destaque_atleta: boolean
  atleta: string
  saida_de_bola: string
  nivel_sugerido: 'iniciante' | 'intermediario' | 'avancado' | null
  summary: string
  perfil_resumo: string
  observations: string[]
  ai_drafted: boolean
  reviewed: boolean
}

// ─── Bloco A: Dados Físicos + recálculo ───────────────────────────────────────

export async function salvarFisicos(slug: string, data: FisicosData) {
  await assertAdmin()
  const sb = getSupabaseAdmin()

  const { data: racket, error } = await sb
    .from('rackets')
    .select('id, specs_extra')
    .eq('slug', slug)
    .single()
  if (error || !racket) throw new Error('Raqueta não encontrada')

  const currentExtra = (racket.specs_extra as Record<string, unknown>) ?? {}
  const newExtra: Record<string, unknown> = {
    ...currentExtra,
    superficie: data.superficie,
    furos: data.furos,
    espessura_mm: data.espessura_mm,
    tecnologias: data.tecnologias,
  }

  await sb.from('rackets').update({
    face_material: data.face_material || null,
    core: data.core || null,
    weight_g: data.weight_g,
    balance: data.balance || null,
    specs_extra: newExtra,
  }).eq('slug', slug)

  // Run motor calculation
  const motorResult = calcularMotor({
    superficie: data.superficie,
    furos: data.furos,
    espessura_mm: data.espessura_mm,
    tecnologias: data.tecnologias,
  })

  // Fetch current insights to respect existing overrides
  const { data: ins } = await sb
    .from('racket_insights')
    .select('overrides, motor_cache')
    .eq('racket_id', racket.id)
    .single()

  const overrides = (ins?.overrides as Record<string, unknown> | null) ?? {}
  const prevCache = (ins?.motor_cache as Record<string, number | null> | null) ?? {}

  const newCache = {
    ...prevCache,
    spin: motorResult.spin,
    comfort: motorResult.comfort,
    stability: motorResult.stability,
  }

  const effectiveUpdates: Record<string, unknown> = { motor_cache: newCache }
  if (!overrides.spin) effectiveUpdates.spin = motorResult.spin
  if (!overrides.comfort) effectiveUpdates.comfort = motorResult.comfort
  if (!overrides.stability) effectiveUpdates.stability = motorResult.stability

  await sb.from('racket_insights').update(effectiveUpdates).eq('racket_id', racket.id)

  revalidatePath(`/admin/rackets/${slug}`)
  revalidatePath(`/raquetes/${slug}`)
  return { ok: true, motor: motorResult }
}

// ─── Bloco B: Note overrides ──────────────────────────────────────────────────

export async function salvarOverrides(slug: string, changes: NotaChange[], motivo: string) {
  const email = await assertAdmin()
  if (!motivo.trim()) throw new Error('Motivo obrigatório')

  const sb = getSupabaseAdmin()
  const { data: racket } = await sb.from('rackets').select('id').eq('slug', slug).single()
  if (!racket) throw new Error('Raqueta não encontrada')

  const { data: ins } = await sb
    .from('racket_insights')
    .select('motor_cache, overrides, power, control, comfort, maneuverability, stability, spin, forgiveness')
    .eq('racket_id', racket.id)
    .single()

  const overrides = { ...((ins?.overrides as Record<string, unknown>) ?? {}) }
  const motorCache = (ins?.motor_cache as Record<string, number | null>) ?? {}
  const effectiveValues: Record<string, number> = {}

  for (const ch of changes) {
    const motorVal =
      motorCache[ch.dim] ??
      ((ins as Record<string, number | null> | null)?.[ch.dim] ?? null)

    overrides[ch.dim] = {
      value: ch.value,
      motivo: motivo.trim(),
      por: email,
      em: new Date().toISOString(),
      motor_at_time: motorVal,
    }
    effectiveValues[ch.dim] = ch.value
  }

  await sb.from('racket_insights').update({
    ...effectiveValues,
    overrides,
    reviewed: true,
  }).eq('racket_id', racket.id)

  revalidatePath(`/admin/rackets/${slug}`)
  revalidatePath(`/raquetes/${slug}`)
  return { ok: true }
}

export async function reverterOverride(slug: string, dim: DimKey) {
  await assertAdmin()
  const sb = getSupabaseAdmin()

  const { data: racket } = await sb.from('rackets').select('id').eq('slug', slug).single()
  if (!racket) throw new Error('Raqueta não encontrada')

  const { data: ins } = await sb
    .from('racket_insights')
    .select('motor_cache, overrides')
    .eq('racket_id', racket.id)
    .single()

  const overrides = { ...((ins?.overrides as Record<string, { motor_at_time?: number | null }>) ?? {}) }
  const motorCache = (ins?.motor_cache as Record<string, number | null>) ?? {}

  const motorVal = overrides[dim]?.motor_at_time ?? motorCache[dim] ?? null
  delete overrides[dim]

  const update: Record<string, unknown> = { overrides }
  if (motorVal != null) update[dim] = motorVal

  await sb.from('racket_insights').update(update).eq('racket_id', racket.id)

  revalidatePath(`/admin/rackets/${slug}`)
  revalidatePath(`/raquetes/${slug}`)
  return { ok: true }
}

// ─── Bloco C: Editorial ────────────────────────────────────────────────────────

export async function salvarEditorial(slug: string, data: EditorialData) {
  await assertAdmin()
  const sb = getSupabaseAdmin()

  const { data: racket } = await sb
    .from('rackets')
    .select('id, specs_extra')
    .eq('slug', slug)
    .single()
  if (!racket) throw new Error('Raqueta não encontrada')

  const currentExtra = (racket.specs_extra as Record<string, unknown>) ?? {}
  const newExtra: Record<string, unknown> = {
    ...currentExtra,
    atleta: data.atleta || undefined,
    saida_de_bola: data.saida_de_bola || undefined,
  }
  // Clean up undefined keys
  Object.keys(newExtra).forEach(k => newExtra[k] === undefined && delete newExtra[k])

  await sb.from('rackets').update({
    price: data.price,
    publicada: data.publicada,
    destaque_atleta: data.destaque_atleta,
    specs_extra: newExtra,
  }).eq('slug', slug)

  await sb.from('racket_insights').update({
    nivel_sugerido: data.nivel_sugerido,
    summary: data.summary || null,
    perfil_resumo: data.perfil_resumo || null,
    observations: data.observations,
    ai_drafted: data.ai_drafted,
    reviewed: data.reviewed,
  }).eq('racket_id', racket.id)

  revalidatePath(`/admin/rackets/${slug}`)
  revalidatePath(`/raquetes/${slug}`)
  revalidatePath('/')
  return { ok: true }
}
