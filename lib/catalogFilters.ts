import type { RacketWithInsights } from './recommend'
import { classifyCore, classifyFace } from './motor'
import { derivarNivel } from './nivel'

// ── Cor ──────────────────────────────────────────────────────────────────────
// 14 categorias gravadas em rackets.specs_extra.cor (array). `bg` é um valor CSS
// de background (hex ou gradiente) para o swatch.
export const COR_SWATCHES = [
  { key: 'preto',      label: 'Preto',      bg: '#1A1A1A' },
  { key: 'branco',     label: 'Branco',     bg: '#FFFFFF' },
  { key: 'azul',       label: 'Azul',       bg: '#2563EB' },
  { key: 'vermelho',   label: 'Vermelho',   bg: '#DC2626' },
  { key: 'rosa',       label: 'Rosa',       bg: '#F472B6' },
  { key: 'roxo',       label: 'Roxo',       bg: '#7C3AED' },
  { key: 'verde',      label: 'Verde',      bg: '#16A34A' },
  { key: 'amarelo',    label: 'Amarelo',    bg: '#FACC15' },
  { key: 'laranja',    label: 'Laranja',    bg: '#F97316' },
  { key: 'dourado',    label: 'Dourado',    bg: 'linear-gradient(135deg,#F3D675 0%,#C9A227 50%,#9A7712 100%)' },
  { key: 'prateado',   label: 'Prateado',   bg: 'linear-gradient(135deg,#F1F3F5 0%,#B8BEC6 50%,#8A9099 100%)' },
  { key: 'cinza',      label: 'Cinza',      bg: '#9CA3AF' },
  { key: 'marrom',     label: 'Marrom',     bg: '#78502D' },
  { key: 'multicolor', label: 'Multicolor', bg: 'conic-gradient(#EF4444,#F59E0B,#FACC15,#22C55E,#3B82F6,#8B5CF6,#EC4899,#EF4444)' },
] as const

export type CorKey = (typeof COR_SWATCHES)[number]['key']

function coresDe(r: RacketWithInsights): string[] {
  const c = r.specs_extra?.cor
  return Array.isArray(c) ? (c as unknown[]).filter((x): x is string => typeof x === 'string') : []
}

// ── Opções dos filtros avançados ─────────────────────────────────────────────
export interface Opcao { key: string; label: string }

export const NIVEL_OPCOES: Opcao[] = [
  { key: 'iniciante',     label: 'Iniciante' },
  { key: 'intermediario', label: 'Intermediário' },
  { key: 'avancado',      label: 'Avançado' },
]

export const NUCLEO_OPCOES: Opcao[] = [
  { key: 'SUPERSOFT', label: 'Supersoft' },
  { key: 'SOFT',      label: 'Soft' },
  { key: 'MEDIUM',    label: 'Medium' },
  { key: 'HARD',      label: 'Hard' },
]

// Agrupa os FaceGrade de classifyFace() em buckets de consumidor.
// 12K–16K (a 2ª face mais comum do catálogo) fica em "6K–16K".
const FACE_GRUPOS: Array<Opcao & { grades: string[] }> = [
  { key: 'c3k',    label: 'Carbono 3K',        grades: ['CARBON_3K', 'CARBON_3K_METAL', 'CARBON_1K'] },
  { key: 'c6k',    label: 'Carbono 6K–16K',    grades: ['CARBON_6K', 'CARBON_6K_15K'] },
  { key: 'c18k',   label: 'Carbono 18K',       grades: ['CARBON_18K'] },
  { key: 'c24k',   label: 'Carbono 24K',       grades: ['CARBON_24K'] },
  { key: 'kevlar', label: 'Kevlar',            grades: ['KEVLAR_PURE', 'KEVLAR_CARBON'] },
  { key: 'hibrido', label: 'Híbrido / Fibra de vidro', grades: ['HYBRID_VIDRO', 'VIDRO'] },
]
export const FACE_OPCOES: Opcao[] = FACE_GRUPOS.map(({ key, label }) => ({ key, label }))

export const ESPESSURA_OPCOES: Opcao[] = [
  { key: 'fina',   label: 'Até 20mm' },
  { key: 'media',  label: '21–22mm' },
  { key: 'grossa', label: '23mm ou mais' },
]

