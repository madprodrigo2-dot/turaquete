import { RacketWithInsights } from '@/lib/recommend'
import { derivarNivel } from '@/lib/nivel'
import TermoGlossario from './TermoGlossario'
import type { GlossarioEntry } from '@/lib/glossario'

const ADJUSTABLE: Record<string, GlossarioEntry> = {
  'Peso': {
    termo: 'Peso — ajustável',
    definicao: 'Valor de fábrica (varia ±10g entre unidades). Dá pra aumentar adicionando fitas de peso no cabo (mais controle e agilidade) ou na cabeça (mais potência).',
  },
  'Balance': {
    termo: 'Balance — ajustável',
    definicao: 'Valor de referência (pode variar entre unidades de fábrica). Dá pra ajustar adicionando peso: no cabo deixa mais ágil e com mais controle; na cabeça dá mais potência.',
  },
  'Superfície': {
    termo: 'Superfície — ajustável',
    definicao: 'Estado de fábrica. Dá pra aumentar o spin com tratamento areado numa loja especializada (custo baixo, não altera estrutura).',
  },
}

function cap(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

export const NIVEL_LABEL: Record<string, string> = {
  iniciante:    'De iniciante a avançado',
  intermediario: 'A partir de intermediário',
  avancado:     'Jogadores experientes',
}

export interface SpecRow { label: string; value: string; tipo?: string }

export function buildSpecRows(racket: RacketWithInsights): SpecRow[] {
  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>

  const espessuraMm = extra.espessura_mm as number | null | undefined
  const espessuraLegacy = extra.espessura as string | number | undefined
  const espessuraStr = (() => {
    if (espessuraMm != null) {
      const perfil = espessuraMm <= 20 ? 'fino' : espessuraMm <= 22 ? 'médio' : 'grosso'
      return `${espessuraMm}mm · perfil ${perfil}`
    }
    if (espessuraLegacy != null) {
      return String(espessuraLegacy).includes('mm') ? String(espessuraLegacy) : `${espessuraLegacy}mm`
    }
    return undefined
  })()

  const furos = (extra.furos ?? extra.furos_quantidade) as number | string | undefined

  const textura = extra.textura as string | undefined
  const tratamentoFabrica = extra.tratamento_fabrica
  let superficieValue: string | undefined
  if (textura != null || tratamentoFabrica != null) {
    const tex = textura ? cap(textura) : null
    if (tratamentoFabrica === false) {
      superficieValue = tex ? `${tex}, sem tratamento de fábrica` : 'Lisa, sem tratamento de fábrica'
    } else if (tratamentoFabrica === true) {
      superficieValue = tex ? `${tex}, com tratamento de fábrica` : 'Com tratamento de fábrica'
    } else {
      superficieValue = tex ?? undefined
    }
  }

  const formatoCabeca = racket.format ?? (extra.formato_cabeca as string | undefined)

  const athlete = extra.atleta as string | undefined
  const athleteLabel = athlete
    ? (athlete.includes('(') ? athlete.split('(')[0].trim() : athlete.trim())
    : undefined

  interface TechEntry { nome: string; tipo: string }
  const tecnosEstruturadas = extra.tecnologias as TechEntry[] | undefined

  let techFisicasRow: SpecRow | null = null
  let techErgonomiaRow: SpecRow | null = null
  let techDeclarativasRow: SpecRow | null = null

  if (Array.isArray(tecnosEstruturadas)) {
    const fisicas = tecnosEstruturadas.filter(t => t.tipo === 'antivibracao' || t.tipo === 'estrutural')
    const ergonomia = tecnosEstruturadas.filter(t => t.tipo === 'ergonomia')
    const declarativas = tecnosEstruturadas.filter(t => t.tipo === 'declarativa')
    if (fisicas.length > 0) techFisicasRow = { label: 'Tecnologias', value: fisicas.map(t => t.nome).join(', ') }
    if (ergonomia.length > 0) techErgonomiaRow = { label: 'Agarre', value: ergonomia.map(t => t.nome).join(', '), tipo: 'ergonomia' }
    if (declarativas.length > 0) techDeclarativasRow = { label: 'Acabamentos', value: declarativas.map(t => t.nome).join(', ') }
  } else {
    // Fallback: flat technologies column, filtering material names already in face_material
    const faceNorm = racket.face_material?.toLowerCase().trim() ?? ''
    const techFiltered = (racket.technologies ?? []).filter(t => {
      const tn = t.toLowerCase().trim()
      return !faceNorm.includes(tn) && !tn.includes(faceNorm)
    })
    if (techFiltered.length > 0) techFisicasRow = { label: 'Tecnologias', value: techFiltered.join(', ') }
  }

  const nivelDerivado = derivarNivel(racket)
  const praQuem = nivelDerivado
    ? NIVEL_LABEL[nivelDerivado] ?? cap(nivelDerivado)
    : undefined

  return ([
    praQuem              ? { label: 'Pra quem',          value: praQuem }                         : null,
    racket.weight_g      ? { label: 'Peso',              value: `${racket.weight_g}g` }          : null,
    racket.balance       ? { label: 'Balance',           value: cap(racket.balance) }             : null,
    formatoCabeca        ? { label: 'Formato da cabeça', value: cap(formatoCabeca) }              : null,
    racket.face_material ? { label: 'Material da face',  value: cap(racket.face_material) }       : null,
    racket.core          ? { label: 'Núcleo (EVA)',      value: cap(racket.core) }                : null,
    espessuraStr         ? { label: 'Espessura',         value: espessuraStr }                    : null,
    furos != null        ? { label: 'Furos',             value: String(furos) }                   : null,
    superficieValue      ? { label: 'Superfície',        value: superficieValue }                 : null,
    racket.model_year    ? { label: 'Ano',               value: String(racket.model_year) }       : null,
    athleteLabel         ? { label: 'Atleta',            value: athleteLabel }                    : null,
    techFisicasRow,
    techErgonomiaRow,
    techDeclarativasRow,
  ] as (SpecRow | null)[]).filter((r): r is SpecRow => r !== null)
}

interface Props {
  racket: RacketWithInsights
  variant?: 'page' | 'modal'
}

export default function SpecsGrid({ racket, variant = 'page' }: Props) {
  const rows = buildSpecRows(racket)
  if (rows.length === 0) return null

  if (variant === 'modal') {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {rows.map(({ label, value, tipo }) => {
          const adj = ADJUSTABLE[label]
          const isErgonomia = tipo === 'ergonomia'
          return (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                {isErgonomia && (
                  <svg width="10" height="9" viewBox="0 0 10 9" fill="none" aria-hidden="true">
                    <rect x="0" y="0"   width="10" height="1.5" rx="0.75" fill="#0CC0BE" opacity="0.7"/>
                    <rect x="0" y="3.75" width="10" height="1.5" rx="0.75" fill="#0CC0BE" opacity="0.7"/>
                    <rect x="0" y="7.5" width="10" height="1.5" rx="0.75" fill="#0CC0BE" opacity="0.7"/>
                  </svg>
                )}
                <span className="text-[10px] text-tinta/40 leading-tight">{label}</span>
                {adj && (
                  <TermoGlossario entry={adj} className="flex items-center focus:outline-none shrink-0">
                    <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full leading-none hover:bg-amber-200 transition-colors">
                      ajust.
                    </span>
                  </TermoGlossario>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-tinta font-medium leading-snug">{value}</span>
                {isErgonomia && (
                  <span className="text-[9px] font-semibold bg-aqua/10 text-aqua px-1 py-0.5 rounded-full leading-none border border-aqua/25">
                    agarre real
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {rows.map(({ label, value, tipo }) => {
        const adj = ADJUSTABLE[label]
        const isErgonomia = tipo === 'ergonomia'
        return (
          <div key={label} className="flex justify-between items-center py-2 border-b border-aqua/10 last:border-0">
            <span className="text-tinta/60 text-sm">{label}</span>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-tinta text-sm font-medium text-right">{value}</span>
              {adj && (
                <TermoGlossario entry={adj} className="flex items-center focus:outline-none shrink-0">
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none hover:bg-amber-200 transition-colors">
                    ajustável
                  </span>
                </TermoGlossario>
              )}
              {isErgonomia && (
                <span className="text-[10px] font-semibold bg-aqua/10 text-aqua px-1.5 py-0.5 rounded-full leading-none border border-aqua/25">
                  agarre real
                </span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
