'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { salvarFisicos, type TechEntry } from './actions'
import type { AdminRacket } from './page'

const TIPO_OPTIONS = [
  { value: 'antivibração', label: 'antivibração' },
  { value: 'estrutural', label: 'estrutural' },
  { value: 'superficie', label: 'superficie' },
  { value: 'ergonomia', label: 'ergonomia' },
  { value: 'declarativa', label: 'declarativa' },
]

const BALANCE_OPTIONS = ['cabo', 'médio/cabo', 'médio', 'médio/cabeça', 'cabeça']

type MotorFeedback = { spin: number; comfort: number; stability: number }

export default function BlocoA({ slug, racket }: { slug: string; racket: AdminRacket }) {
  const se = (racket.specs_extra ?? {}) as Record<string, unknown>
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [faceMaterial, setFaceMaterial] = useState(racket.face_material ?? '')
  const [core, setCore] = useState(racket.core ?? '')
  const [weightG, setWeightG] = useState<string>(racket.weight_g?.toString() ?? '')
  const [balance, setBalance] = useState(racket.balance ?? '')
  const [espessura, setEspessura] = useState<string>((se.espessura_mm as number | null)?.toString() ?? '')
  const [furos, setFuros] = useState<string>((se.furos as number | null)?.toString() ?? '')
  const [superficie, setSuperficie] = useState<string>((se.superficie as string | null) ?? '')
  const [modelYear, setModelYear] = useState<string>(racket.model_year?.toString() ?? '')
  const [techs, setTechs] = useState<TechEntry[]>(
    Array.isArray(se.tecnologias) ? (se.tecnologias as TechEntry[]) : []
  )

  const [motorResult, setMotorResult] = useState<MotorFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  function addTech() {
    setTechs(prev => [...prev, { nome: '', tipo: 'declarativa' }])
  }

  function removeTech(i: number) {
    setTechs(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateTech(i: number, field: keyof TechEntry, value: string) {
    setTechs(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function handleSave() {
    setError(null)
    setMotorResult(null)
    startTransition(async () => {
      try {
        const result = await salvarFisicos(slug, {
          face_material: faceMaterial,
          core,
          weight_g: weightG !== '' ? Number(weightG) : null,
          balance,
          espessura_mm: espessura !== '' ? Number(espessura) : null,
          furos: furos !== '' ? Number(furos) : null,
          superficie,
          model_year: modelYear !== '' ? Number(modelYear) : null,
          tecnologias: techs.filter(t => t.nome.trim()),
        })
        setMotorResult(result.motor)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar')
      }
    })
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          A — Dados Físicos
        </span>
        <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
          ⚡ alterar recalcula as notas
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Face + Núcleo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Face</label>
            <input
              value={faceMaterial}
              onChange={e => setFaceMaterial(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="ex: Carbon 24K"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Núcleo</label>
            <input
              value={core}
              onChange={e => setCore(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="ex: EVA Soft LD"
            />
          </div>
        </div>

        {/* Peso + Espessura + Balance + Furos + Ano */}
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Peso (g)</label>
            <input
              type="number"
              value={weightG}
              onChange={e => setWeightG(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="325"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Espessura (mm)</label>
            <input
              type="number"
              value={espessura}
              onChange={e => setEspessura(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="22"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Balance</label>
            <select
              value={balance}
              onChange={e => setBalance(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">—</option>
              {BALANCE_OPTIONS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Furos</label>
            <input
              type="number"
              value={furos}
              onChange={e => setFuros(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="34"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ano</label>
            <input
              type="number"
              value={modelYear}
              onChange={e => setModelYear(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              placeholder="2025"
            />
          </div>
        </div>

        {/* Superficie */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Superficie</label>
          <input
            value={superficie}
            onChange={e => setSuperficie(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            placeholder="ex: áspera (tratamento de fábrica)"
          />
        </div>

        {/* Tecnologias */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Tecnologias</label>
          <div className="space-y-2">
            {techs.map((tech, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={tech.nome}
                  onChange={e => updateTech(i, 'nome', e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="Nome da tecnologia"
                />
                <select
                  value={tech.tipo}
                  onChange={e => updateTech(i, 'tipo', e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  {TIPO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeTech(i)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-sm leading-none px-1"
                  aria-label="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addTech}
            className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            + Adicionar tecnologia
          </button>

          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Tipos de tecnologia</p>
            {[
              { tipo: 'antivibração', desc: 'Absorção de vibração. Eleva o Conforto: 1 sistema → 8, 2+ → 9.' },
              { tipo: 'estrutural',   desc: 'Reforço de frame/carbono. Eleva a Estabilidade: 1 → 7, 2+ → 9.' },
              { tipo: 'superficie',   desc: 'Tratamento da face que amplifica o efeito da textura no Spin.' },
              { tipo: 'ergonomia',    desc: 'Tecnologia de cabo/punho. Aparece como "agarre real" na ficha; não altera notas.' },
              { tipo: 'declarativa',  desc: 'Nome comercial sem efeito físico classificado. Aparece em Acabamentos; não altera notas.' },
            ].map(({ tipo, desc }) => (
              <div key={tipo} className="flex gap-2 text-[10px] leading-snug">
                <span className="shrink-0 font-medium text-gray-500 w-20">{tipo}</span>
                <span className="text-gray-400">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback do motor */}
        {motorResult && (
          <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-2.5 text-xs text-teal-700 flex gap-4">
            <span className="font-medium">Motor recalculado:</span>
            <span>Spin → <strong>{motorResult.spin}</strong></span>
            <span>Conforto → <strong>{motorResult.comfort}</strong></span>
            <span>Estabilidade → <strong>{motorResult.stability}</strong></span>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {pending ? 'Salvando…' : 'Salvar + Recalcular ↻'}
          </button>
        </div>
      </div>
    </section>
  )
}