// Cortes calibrados na distribuição real do catálogo (308–345g, moda 320g):
// ≤320 (~120) · 321–329 (~60) · ≥330 (~55).
export const PESO_OPCOES: Opcao[] = [
  { key: 'leve',   label: 'Leve (até 320g)' },
  { key: 'media',  label: 'Média (321–329g)' },
  { key: 'pesada', label: 'Pesada (330g+)' },
]

export const BALANCE_OPCOES: Opcao[] = [
  { key: 'medio',   label: 'Médio' },
  { key: 'cabeca',  label: 'Pesada p/ cabeça' },
  { key: 'cabo',    label: 'Leve p/ cabo' },
]

// ── Classificadores por raquete (null = sem dado → não casa com o filtro) ────
function espessuraKey(r: RacketWithInsights): string | null {
  const e = r.specs_extra?.espessura_mm
  if (typeof e !== 'number') return null
  return e <= 20 ? 'fina' : e <= 22 ? 'media' : 'grossa'
}

function pesoKey(r: RacketWithInsights): string | null {
  const w = r.weight_g
  if (w == null) return null
  return w <= 320 ? 'leve' : w <= 329 ? 'media' : 'pesada'
}

function balanceKey(r: RacketWithInsights): string | null {
  const b = (r.balance ?? '').toLowerCase()
  if (!b) return null
  if (b.includes('cabe')) return 'cabeca'
  if (b.includes('cabo')) return 'cabo'
  if (b.includes('médio') || b.includes('medio')) return 'medio'
  return null
}

function faceKey(r: RacketWithInsights): string | null {
  if (!r.face_material) return null
  const grade = classifyFace(r.face_material)
  return FACE_GRUPOS.find(g => g.grades.includes(grade))?.key ?? null
}

function nucleoKey(r: RacketWithInsights): string | null {
  return r.core ? classifyCore(r.core) : null
}

// ── Estado + aplicação ───────────────────────────────────────────────────────
export interface CatalogFilterState {
  cores: string[]          // multi-seleção (OU entre cores)
  nivel: string | null
  nucleo: string | null
  face: string | null
  espessura: string | null
  peso: string | null
  balance: string | null
}

export const EMPTY_CATALOG_FILTERS: CatalogFilterState = {
  cores: [], nivel: null, nucleo: null, face: null, espessura: null, peso: null, balance: null,
}

export type AdvancedKey = Exclude<keyof CatalogFilterState, 'cores'>

export function countAdvanced(s: CatalogFilterState): number {
  return [s.nivel, s.nucleo, s.face, s.espessura, s.peso, s.balance].filter(Boolean).length
}

export function hasCatalogFilter(s: CatalogFilterState): boolean {
  return s.cores.length > 0 || countAdvanced(s) > 0
}

const ADV_GETTERS: Record<AdvancedKey, (r: RacketWithInsights) => string | null> = {
  nivel:     r => derivarNivel(r),
  nucleo:    nucleoKey,
  face:      faceKey,
  espessura: espessuraKey,
  peso:      pesoKey,
  balance:   balanceKey,
}

// Chaves disponíveis por grupo no conjunto atual — evita opções sem resultado.
export function availability(rackets: RacketWithInsights[]) {
  const adv: Record<AdvancedKey, Set<string>> = {
    nivel: new Set(), nucleo: new Set(), face: new Set(), espessura: new Set(), peso: new Set(), balance: new Set(),
  }
  const cores = new Set<string>()
  for (const r of rackets) {
    for (const c of coresDe(r)) cores.add(c)
    for (const k of Object.keys(adv) as AdvancedKey[]) {
      const v = ADV_GETTERS[k](r)
      if (v) adv[k].add(v)
    }
  }
  return { cores, adv }
}

export function applyCatalogFilters(rackets: RacketWithInsights[], s: CatalogFilterState): RacketWithInsights[] {
  let out = rackets
  if (s.cores.length > 0) {
    out = out.filter(r => coresDe(r).some(c => s.cores.includes(c)))
  }
  for (const k of Object.keys(ADV_GETTERS) as AdvancedKey[]) {
    const want = s[k]
    if (want) out = out.filter(r => ADV_GETTERS[k](r) === want)
  }
  return out
}
