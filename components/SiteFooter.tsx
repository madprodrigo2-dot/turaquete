'use client'

import { usePathname } from 'next/navigation'

export default function SiteFooter() {
  const isHome = usePathname() === '/'

  return (
    <footer
      data-site-footer
      className={`w-full border-t border-tinta/10 py-5 px-4 text-center text-[11px] text-tinta/40 leading-relaxed ${
        isHome ? 'bg-[#FBF6EF]' : 'mt-8'
      }`}
    >
      <p>
        Alguns links neste site são de afiliado. Podemos receber comissão sobre compras realizadas por esses links,
        sem custo adicional para você. Isso não influencia nossas recomendações.{' '}
        <a href="/termos" className="underline underline-offset-2 hover:text-tinta/60 transition-colors">
          Política de afiliados
        </a>
        .
      </p>
      <p className="mt-1">© {new Date().getFullYear()} Turaquete</p>
    </footer>
  )
}
