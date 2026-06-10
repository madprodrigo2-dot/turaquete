'use client'
import { track } from '@vercel/analytics/react'
import { sendGAEvent } from '@next/third-parties/google'

interface Props {
  href: string
  racketName: string
  racketSlug: string
  children: React.ReactNode
  className?: string
}

export default function BuyButton({ href, racketName, racketSlug, children, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      onClick={() => {
        track('affiliate_click', { racket: racketSlug, name: racketName })
        sendGAEvent({ event: 'clique_afiliado', racket: racketSlug })
      }}
    >
      {children}
    </a>
  )
}
