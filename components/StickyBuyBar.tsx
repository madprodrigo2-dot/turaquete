'use client'

import { useEffect, useState } from 'react'
import BuyButton from './BuyButton'

interface Props {
  price: string | null
  href: string
  racketName: string
  racketSlug: string
  linkTipo: 'afiliado' | 'oficial'
  observeId: string
}

// Mobile-only sticky CTA — mesmo padrão do showBottomCta do home (LandingScreen.tsx):
// observa o CTA principal via IntersectionObserver e só monta quando ele sai da
// viewport, pra não duplicar o botão enquanto o principal ainda está visível.
// Observa também o footer global ([data-site-footer]) e esconde a barra quando
// ele aparece — mesma lógica do home, que para de mostrar o CTA flutuante ao
// chegar no fim do conteúdo (lá, mirando o fim do FAQ) pra não tapar o rodapé.
export default function StickyBuyBar({ price, href, racketName, racketSlug, linkTipo, observeId }: Props) {
  const [mainCtaVisible, setMainCtaVisible] = useState(true)
  const [footerVisible, setFooterVisible] = useState(false)

  useEffect(() => {
    const el = document.getElementById(observeId)
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setMainCtaVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [observeId])

  useEffect(() => {
    const footer = document.querySelector('[data-site-footer]')
    if (!footer) return
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const visible = !mainCtaVisible && !footerVisible

  if (!visible) return null

  return (
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-5 pb-5 pt-14 pointer-events-none"
      style={{ background: 'linear-gradient(to top, var(--color-arena) 55%, rgba(247,237,220,0.75) 80%, transparent 100%)' }}
    >
      <BuyButton
        href={href}
        racketName={racketName}
        racketSlug={racketSlug}
        linkTipo={linkTipo}
        className="pointer-events-auto w-full bg-coral text-white font-semibold text-base py-4 rounded-2xl shadow-cta active:scale-[0.98] transition-all text-center block"
      >
        {price ? `Ver na loja → ${price}` : 'Ver na loja →'}
      </BuyButton>
    </div>
  )
}
