'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { salvarEditorial } from './actions'
import type { AdminRacket } from './page'

const NIVEL_OPTIONS = [
  { value: '', label: '— (não definido)' },
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
]

const SAIDA_OPTIONS = [
  { value: '', label: '— (não definido)' },
  { value: 'fácil', label: 'Fácil' },
  { value: 'médio', label: 'Médio' },
  { value: 'exigente', label: 'Exigente' },
]

export default function BlocoC({ slug, racket }: { slug: string; racket: AdminRacket }) {
  const ins = racket.racket_insights
  const se = (racket.specs_extra ?? {}) as Record<string, unknown>
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [price, setPrice] = useState<string>(racket.price?.toString() ?? '')
  const [publicada, setPublicada] = useState(racket.publicada)
  const [destaqueAtleta, setDestaqueAtleta] = useState(racket.destaque_atleta ?? false)
  const [atleta, setAtleta] = useState<string>((se.atleta as string | null) ?? '')
  const [saidaDeBola, setSaidaDeBola] = useState<string>((se.saida_de_bola as string | null) ?? '')
  const [nivelSugerido, setNivelSugerido] = useState<string>(ins?.nivel_sugerido ?? '')
  const [summary, setSummary] = useState(ins?.summary ?? '')
  const [perfilResumo, setPerfilResumo] = useState(ins?.perfil_resumo ?? '')
  const [observations, setObservations] = useState(
    (ins?.observations ?? []).join(', ')
  )
  const [aiDrafted, setAiDrafted] = useState(ins?.ai_drafted ?? false)
  const [reviewed, setReviewed] = useState(ins?.reviewed ?? false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSave() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await salvarEditorial(slug, {
          price: price !== '' ? Number(price) : null,
          publicada,
          destaque_atleta: destaqueAtleta,
          atleta,
          saida_de_bola: saidaDeBola,
          nivel_sugerido: (nivelSugerido || null) as 'iniciante' | 'intermediario' | 'avancado' | null,
          summary,
          perfil_resumo: perfilResumo,
          observations: observations
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
          ai_drafted: aiDrafted,
          reviewed,
        })
        setSuccess(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar')
      }
    })
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          C — Editorial / Comercial
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Nível + Preço + flags */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nível sugerido</label>
            <select
              value={nivelSugerido}
              onChange={e => setNivelSugerido(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              {NIVEL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Preço (R$)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="ex: 2599"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Saída de bola</label>
            <select
              value={saidaDeBola}
              onChange={e => setSaidaDeBola(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              {SAIDA_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Atleta */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Atleta</label>
            <input
              value={atleta}
              onChange={e => setAtleta(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="ex: Hugo Russo"
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="flex gap-4 pb-1.5">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicada}
                  onChange={e => setPublicada(e.target.checked)}
                  className="accent-teal-600 w-3.5 h-3.5"
                />
                Publicada
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={destaqueAtleta}
                  onChange={e => setDestaqueAtleta(e.target.checked)}
                  className="accent-teal-600 w-3.5 h-3.5"
                />
                Vitrina atleta
              </label>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Resumo (agent)</label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={3}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white resize-none"
            placeholder="Texto que o agente usa para apresentar esta raqueta…"
          />
        </div>

        {/* Perfil resumo */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Perfil resumo</label>
          <textarea
            value={perfilResumo}
            onChange={e => setPerfilResumo(e.target.value)}
            rows={2}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white resize-none"
            placeholder="Pra quem é esta raqueta em uma frase…"
          />
        </div>

        {/* Highlights */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Highlights / chips{' '}
            <span className="text-gray-400">(separados por vírgula)</span>
          </label>
          <input
            value={observations}
            onChange={e => setObservations(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            placeholder="ex: Power Carbon, Dampershield, ABS Gel"
          />
        </div>

        {/* Meta flags */}
        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={aiDrafted}
              onChange={e => setAiDrafted(e.target.checked)}
              className="accent-gray-400 w-3.5 h-3.5"
            />
            ai_drafted
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={e => setReviewed(e.target.checked)}
              className="accent-teal-600 w-3.5 h-3.5"
            />
            reviewed
          </label>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-teal-600">Editorial salvo.</p>}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {pending ? 'Salvando…' : 'Salvar editorial'}
          </button>
        </div>
      </div>
    </section>
  )
}
