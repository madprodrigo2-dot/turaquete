'use client'

import { useMemo, useState } from 'react'
import { SlidersHorizontal, Check, X } from '@phosphor-icons/react'
import type { RacketWithInsights } from '@/lib/recommend'
import {
  COR_SWATCHES, NIVEL_OPCOES, NUCLEO_OPCOES, FACE_OPCOES, ESPESSURA_OPCOES, PESO_OPCOES, BALANCE_OPCOES,
  availability, countAdvanced, hasCatalogFilter, EMPTY_CATALOG_FILTERS,
  type CatalogFilterState, type AdvancedKey, type Opcao,
} from '@/lib/catalogFilters'

interface Props {
  // Conjunto-base (antes dos filtros novos) — usado só para esconder opções sem resultado.
  rackets: RacketWithInsights[]
  state: CatalogFilterState
  onChange: (next: CatalogFilterState) => void
  // Quantas raquetes o conjunto filtrado tem hoje (rótulo do botão do bottom-sheet).
  resultCount: number
  // Grupos já cobertos por outro controle da página (ex.: select de nível em /marcas).
  omit?: AdvancedKey[]
}

const GRUPOS: Array<{ key: AdvancedKey; title: string; opcoes: Opcao[] }> = [
  { key: 'nivel',     title: 'Nível do jogador',  opcoes: NIVEL_OPCOES },
  { key: 'nucleo',    title: 'Núcleo',            opcoes: NUCLEO_OPCOES },
  { key: 'face',      title: 'Material da face',  opcoes: FACE_OPCOES },
  { key: 'espessura', title: 'Espessura',         opcoes: ESPESSURA_OPCOES },
  { key: 'peso',      title: 'Peso',              opcoes: PESO_OPCOES },
  { key: 'balance',   title: 'Balance',           opcoes: BALANCE_OPCOES },
]

export default function CatalogFilterControls({ rackets, state, onChange, resultCount, omit = [] }: Props) {
  const [open, setOpen] = useState(false)
  const avail = useMemo(() => availability(rackets), [rackets])
  const nAdv = countAdvanced(state)

  const swatches = COR_SWATCHES.filter(c => avail.cores.has(c.key))
  const gruposVisiveis = GRUPOS.filter(g => !omit.includes(g.key) && g.opcoes.some(o => avail.adv[g.key].has(o.key)))

  function toggleCor(key: string) {
    const cores = state.cores.includes(key) ? state.cores.filter(c => c !== key) : [...state.cores, key]
    onChange({ ...state, cores })
  }
  function toggleAdv(group: AdvancedKey, key: string) {
    onChange({ ...state, [group]: state[group] === key ? null : key })
  }

  const corLabel = state.cores.length > 0
    ? state.cores.map(k => COR_SWATCHES.find(c => c.key === k)?.label ?? k).join(', ')
    : null

  return (
    <>
      {/* Cor — sempre visível */}
      {swatches.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-tinta/50">
            Cor{corLabel && <span className="text-tinta/80 font-medium">: {corLabel}</span>}
          </p>
          <div className="-mr-5 md:mr-0 relative">
            <div className="flex gap-2.5 overflow-x-auto py-1 px-1 pr-5 md:pr-0 md:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {swatches.map(c => {
                const on = state.cores.includes(c.key)
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCor(c.key)}
                    aria-pressed={on}
                    aria-label={c.label}
                    title={c.label}
                    className={`relative shrink-0 w-8 h-8 rounded-full border transition-all ${
                      on ? 'ring-2 ring-aqua ring-offset-2 ring-offset-[#F7F3EC] border-tinta/20 scale-105' : 'border-tinta/20 hover:scale-105'
                    }`}
                    style={{ background: c.bg }}
                  >
                    {on && (
                      <Check
                        size={14}
                        weight="bold"
                        aria-hidden="true"
                        className={`absolute inset-0 m-auto ${['branco', 'amarelo', 'prateado'].includes(c.key) ? 'text-tinta' : 'text-white'}`}
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#F7F3EC] to-transparent md:hidden" />
          </div>
        </div>
      )}

      {/* Mais filtros */}
      {gruposVisiveis.length > 0 && (
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls="mais-filtros-panel"
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                nAdv > 0 || open ? 'bg-aqua/10 text-aqua border-aqua/40' : 'bg-white text-tinta/70 border-tinta/15 hover:border-aqua/50'
              }`}
            >
              <SlidersHorizontal size={14} weight="regular" aria-hidden="true" />
              Mais filtros{nAdv > 0 && ` (${nAdv})`}
            </button>
            {hasCatalogFilter(state) && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_CATALOG_FILTERS)}
                className="text-xs text-aqua hover:underline font-medium"
              >
                Limpar cor e filtros técnicos
              </button>
            )}
          </div>

          {open && (
            <>
              {/* Backdrop — só mobile */}
              <div className="fixed inset-0 z-40 bg-tinta/40 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
              <div
                id="mais-filtros-panel"
                role="region"
                aria-label="Mais filtros"
                className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl flex flex-col gap-5
                           md:static md:z-auto md:max-h-none md:mt-3 md:rounded-xl md:border md:border-tinta/10 md:p-4 md:shadow-sm"
              >
                <div className="flex items-center justify-between md:hidden">
                  <p className="text-sm font-semibold text-tinta">Mais filtros</p>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Fechar filtros" className="text-tinta/50">
                    <X size={18} weight="regular" aria-hidden="true" />
                  </button>
                </div>

                {gruposVisiveis.map(g => (
                  <div key={g.key} className="flex flex-col gap-2">
                    <p className="text-xs text-tinta/50">{g.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {g.opcoes.filter(o => avail.adv[g.key].has(o.key)).map(o => {
                        const on = state[g.key] === o.key
                        return (
                          <button
                            key={o.key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleAdv(g.key, o.key)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium whitespace-nowrap ${
                              on ? 'bg-aqua text-white border-aqua' : 'bg-white text-tinta/70 border-tinta/15 hover:border-aqua/50'
                            }`}
                          >
                            {o.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="md:hidden w-full bg-aqua text-white text-sm font-semibold py-3 rounded-xl"
                >
                  Ver {resultCount} {resultCount === 1 ? 'raquete' : 'raquetes'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
