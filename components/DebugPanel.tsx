'use client'

import { useState } from 'react'
import type { FaixaIdeal } from '@/lib/scorer'
import type { DecisionTrace, PrecoDecision, LimitesState, MarcaDecision } from '@/lib/debug-types'
import type { ConfidenceInfo } from '@/lib/agent/confidence'

export type DebugData = {
  thinking?: string
  perfilInput?: Record<string, unknown>
  scorerResults?: Array<{
    id: number
    name: string
    score: number
    weight_g: number | null
    elbow_friendly?: boolean | null
    fora_da_faixa?: boolean
  }>
  criteriosRelaxados?: string[]
  diagnostico?: FaixaIdeal | null
  decisionTrace?: DecisionTrace
  confidenceInfo?: ConfidenceInfo | null
  usage?: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    usd: number
    brl: number
  }
  limites?: LimitesState
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-600 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-1.5 px-2 text-left hover:bg-gray-700 transition-colors"
      >
        <span className="text-gray-300 font-semibold text-[10px] uppercase tracking-wider">{title}</span>
        <span className="text-gray-500 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  )
}

function DecisionTreeSection({ trace }: { trace: DecisionTrace }) {
  return (
    <Section title="Árvore de decisão">
      {/* Faixa fitting steps */}
      {trace.faixaSteps && trace.faixaSteps.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Fitting (faixa)</div>
          {trace.faixaSteps.map((step, i) => (
            <div key={i} className="leading-snug mb-0.5">
              <div className="flex items-baseline gap-1.5 text-[11px]">
                <span className="text-gray-500 shrink-0">{i === 0 ? '┌' : '├'}</span>
                <span className={step.isOverride ? 'text-orange-300 font-semibold' : 'text-gray-200'}>{step.label}</span>
                <span className="text-cyan-300 shrink-0">{step.result.peso_min}–{step.result.peso_max}g</span>
                {step.result.balance && <span className="text-gray-500 shrink-0">{step.result.balance}</span>}
                {step.isOverride && <span className="text-orange-400 text-[9px] shrink-0">⚠ override</span>}
              </div>
              {step.note && <div className="text-[10px] text-gray-500 italic ml-4">{step.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Conflitos */}
      {trace.conflitos && trace.conflitos.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-orange-400 uppercase tracking-wider mb-1">⚠ Conflitos detectados</div>
          {trace.conflitos.map((c, i) => (
            <div key={i} className="text-[11px] text-orange-300 leading-snug">{c}</div>
          ))}
        </div>
      )}

      {/* Filter steps */}
      {trace.filterSteps && trace.filterSteps.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Filtros do scorer</div>
          {trace.filterSteps.map((step, i) => (
            <div key={i} className="text-[11px] leading-snug mb-0.5">
              <div className={`flex items-baseline gap-2 ${step.relaxado ? 'text-orange-300' : 'text-gray-200'}`}>
                <span className="text-gray-500 shrink-0">•</span>
                <span className="flex-1 min-w-0">{step.filtro}</span>
                <span className="text-yellow-300 shrink-0 tabular-nums">
                  {step.antes != null ? `${step.antes}→` : ''}{step.depois}
                </span>
                {step.relaxado && <span className="text-orange-400 text-[9px] shrink-0">relaxado</span>}
              </div>
              {step.note && <div className="text-[10px] text-gray-500 italic ml-3">{step.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Price decision */}
      {trace.precoDecision && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Decisão de preço</div>
          {(() => {
            const pd = trace.precoDecision as PrecoDecision
            const color =
              pd.status === 'disparo'      ? 'text-orange-300' :
              pd.status === 'budget_known' ? 'text-green-400'  : 'text-gray-400'
            const label =
              pd.status === 'disparo'      ? '⚠ orçamento desconhecido' :
              pd.status === 'budget_known' ? '✓ budget conhecido'        : '— sem dados'
            return (
              <>
                <div className={`text-[11px] font-semibold ${color} mb-0.5`}>{label}</div>
                <div className="text-[10px] text-gray-500 italic">{pd.note}</div>
                {pd.rangeMin != null && pd.rangeMax != null && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    range top candidatas: R${pd.rangeMin}–R${pd.rangeMax}
                    {pd.rangeBrl != null && <span className="text-orange-400 ml-1">(Δ R${pd.rangeBrl})</span>}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Marca decision */}
      {trace.marcaDecision && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Preferência de marca</div>
          {(() => {
            const md = trace.marcaDecision as MarcaDecision
            const hasPref = !!md.marcaPreferida
            const color = !hasPref ? 'text-gray-400' : md.topNaoEDaMarca ? 'text-orange-300' : 'text-green-400'
            const label = !hasPref
              ? '— sem preferência (tanto faz)'
              : md.topNaoEDaMarca
              ? `⚠ top candidata não é ${md.marcaPreferida}`
              : `✓ top candidata é ${md.marcaPreferida}`
            return (
              <>
                <div className={`text-[11px] font-semibold ${color} mb-0.5`}>{label}</div>
                {hasPref && (
                  <div className="text-[10px] text-gray-500 italic">
                    {md.racketsDaMarca} raquete(s) da marca no pool · boost +{md.boost} pts
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Scorer weights */}
      {trace.scorerWeights && Object.keys(trace.scorerWeights).length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Pesos do scorer</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(trace.scorerWeights)
              .sort((a, b) => b[1] - a[1])
              .map(([key, val]) => (
                <span key={key} className="text-[11px]">
                  <span className="text-gray-400">{key} </span>
                  <span className="text-yellow-300 tabular-nums">{val}</span>
                </span>
              ))
            }
          </div>
        </div>
      )}
    </Section>
  )
}

function ConfidenceSection({ info }: { info: ConfidenceInfo }) {
  const { score, threshold, thresholdReason, willRecommend, decisionTaken, presentFields, missingFields, nextQuestion, questionRound, maxQuestions, recommendAnyway } = info
  return (
    <Section title="Confiança do perfil">
      {/* Score bar */}
      <div className="mb-2">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className={`text-[11px] font-semibold ${willRecommend ? 'text-green-400' : 'text-orange-400'}`}>
            {score}% {willRecommend ? '✓' : `(mín ${threshold}%)`}
          </span>
          <span className={`text-[10px] font-bold tracking-wider ${decisionTaken === 'recomendar' ? 'text-green-400' : 'text-orange-400'}`}>
            → {decisionTaken === 'recomendar' ? 'RECOMENDAR' : 'PERGUNTAR'}
          </span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full relative overflow-visible">
          <div
            className={`h-full rounded-full ${willRecommend ? 'bg-green-500' : 'bg-orange-500'}`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
          {/* Threshold line */}
          <div
            className="absolute top-[-2px] bottom-[-2px] w-px bg-yellow-400 opacity-70"
            style={{ left: `${threshold}%` }}
            title={`limiar ${threshold}%`}
          />
        </div>
        <div className="text-[9px] text-gray-600 mt-0.5 text-right">limiar {threshold}%{thresholdReason ? ` · ${thresholdReason}` : ''}</div>
      </div>

      {recommendAnyway && (
        <div className="text-[10px] text-orange-300 mb-1.5">⚠ rodadas esgotadas ({questionRound}/{maxQuestions}) — recomenda com caveat</div>
      )}

      {/* Present fields */}
      <div className="space-y-0.5 mb-1.5">
        {presentFields.map(f => (
          <div key={f.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="text-green-400 shrink-0 w-3">✓</span>
            <span className="text-gray-300 flex-1 min-w-0 truncate">{f.label}</span>
            <span className="text-gray-500 shrink-0 tabular-nums text-[10px]">+{f.weight}%</span>
          </div>
        ))}
        {missingFields.map(f => (
          <div key={f.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="text-gray-600 shrink-0 w-3">○</span>
            <span className="text-gray-500 flex-1 min-w-0 truncate">{f.label}</span>
            <span className="text-gray-600 shrink-0 tabular-nums text-[10px]">+{f.weight}%</span>
          </div>
        ))}
      </div>

      {/* Next question chosen */}
      {nextQuestion && (
        <div className="border-t border-gray-700 pt-1.5 mt-1.5">
          <div className="text-[10px] text-orange-400 uppercase tracking-wider mb-0.5">Pergunta escolhida</div>
          <div className="text-[11px] text-orange-200 font-medium">{nextQuestion.label}</div>
          <div className="text-[10px] text-gray-500 italic mt-0.5 leading-tight">{nextQuestion.justification}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {nextQuestion.chips.map(c => (
              <span key={c} className="text-[9px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded border border-gray-600">{c}</span>
            ))}
          </div>
        </div>
      )}

      <div className="text-[9px] text-gray-600 mt-1.5">rodada {questionRound} / máx {maxQuestions}</div>
    </Section>
  )
}

function fmtMs(ms: number): string {
  if (ms <= 0) return 'agora'
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`
  return `${Math.ceil(ms / 60_000)}min`
}

function LimitRow({ label, count, limit, resetInMs }: { label: string; count: number; limit: number; resetInMs: number }) {
  const pct = Math.min(100, (count / limit) * 100)
  const hot = count >= limit * 0.8
  return (
    <div className="mb-1.5">
      <div className="flex justify-between items-baseline mb-0.5">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className={`text-[11px] tabular-nums font-semibold ${hot ? 'text-orange-400' : 'text-gray-200'}`}>
          {count}/{limit}
          {resetInMs > 0 && <span className="text-gray-500 font-normal text-[9px] ml-1">reset {fmtMs(resetInMs)}</span>}
        </span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${hot ? 'bg-orange-500' : 'bg-cyan-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function LimitesSection({ limites }: { limites: LimitesState }) {
  const ipShort = limites.ip.split('.').slice(-2).join('.')
  return (
    <Section title="Limites de uso" defaultOpen={false}>
      <div className="text-[9px] text-gray-600 mb-2">IP: …{ipShort}</div>
      <LimitRow label="por minuto (IP)" count={limites.ipPerMin.count} limit={limites.ipPerMin.limit} resetInMs={limites.ipPerMin.resetInMs} />
      <LimitRow label="por dia (IP)" count={limites.ipPerDay.count} limit={limites.ipPerDay.limit} resetInMs={limites.ipPerDay.resetInMs} />
      {limites.sessao && (
        <LimitRow label="esta conversa" count={limites.sessao.count} limit={limites.sessao.limit} resetInMs={limites.sessao.resetInMs} />
      )}
    </Section>
  )
}

export default function DebugPanel({ data }: { data: DebugData }) {
  return (
    <div className="mt-2 font-mono text-xs bg-gray-800 text-gray-200 rounded-lg overflow-hidden border border-gray-600 select-text">
      <div className="bg-gray-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-yellow-400 font-bold text-[11px]">⚙ DEBUG</span>
        <span className="text-gray-400 text-[10px]">admin only</span>
        {process.env.NEXT_PUBLIC_BUILD_LABEL && (
          <span className="ml-auto text-[9px] font-mono text-gray-500 select-all">
            build {process.env.NEXT_PUBLIC_BUILD_LABEL}
          </span>
        )}
      </div>

      {data.thinking && (
        <Section title="Thinking" defaultOpen={false}>
          <pre className="text-[11px] text-gray-300 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">{data.thinking}</pre>
        </Section>
      )}

      {data.confidenceInfo && (
        <ConfidenceSection info={data.confidenceInfo} />
      )}

      {data.decisionTrace && (
        <DecisionTreeSection trace={data.decisionTrace} />
      )}

      {data.perfilInput && (
        <Section title="Perfil extraído">
          <pre className="text-[11px] text-emerald-300 whitespace-pre-wrap">{JSON.stringify(data.perfilInput, null, 2)}</pre>
        </Section>
      )}

      {data.diagnostico && (
        <Section title="Faixa calculada">
          <div className="text-[11px] space-y-0.5">
            <div><span className="text-gray-400">peso: </span><span className="text-cyan-300">{data.diagnostico.peso_min}–{data.diagnostico.peso_max}g</span></div>
            <div><span className="text-gray-400">balance: </span><span className="text-cyan-300">{data.diagnostico.balance_preferido}</span></div>
            {data.diagnostico.prioridades?.length > 0 && (
              <div><span className="text-gray-400">prio: </span><span className="text-cyan-300">{data.diagnostico.prioridades.join(', ')}</span></div>
            )}
          </div>
        </Section>
      )}

      {data.scorerResults && data.scorerResults.length > 0 && (
        <Section title={`Ranking scorer (${data.scorerResults.length})`}>
          <div className="space-y-0.5">
            {data.scorerResults.map(r => (
              <div key={r.id} className="flex items-baseline gap-2 text-[11px]">
                <span className="text-yellow-300 w-10 text-right shrink-0 tabular-nums">{r.score.toFixed(1)}</span>
                <span className={r.fora_da_faixa ? 'text-red-400 line-through' : 'text-gray-200'}>{r.name}</span>
                <span className="text-gray-500 shrink-0">{r.weight_g ?? '?'}g</span>
                {r.elbow_friendly && <span className="text-green-400 text-[9px] shrink-0">elbow✓</span>}
                {r.fora_da_faixa && <span className="text-red-400 text-[9px] shrink-0">fora</span>}
              </div>
            ))}
          </div>
          {data.criteriosRelaxados && data.criteriosRelaxados.length > 0 && (
            <div className="mt-1.5 text-orange-400 text-[10px]">relaxados: {data.criteriosRelaxados.join(' · ')}</div>
          )}
        </Section>
      )}

      {data.limites && (
        <LimitesSection limites={data.limites} />
      )}

      {data.usage && (
        <Section title="Tokens / custo">
          <div className="text-[11px] space-y-0.5 tabular-nums">
            <div><span className="text-gray-400">input: </span><span className="text-gray-200">{data.usage.input.toLocaleString()}</span></div>
            <div><span className="text-gray-400">output: </span><span className="text-gray-200">{data.usage.output.toLocaleString()}</span></div>
            <div><span className="text-gray-400">cache↑: </span><span className="text-gray-200">{data.usage.cacheWrite.toLocaleString()}</span></div>
            <div><span className="text-gray-400">cache↓: </span><span className="text-gray-200">{data.usage.cacheRead.toLocaleString()}</span></div>
            <div className="mt-1"><span className="text-gray-400">custo: </span><span className="text-green-300">US${data.usage.usd.toFixed(4)} / R${data.usage.brl.toFixed(3)}</span></div>
          </div>
        </Section>
      )}
    </div>
  )
}
