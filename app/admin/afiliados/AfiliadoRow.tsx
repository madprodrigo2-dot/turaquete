'use client'

import { useState } from 'react'

interface Props {
  id: number
  name: string
  brandName: string
  price: number | null
  publicada: boolean
  isActive: boolean | null
  affiliateUrl: string | null
  sourceUrl: string | null
  fallbackUrl: string | null
  searchFallbackActive?: boolean
}

export default function AfiliadoRow({ id, name, brandName, price, publicada, isActive, affiliateUrl, sourceUrl, fallbackUrl, searchFallbackActive = false }: Props) {
  const [url, setUrl] = useState(affiliateUrl ?? '')
  const [status, setStatus] = useState<null | 'saving' | 'ok' | string>(null)
  const [hasAffiliate, setHasAffiliate] = useState(!!affiliateUrl)
  const [hasTag, setHasTag] = useState(affiliateUrl?.includes('matt_word') ?? false)

  const dirty = url.trim() !== (affiliateUrl ?? '')
  const mlSemTag = url.trim().includes('mercadolivre') && !url.trim().includes('matt_word')
  const isInativo = isActive === false && hasAffiliate

  async function save() {
    const trimmed = url.trim()
    if (trimmed && !trimmed.startsWith('http')) {
      setStatus('URL inválida — deve começar com http')
      return
    }
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/afiliado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, affiliate_url: trimmed || null }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setStatus(data.error ?? 'Erro ao salvar')
      } else {
        setHasAffiliate(!!trimmed)
        setHasTag(trimmed.includes('matt_word'))
        setStatus('ok')
        setTimeout(() => setStatus(null), 3000)
      }
    } catch {
      setStatus('Erro de rede')
    }
  }

  const isFallback = !hasAffiliate && searchFallbackActive
  const tipoPill = isInativo
    ? <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">🔍 busca ML</span>
    : !hasAffiliate
      ? isFallback
        ? <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">🔍 busca ML</span>
        : sourceUrl
          ? <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">🔗 oficial</span>
          : <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-500">⚠ sem link</span>
      : !hasTag
        ? <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">⚠ sem tag</span>
        : <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">💰 afiliado</span>

  return (
    <tr className={`border-t border-gray-100 ${isInativo ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50/60'}`}>
      <td className="px-4 py-2.5">
        <div className="font-medium text-gray-800 text-sm leading-tight">{name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{brandName}</div>
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-600 tabular-nums whitespace-nowrap">
        {price != null ? `R$ ${price.toLocaleString('pt-BR')}` : '—'}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-1">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full w-fit ${
            publicada ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {publicada ? 'publicada' : 'rascunho'}
          </span>
          {isInativo && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit bg-red-100 text-red-600">
              indisponível
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {tipoPill}
      </td>
      <td className="px-4 py-2.5 w-full">
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setStatus(null) }}
            onKeyDown={e => { if (e.key === 'Enter' && dirty) save() }}
            placeholder="https://mercadolivre.com.br/..."
            className={`flex-1 min-w-0 text-[11px] border rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent ${
              isInativo ? 'border-red-200 bg-red-50' : 'border-gray-200'
            }`}
          />
          <button
            onClick={save}
            disabled={status === 'saving' || !dirty}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              status === 'saving'
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : dirty
                  ? 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800'
                  : 'bg-gray-100 text-gray-300 cursor-default'
            }`}
          >
            {status === 'saving' ? '...' : 'Salvar'}
          </button>
        </div>
        {isInativo && fallbackUrl && (
          <p className="text-[10px] text-red-500 mt-1 font-medium">
            🔴 Anúncio indisponível — cliques vão para:{' '}
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700 break-all">{fallbackUrl}</a>
          </p>
        )}
        {!isInativo && isFallback && fallbackUrl && (
          <p className="text-[10px] text-blue-500 mt-1 font-medium">
            🔍 Sem afiliado curado — cliques vão para:{' '}
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700 break-all">{fallbackUrl}</a>
          </p>
        )}
        {mlSemTag && (
          <p className="text-[10px] text-orange-500 mt-1 font-medium">⚠ Link ML sem tag de afiliado — comissão não rastreada</p>
        )}
        {affiliateUrl && (
          <p className="text-[10px] text-gray-400 mt-1 truncate font-mono" title={affiliateUrl}>
            afiliado: <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 underline">{affiliateUrl}</a>
          </p>
        )}
        {sourceUrl && (
          <p className="text-[10px] text-gray-400 mt-1 truncate font-mono" title={sourceUrl}>
            source: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 underline">{sourceUrl}</a>
          </p>
        )}
        {status === 'ok' && (
          <p className="text-[11px] text-green-600 mt-1">✓ Salvo</p>
        )}
        {status && status !== 'ok' && status !== 'saving' && (
          <p className="text-[11px] text-red-500 mt-1">{status}</p>
        )}
      </td>
    </tr>
  )
}
