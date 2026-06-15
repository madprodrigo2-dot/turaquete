'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Geral',      href: '/admin/intencoes' },
  { label: 'Análise',    href: '/admin/analise'   },
  { label: 'Qualidade',  href: '/admin/qualidade'  },
  { label: 'Afiliados',  href: '/admin/afiliados'  },
]

export default function AdminNav() {
  const pathname = usePathname()
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
    </nav>
  )
}
