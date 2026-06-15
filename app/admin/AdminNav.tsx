'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminTheme } from './AdminShell'

const TABS = [
  { label: 'Geral',      href: '/admin/intencoes' },
  { label: 'Análise',    href: '/admin/analise'   },
  { label: 'Qualidade',  href: '/admin/qualidade'  },
  { label: 'Afiliados',  href: '/admin/afiliados'  },
]

export default function AdminNav() {
  const pathname = usePathname()
  const { dark, toggle } = useAdminTheme()

  return (
    <nav className="flex items-center gap-0.5">
      {TABS.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '?') || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              active
                ? 'bg-teal-600 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
      <button
        onClick={toggle}
        aria-label="Alternar tema"
        className="ml-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
    </nav>
  )
}
