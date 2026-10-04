'use client'

import { usePathname } from 'next/navigation'

export default function SiteFooter() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  // /tatica é noindex/nofollow, isolada, sem link nenhum pra fora (nem pro
  // resto do site) e sem nenhum link de afiliado na página — o disclaimer
  // não se aplica aqui. Esconder o footer também é o que falta pro piloto
  // "badge na quadra" ficar com zero scroll de verdade (Rodrigo confirmou
  // que o scroll que via era chegar nesse footer, não o conteúdo do puzzle).
  if (pathname?.startsWith('/tatica')) return null

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
