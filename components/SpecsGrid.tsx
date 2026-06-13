import { RacketWithInsights } from '@/lib/recommend'
import { derivarNivel } from '@/lib/nivel'
import TermoGlossario from './TermoGlossario'
import type { GlossarioEntry } from '@/lib/glossario'

const ADJUSTABLE: Record<string, GlossarioEntry> = {
  'Peso': {
    termo: 'Peso — ajustável',
    definicao: 'Valor de fábrica (pode variar ±10g). Dá pra AUMENTAR adicionando fitas de peso no cabo ou na cabeça. Não dá pra reduzir o peso.',
  },
  'Balance': {
    termo: 'Balance — ajustável',
    definicao: 'Valor de referência. Dá pra ajustar adicionando peso: no cabo deixa mais ágil e com mais controle; na cabeça dá mais potência.',
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

export interface SpecRow { label: string; value: string }

export function buildSpecRows(racket: RacketWithInsights): SpecRow[] {
  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>

  const rawEspessura = extra.espessura as string | number | undefined
  const espessuraStr = rawEspessura != null
    ? (String(rawEspessura).includes('mm') ? String(rawEspessura) : `${rawEspessura}mm`)
    : undefined

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
  let techDeclarativasRow: SpecRow | null = null

  if (Array.isArray(tecnosEstruturadas)) {
    const fisicas = tecnosEstruturadas.filter(t => t.tipo === 'antivibracao' || t.tipo === 'estrutural')
    const declarativas = tecnosEstruturadas.filter(t => t.tipo === 'declarativa')
    if (fisicas.length > 0) techFisicasRow = { label: 'Tecnologias', value: fisicas.map(t => t.nome).join(', ') }
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
        {rows.map(({ label, value }) => {
          const adj = ADJUSTABLE[label]
          return (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-tinta/40 leading-tight">{label}</span>
                {adj && (
                  <TermoGlossario entry={adj} className="flex items-center focus:outline-none shrink-0">
                    <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full leading-none hover:bg-amber-200 transition-colors">
                      ajust.
                    </span>
                  </TermoGlossario>
                )}
              </div>
              <span className="text-xs text-tinta font-medium leading-snug">{value}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {rows.map(({ label, value }) => {
        const adj = ADJUSTABLE[label]
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
            </div>
          </div>
        )
      })}
    </>
  )
}
