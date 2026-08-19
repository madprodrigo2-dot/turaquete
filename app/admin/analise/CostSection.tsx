'use client'

import { useState } from 'react'
import { InfoTooltip } from '../InfoTooltip'

const USD_TO_CLP = 955 // atualizar conforme necessário

type Currency = 'BRL' | 'USD' | 'CLP'

interface Props {
  avgBrl:            number | null
  avgUsd:            number | null
  totalBrl:          number
  totalUsd:          number
  maxCostBrl:        number | null
  maxCostUsd:        number | null
  avgCostTurnBrl:    number | null
  avgCostTurnUsd:    number | null
  custoPorCliqueBrl: number | null
  custoPorCliqueUsd: number | null
  affiliateClicksCount: number
  sessionsCount:     number
  sessionsWithRecCount: number
  sessionsWithClickCount: number
  avgTurns:          number | null
  taxaConversao:     number
}

function fmt(v: number | null, currency: Currency, decimals = 4): string {
  if (v == null) return '—'
  const val = currency === 'CLP' ? v * USD_TO_CLP : v
  if (currency === 'BRL') return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  if (currency === 'USD') return `US$ ${val.toFixed(decimals)}`
  return `CLP ${Math.round(val).toLocaleString('es-CL')}`
}

function fmtUsd(v: number | null, decimals = 4): string {
  if (v == null) return '—'
  return `US$ ${v.toFixed(decimals)}`
}

function pct(num: number, den: number): string {
  return den === 0 ? '—' : `${Math.round((num / den) * 100)}%`
}

export function CostSection({
  avgBrl, avgUsd, totalBrl, totalUsd, maxCostBrl, maxCostUsd,
  avgCostTurnBrl, avgCostTurnUsd, custoPorCliqueBrl, custoPorCliqueUsd,
  affiliateClicksCount, sessionsCount, sessionsWithRecCount, sessionsWithClickCount,
  avgTurns, taxaConversao,
}: Props) {
  const [cur, setCur] = useState<Currency>('BRL')

  // normalise: para BRL usamos os valores diretos, para USD/CLP usamos USD como base
  const avgV        = cur === 'BRL' ? avgBrl        : avgUsd
  const totalV      = cur === 'BRL' ? totalBrl      : totalUsd
  const maxCostV    = cur === 'BRL' ? maxCostBrl    : maxCostUsd
  const avgTurnV    = cur === 'BRL' ? avgCostTurnBrl : avgCostTurnUsd
  const custoCliqueV = cur === 'BRL' ? custoPorCliqueBrl : custoPorCliqueUsd

  const d = cur === 'BRL' ? 4 : 6  // mais decimais para USD/CLP
  const subD = cur === 'BRL' ? 4 : 6

  return (
    <>
      {/* ── Custos (detalhe, colapsado — resumo já aparece em Saúde do negócio) ── */}
      <section>
        <details className="group">
          <summary className="text-xs font-semibold text-gray-600 uppercase tracking-widest cursor-pointer select-none list-none marker:hidden flex items-center gap-1.5">
            <span className="inline-block transition-transform group-open:rotate-90 text-gray-400">▸</span>
            Custos (API Anthropic) — detalhe
          </summary>

          <div className="mt-3">
            <div className="flex items-center justify-end mb-3">
              <div className="flex gap-1">
                {(['BRL', 'USD', 'CLP'] as Currency[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setCur(c)}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                      cur === c ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {c === 'BRL' ? 'R$' : c === 'USD' ? 'US$' : 'CLP'}
                  </button>
                ))}
              </div>
            </div>

            {sessionsCount === 0 ? (
              <p className="text-gray-400 italic text-xs">Sem dados de custo para o período.</p>
            ) : (
              <>
                {cur === 'CLP' && (
                  <p className="text-[10px] text-gray-400 mb-2">Taxa usada: 1 USD = {USD_TO_CLP.toLocaleString('es-CL')} CLP</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Custo médio/sessão',
                      value: fmt(avgV, cur, d),
                      sub: cur === 'BRL' ? fmtUsd(avgUsd) : cur === 'USD' ? `R$ ${avgBrl?.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) ?? '—'}` : fmtUsd(avgUsd),
                      highlight: true,
                      tip: 'Média de custo da API Anthropic por sessão no período.',
                    },
                    {
                      label: 'Total no período',
                      value: fmt(totalV, cur, 2),
                      sub: cur === 'BRL' ? fmtUsd(totalUsd) : `R$ ${totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      tip: 'Soma de todos os custos de API no período selecionado.',
                    },
                    {
                      label: 'Conversa mais cara',
                      value: fmt(maxCostV, cur, d),
                      sub: 'anomalia',
                      tip: 'Sessão com maior custo individual no período.',
                    },
                    {
                      label: 'Custo médio / turno',
                      value: fmt(avgTurnV, cur, d),
                      sub: avgTurns != null ? `≈ ${avgTurns.toFixed(1)} turnos/sessão` : '',
                      tip: 'Custo médio por par pergunta/resposta.',
                    },
                  ].map(({ label, value, sub, highlight, tip }) => (
                    <div key={label} className={`bg-white rounded-lg border shadow-sm p-3 flex flex-col gap-0.5 ${highlight ? 'border-teal-200' : 'border-gray-100'}`}>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight flex items-center gap-0.5">{label}<InfoTooltip text={tip} /></p>
                      <p className={`font-bold ${highlight ? 'text-xl text-gray-900' : 'text-base text-gray-800'}`}>{value}</p>
                      {sub && <p className="text-[10px] text-gray-300">{sub}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </details>
      </section>

      {/* ── Rentabilidade ── */}
      {sessionsCount > 0 && (custoCliqueV != null || taxaConversao > 0) && (
        <section>
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">Rentabilidade</h2>
          <div className="grid grid-cols-2 gap-3">
            {custoCliqueV != null && (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight flex items-center gap-0.5">
                  Custo / clique monetizável
                  <InfoTooltip text="Custo total de API ÷ cliques afiliado + busca de link_clicks (fonte de verdade). Inclui cliques com e sem quiz." />
                </p>
                <p className="text-base font-bold text-gray-800">{fmt(custoCliqueV, cur, subD)}</p>
                <p className="text-[10px] text-gray-300">{affiliateClicksCount} cliques afiliado + busca (link_clicks)</p>
              </div>
            )}
            {taxaConversao > 0 && (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-0.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight flex items-center gap-0.5">
                  Taxa rec. → loja
                  <InfoTooltip text="Sessões que clicaram em Ver na loja ÷ sessões com recomendação. Mede conversão real — não conta Ver análise." />
                </p>
                <p className="text-base font-bold text-gray-800">{pct(sessionsWithClickCount, sessionsWithRecCount)}</p>
                <p className="text-[10px] text-gray-300">sessões c/ rec. que abriram a loja</p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
