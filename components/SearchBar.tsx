'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

type Item = { name: string; slug: string; brand: string | null; price: number | null }

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const MAX_RESULTS = 7

export default function SearchBar() {
  const router = useRouter()
  const [items, setItems]       = useState<Item[]>([])
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const [active, setActive]     = useState(-1)
  const [expanded, setExpanded] = useState(false) // mobile expand state
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/busca').then(r => r.json()).then(setItems).catch(() => {})
  }, [])

  const results = query.trim().length === 0 ? [] : (() => {
    const q = normalize(query.trim())
    return items
      .filter(r => normalize(r.name).includes(q) || normalize(r.brand ?? '').includes(q))
      .slice(0, MAX_RESULTS)
  })()

  useEffect(() => { setActive(-1) }, [query])
  useEffect(() => { setOpen(results.length > 0 || query.trim().length >= 2) }, [results.length, query])

  const navigate = useCallback((slug: string) => {
    setQuery('')
    setOpen(false)
    setExpanded(false)
    router.push(`/raquetes/${slug}`)
  }, [router])

  const submit = useCallback(() => {
    if (active >= 0 && results[active]) {
      navigate(results[active].slug)
    } else if (query.trim()) {
      setOpen(false)
      setExpanded(false)
      router.push(`/busca?q=${encodeURIComponent(query.trim())}`)
    }
  }, [active, results, query, navigate, router])

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      setExpanded(false)
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!query) setExpanded(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [query])

  function formatPrice(p: number | null) {
    if (!p) return null
    return `R$ ${p.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Mobile: lupa icon que expande */}
      <button
        onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        aria-label="Abrir busca"
        className={`md:hidden p-1.5 text-tinta/40 hover:text-aqua transition-colors rounded-lg ${expanded ? 'hidden' : 'flex'}`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Input — sempre visível em desktop, condicional em mobile */}
      <div className={`${expanded ? 'flex' : 'hidden'} md:flex items-center relative`}>
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta/30 pointer-events-none shrink-0"
          width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
        >
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (results.length > 0 || query.trim().length >= 2) setOpen(true) }}
          onKeyDown={onKey}
          placeholder="Buscar raquete..."
          aria-label="Buscar raquete por nome ou marca"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
          className="pl-8 pr-8 py-1.5 text-sm w-40 md:w-52 border border-tinta/12 rounded-lg bg-white/80 text-tinta placeholder:text-tinta/30 focus:outline-none focus:ring-2 focus:ring-aqua/30 focus:border-aqua/60 focus:w-56 md:focus:w-64 transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-tinta/30 hover:text-tinta/60 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Sugestões de raquetes"
          className="absolute top-full right-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-tinta/8 z-50 overflow-hidden py-1"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-tinta/40">
              Nenhuma raquete encontrada para &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            <>
              {results.map((r, i) => (
                <button
                  key={r.slug}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => navigate(r.slug)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === active ? 'bg-aqua/8' : 'hover:bg-tinta/4'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-tinta leading-snug truncate">{r.name}</span>
                    {r.brand && <span className="text-xs text-tinta/40 leading-snug">{r.brand}</span>}
                  </div>
                  {r.price && (
                    <span className="text-xs font-semibold text-coral shrink-0">{formatPrice(r.price)}</span>
                  )}
                </button>
              ))}
              {query.trim() && (
                <button
                  onClick={() => {
                    setOpen(false)
                    setExpanded(false)
                    router.push(`/busca?q=${encodeURIComponent(query.trim())}`)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-aqua hover:bg-aqua/6 transition-colors border-t border-tinta/6 font-medium"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Ver todos os resultados para &ldquo;{query.trim()}&rdquo;
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
