import type { ReactNode } from 'react'
import type { RacketWithInsights } from '@/lib/recommend'
import { buildSpecRows } from '@/components/SpecsGrid'
import MegaSpinLink from '@/components/MegaSpinLink'
import {
  microFace, microNucleo, microEspessura, microSuperficie, MICRO_FUROS, descTecnologia,
} from '@/lib/pdpCopy'
import { CARD } from './tom'

// Bloco A: ficha técnica "em quadra" — cada linha com uma micro-explicação do
// que o dado significa na prática; a MegaSpin fica dentro da linha Superfície.
// Bloco B: dados de catálogo (marca, atleta, ano) numa linha discreta no rodapé.

interface Props {
  racket: RacketWithInsights
  athlete?: string
  tratamentoFabrica?: boolean | null
}

function Linha({ label, value, micro, extra }: { label: string; value: string; micro?: string | null; extra?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 first:pt-0 border-b border-tinta/[0.06] last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-tinta/50">{label}</span>
        <span className="text-sm text-tinta font-semibold text-right">{value}</span>
      </div>
      {micro && <p className="text-xs text-tinta/60 leading-relaxed">{micro}</p>}
      {extra}
    </div>
  )
}

export function PdpSpecs({ racket, athlete, tratamentoFabrica }: Props) {
  const rows = buildSpecRows(racket)
  const get = (label: string) => rows.find(r => r.label === label)?.value
  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>
  const espMm = extra.espessura_mm as number | null | undefined

  const face = get('Material da face')
  const nucleo = get('Núcleo (EVA)')
  // buildSpecRows agrega "· perfil médio" ao valor; aqui a micro-explicação já diz isso.
  const espessura = espMm != null ? `${espMm}mm` : get('Espessura')
  const furos = get('Furos')
  const superficie = get('Superfície')

  const catalogo = [
    racket.brands?.name,
    athlete,
    racket.model_year ? String(racket.model_year) : null,
  ].filter(Boolean) as string[]

  if (!face && !nucleo && !espessura && !furos && !superficie) return null

  return (
    <section aria-label="Especificações" className={`${CARD} p-5 flex flex-col gap-3`}>
      <p className="text-tinta font-semibold text-sm">Ficha técnica</p>
      <div className="flex flex-col">
        {face && <Linha label="Material da face" value={face} micro={microFace(racket.face_material)} />}
        {nucleo && <Linha label="Núcleo (EVA)" value={nucleo} micro={microNucleo(racket.core)} />}
        {espessura && <Linha label="Espessura" value={espessura} micro={microEspessura(espMm)} />}
        {furos && <Linha label="Furos" value={furos} micro={MICRO_FUROS} />}
        {superficie && (
          <Linha
            label="Superfície"
            value={superficie}
            micro={microSuperficie(superficie, tratamentoFabrica)}
            extra={<MegaSpinLink inline racketId={racket.id} racketSlug={racket.slug} racketName={racket.name} />}
          />
        )}
      </div>
      {catalogo.length > 0 && (
        <p className="text-[11px] text-tinta/40 pt-2 border-t border-tinta/[0.06]">
          {catalogo.join(' · ')}
        </p>
      )}
    </section>
  )
}

export function PdpTecnologias({ tecnologias }: { tecnologias: { nome: string; tipo: string }[] }) {
  if (tecnologias.length === 0) return null
  return (
    <section aria-label="Tecnologias e acabamentos" className={`${CARD} p-5 flex flex-col gap-3`}>
      <p className="text-tinta font-semibold text-sm">Tecnologias e acabamentos</p>
      <div className="flex flex-col gap-2">
        {tecnologias.map((t, i) => (
          <div key={i} className="rounded-xl bg-aqua/[0.06] border border-aqua/15 px-4 py-3 flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-tinta">{t.nome}</span>
            <span className="text-xs text-tinta/65 leading-relaxed">{descTecnologia(t.tipo)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
