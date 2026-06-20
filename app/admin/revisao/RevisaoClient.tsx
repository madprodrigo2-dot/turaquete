'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { salvarRevisao } from './actions'

export type ReviewStatus = 'pendente' | 'ok' | 'flagged'

export type RevisaoCard = {
  id: number
  name: string
  slug: string
  brand: string
  model_year: number | null
  image_url: string | null
  publicada: boolean
  price: number | null
  source_url: string | null
  affiliate_url: string | null
  face_material: string | null
  faceGrade: string
  core: string | null
  coreClass: string
  weight_g: number | null
  balance: string | null
  espessura_mm: number | null
  furos: number | null
  superficie: string | null
  tecnologias: { nome: string; tipo: string }[]
  atleta: string | null
  atletas: string[]
  perfil_resumo: string | null
  power: number | null
  control: number | null
  comfort: number | null
  maneuverability: number | null
  stability: number | null
  spin: number | null
  forgiveness: number | null
  scoreGeral: number | null
  nivel: string | null
  review_status: ReviewStatus
  review_note: string | null
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const FACE_STYLE: Record<string, string> = {
  VIDRO: 'bg-blue-100 text-blue-700',
  HYBRID_VIDRO: 'bg-indigo-100 text-indigo-700',
  KEVLAR_PURE: 'bg-emerald-100 text-emerald-800',
  KEVLAR_CARBON: 'bg-teal-100 text-teal-700',
  CARBON_3K: 'bg-gray-100 text-gray-600',
  CARBON_3K_METAL: 'bg-slate-100 text-slate-600',
  CARBON_6K_15K: 'bg-orange-100 text-orange-700',
  CARBON_24K: 'bg-violet-100 text-violet-700',
  CARBON_18K: 'bg-purple-100 text-purple-700',
}

const CORE_STYLE: Record<string, string> = {
  SUPERSOFT: 'bg-sky-100 text-sky-700',
  SOFT: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-gray-100 text-gray-600',
  HARD: 'bg-red-100 text-red-700',
}

const STATUS_STYLE: Record<ReviewStatus, string> = {
  pendente: 'bg-gray-100 text-gray-500',
  ok: 'bg-green-100 text-green-700',
  flagged: 'bg-amber-100 text-amber-700',
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pendente: 'Pendente',
  ok: 'OK',
  flagged: 'Flagged',
}

const TIPO_SHORT: Record<string, string> = {
  'antivibração': 'antivib',
  antivibracao: 'antivib',
  estrutural: 'estrut',
  superficie: 'sup',
  ergonomia: 'ergo',
  declarativa: 'decl',
  'furação': 'furos',
  tecnologia: 'tech',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScorePill({ label, value }: { label: string; value: number | null }) {
  const bg =
    value == null ? 'bg-gray-100' :
    value >= 8 ? 'bg-teal-500' :
    value >= 6 ? 'bg-amber-400' :
    'bg-red-400'
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
        <span className={`text-[11px] font-bold ${value == null ? 'text-gray-400' : 'text-white'}`}>
          {value ?? '--'}
        </span>
      </div>
      <span className="text-[9px] text-gray-400">{label}</span>
    </div>
  )
}

function SpecRow({
  label, raw, badge, badgeStyle, missing,
}: {
  label: string
  raw: string | null
  badge: string
  badgeStyle: string
  missing?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-xs min-w-0">
      <span className="text-gray-400 w-7 shrink-0 text-right">{label}</span>
      <span className={`flex-1 truncate ${missing ? 'text-red-400 italic' : 'text-gray-700'}`}>
        {raw ?? 'ausente'}
      </span>
      <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${badgeStyle}`}>
        {badge}
      </span>
    </div>
  )
}

function RacketCard({
  card,
  status,
  note,
  onOk,
  onFlag,
  onPendente,
}: {
  card: RevisaoCard
  status: ReviewStatus
  note: string | null
  onOk: () => void
  onFlag: (note: string) => void
  onPendente: () => void
}) {
  const [flagging, setFlagging] = useState(false)
  const [flagNote, setFlagNote] = useState(note ?? '')
  const [descOpen, setDescOpen] = useState(false)

  const warnings: string[] = []
  if (!card.price) warnings.push('sem preco')
  if (!card.source_url && !card.affiliate_url) warnings.push('sem link')
  if (!card.core) warnings.push('sem core')

  const borderColor =
    status === 'ok' ? 'border-green-200' :
    status === 'flagged' ? 'border-amber-300' :
    'border-gray-200'

  return (
    <div className={`rounded-xl border overflow-hidden bg-white ${borderColor}`}>
      {/* Header strip */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-[10px] text-gray-400 shrink-0">#{card.id}</span>
        <span className="text-[10px] font-mono text-gray-400 truncate flex-1 min-w-0">{card.slug}</span>
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${card.publicada ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>
          {card.publicada ? 'pub' : 'rascunho'}
        </span>
      </div>

      {/* Body: image + content */}
      <div className="flex flex-col sm:flex-row">
        {/* Photo */}
        <div className="sm:w-44 sm:shrink-0 bg-gray-50 border-b sm:border-b-0 sm:border-r border-gray-100 flex items-center justify-center">
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_url}
              alt={card.name}
              loading="lazy"
              className="h-52 sm:h-72 w-full object-contain p-3"
            />
          ) : (
            <div className="h-52 sm:h-72 w-full flex items-center justify-center text-xs text-gray-300">
              sem foto
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 divide-y divide-gray-100">
          {/* Identity */}
          <div className="px-4 py-3">
            <h3 className="font-semibold text-sm text-gray-900 leading-tight">{card.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {card.brand}
              {card.model_year ? ` · ${card.model_year}` : ''}
              {card.atletas.map(a => (
                <span key={a} className="inline-flex items-center gap-1 ml-1 text-[10px] bg-violet-50 text-violet-600 border border-violet-100 rounded px-1.5 py-0.5 font-medium not-italic">
                  {a}
                </span>
              ))}
            </p>
          </div>

          {/* Raw specs */}
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Fisicos crudos</p>
            <SpecRow
              label="face"
              raw={card.face_material}
              badge={card.faceGrade}
              badgeStyle={FACE_STYLE[card.faceGrade] ?? 'bg-gray-100 text-gray-600'}
              missing={!card.face_material}
            />
            <SpecRow
              label="core"
              raw={card.core}
              badge={card.coreClass}
              badgeStyle={CORE_STYLE[card.coreClass] ?? 'bg-gray-100 text-gray-600'}
              missing={!card.core}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 pl-9">
              {card.weight_g != null && (
                <span><span className="text-gray-400">peso</span> {card.weight_g}g</span>
              )}
              {card.balance && (
                <span><span className="text-gray-400">bal</span> {card.balance}</span>
              )}
              {card.espessura_mm != null && (
                <span><span className="text-gray-400">esp</span> {card.espessura_mm}mm</span>
              )}
              {card.furos != null && (
                <span><span className="text-gray-400">furos</span> {card.furos}</span>
              )}
              {card.superficie && (
                <span><span className="text-gray-400">sup</span> {card.superficie}</span>
              )}
            </div>
          </div>

          {/* Technologies */}
          {card.tecnologias.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Tecnologias</p>
              <div className="flex flex-wrap gap-1.5">
                {card.tecnologias.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5"
                  >
                    {t.nome}
                    <span className="text-[9px] bg-gray-200 text-gray-500 rounded px-1">
                      {TIPO_SHORT[t.tipo] ?? t.tipo}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scores */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Scores</p>
              {card.nivel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                  {card.nivel}
                </span>
              )}
              {card.scoreGeral != null && (
                <span className="text-[10px] text-gray-400">geral {card.scoreGeral.toFixed(1)}</span>
              )}
              {card.price != null && (
                <span className="text-[10px] text-gray-400 ml-auto">
                  R$ {card.price.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <ScorePill label="pow" value={card.power} />
              <ScorePill label="ctrl" value={card.control} />
              <ScorePill label="cmf" value={card.comfort} />
              <ScorePill label="man" value={card.maneuverability} />
              <ScorePill label="stb" value={card.stability} />
              <ScorePill label="spn" value={card.spin} />
              <ScorePill label="forg" value={card.forgiveness} />
            </div>
            {warnings.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {warnings.map(w => (
                  <span key={w} className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded">
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {card.perfil_resumo && (
            <div className="px-4 py-3">
              <button
                onClick={() => setDescOpen(v => !v)}
                className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              >
                Descricao {descOpen ? '▲' : '▼'}
              </button>
              {descOpen && (
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">{card.perfil_resumo}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flag note display (flagged and not editing) */}
      {status === 'flagged' && note && !flagging && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
          <span className="text-xs font-medium text-amber-700">Flag: </span>
          <span className="text-xs text-amber-600">{note}</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50/70 border-t border-gray-100">
        {flagging ? (
          <div className="space-y-2">
            <textarea
              value={flagNote}
              onChange={e => setFlagNote(e.target.value)}
              placeholder="Descreva o problema (ex: foto errada, EVA mal, spin alto, preco raro)"
              rows={2}
              autoFocus
              className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 resize-none focus:ring-1 focus:ring-amber-400 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onFlag(flagNote); setFlagging(false) }}
                className="px-4 py-2 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                Salvar flag
              </button>
              <button
                onClick={() => { setFlagging(false); setFlagNote(note ?? '') }}
                className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {status !== 'ok' && (
              <button
                onClick={onOk}
                className="px-4 py-2 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                OK
              </button>
            )}
            <button
              onClick={() => { setFlagging(true); setFlagNote(note ?? '') }}
              className="px-4 py-2 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Flaggear
            </button>
            {status !== 'pendente' && (
              <button
                onClick={onPendente}
                className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Resetar
              </button>
            )}
            <Link
              href={`/admin/rackets/${card.slug}`}
              target="_blank"
              className="ml-auto text-xs text-gray-400 hover:text-teal-600 transition-colors"
            >
              Editar ↗
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

type LocalReview = { status: ReviewStatus; note: string }

export default function RevisaoClient({
  cards,
  brands,
}: {
  cards: RevisaoCard[]
  brands: string[]
}) {
  const [localReviews, setLocalReviews] = useState<Map<number, LocalReview>>(new Map())
  const [filterBrand, setFilterBrand] = useState('todos')
  const [filterStatus, setFilterStatus] = useState<'todos' | ReviewStatus>('todos')
  const [filterPub, setFilterPub] = useState('todos')
  const [, startTransition] = useTransition()

  const merged = useMemo(() =>
    cards.map(c => {
      const local = localReviews.get(c.id)
      if (!local) return c
      return { ...c, review_status: local.status, review_note: local.note }
    }),
    [cards, localReviews]
  )

  const filtered = useMemo(() =>
    merged.filter(c => {
      if (filterBrand !== 'todos' && c.brand !== filterBrand) return false
      if (filterStatus !== 'todos' && c.review_status !== filterStatus) return false
      if (filterPub === 'publicadas' && !c.publicada) return false
      return true
    }),
    [merged, filterBrand, filterStatus, filterPub]
  )

  const totalAll = merged.length
  const reviewedAll = merged.filter(c => c.review_status !== 'pendente').length
  const pct = totalAll > 0 ? Math.round((reviewedAll / totalAll) * 100) : 0

  const countByStatus = (s: ReviewStatus) => merged.filter(c => c.review_status === s).length

  function setReview(id: number, status: ReviewStatus, note: string) {
    setLocalReviews(prev => new Map(prev).set(id, { status, note }))
    startTransition(async () => {
      await salvarRevisao(id, status, note)
    })
  }

  return (
    <div>
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-sm font-semibold text-gray-900">Modo Revisao</h1>
          <span className="text-xs text-gray-500">
            {reviewedAll} / {totalAll} revisadas ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] text-gray-400">
          <span className="text-green-600">{countByStatus('ok')} ok</span>
          <span className="text-amber-600">{countByStatus('flagged')} flagged</span>
          <span>{countByStatus('pendente')} pendentes</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-teal-500 outline-none bg-white"
        >
          <option value="todos">Todas as marcas</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['todos', 'pendente', 'ok', 'flagged'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
              {s !== 'todos' && (
                <span className="ml-1 opacity-70">({countByStatus(s)})</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {([['todos', 'Todas'], ['publicadas', 'Publicadas']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterPub(v)}
              className={`px-3 py-1.5 transition-colors ${
                filterPub === v
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 self-center">
          {filtered.length} exibidas
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map(card => {
          const local = localReviews.get(card.id)
          const status = local?.status ?? card.review_status
          const note = local?.note ?? card.review_note
          return (
            <RacketCard
              key={card.id}
              card={card}
              status={status}
              note={note}
              onOk={() => setReview(card.id, 'ok', '')}
              onFlag={n => setReview(card.id, 'flagged', n)}
              onPendente={() => setReview(card.id, 'pendente', '')}
            />
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm">
            Nenhuma raqueta com os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  )
}
