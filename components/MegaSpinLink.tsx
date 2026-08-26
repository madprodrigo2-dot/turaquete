'use client'

import { WhatsappLogo } from '@phosphor-icons/react'

const MEGASPIN_PHONE = '5547991086948'

function buildMegaSpinUrl(racketName: string): string {
  const text = `Olá! Vim da Turaquete e gostaria de saber sobre o tratamento para a minha raquete ${racketName}.`
  return `https://api.whatsapp.com/send/?phone=${MEGASPIN_PHONE}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`
}

function fireParceriaClick(body: Record<string, unknown>) {
  const payload = JSON.stringify(body)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/parceria-click', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/parceria-click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {})
  }
}

interface Props {
  racketId: number
  racketSlug: string
  racketName: string
}

export default function MegaSpinLink({ racketId, racketSlug, racketName }: Props) {
  const href = buildMegaSpinUrl(racketName)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => fireParceriaClick({ racket_id: racketId, slug: racketSlug, racket_name: racketName, destination_url: href })}
      className="mt-3 pt-3 border-t border-aqua/10 flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
    >
      <WhatsappLogo size={14} weight="fill" aria-hidden="true" className="shrink-0" />
      Quer aplicar tratamento? Fale com a MegaSpin
    </a>
  )
}
