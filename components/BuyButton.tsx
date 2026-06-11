'use client'
import { track } from '@vercel/analytics/react'
import { sendGAEvent } from '@next/third-parties/google'

interface Props {
  href: string
  racketName: string
  racketSlug: string
  linkTipo: 'afiliado' | 'oficial'
  children: React.ReactNode
  className?: string
}

export default function BuyButton({ href, racketName, racketSlug, linkTipo, children, className }: Props) {
  const gaEvent = linkTipo === 'afiliado' ? 'clique_afiliado' : 'clique_loja_oficial'
  return (
    <a
      href={href}
      target="_blank"
      rel={`noopener noreferrer${linkTipo === 'afiliado' ? ' sponsored' : ''}`}
      className={className}
      onClick={() => {
        track('affiliate_click', { racket: racketSlug, name: racketName, tipo: linkTipo })
        sendGAEvent({ event: gaEvent, racket: racketSlug })
      }}
    >
      {children}
    </a>
  )
}
