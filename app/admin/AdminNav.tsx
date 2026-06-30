'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAdminTheme } from './AdminShell'

const TABS = [
  { label: 'Dados',       href: '/admin/analise'    },
  { label: 'Cliques',     href: '/admin/cliques'    },
  { label: 'Ranking',     href: '/admin/ranking'    },
  { label: 'Afiliados',   href: '/admin/afiliados'  },
  { label: 'Conversas',   href: '/admin/conversas'  },
  { label: 'Raquetas',    href: '/admin/rackets'    },
  { label: 'Motor',       href: '/admin/motor'      },
  { label: 'Conteúdo',    href: '/admin/qualidade'  },
]

export default function AdminNav() {
  const pathname = usePathname()
  const { dark, toggle } = useAdminTheme()
  const [open, setOpen] = useState(false)

  function isActive(tab: { href: string }) {
    return pathname === tab.href || pathname.startsWith(tab.href + '?') || pathname.startsWith(tab.href + '/')
  }

  const activeTab = TABS.find(isActive)

  return (
    <div className="flex items-center gap-2">

      {/* Dropdown para todos os tamanhos */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-700 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <span>{activeTab?.label ?? 'Menu'}</span>
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[150px]">
              {TABS.map(tab => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center px-4 py-2.5 text-xs font-medium transition-colors ${
                    isActive(tab)
                      ? 'text-teal-600 bg-teal-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tema */}
      <button
        onClick={toggle}
        aria-label="Alternar tema"
        className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        {dark ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
