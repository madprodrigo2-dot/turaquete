import type { Metadata } from 'next'
import TaticaClient from './TaticaClient'

// Protótipo exploratório — puzzles táticos hardcoded, sem Supabase. Não linkado
// de nenhum lugar do site ainda; página solta pra validação visual.
//
// robots noindex/nofollow (não queremos indexação no Google) é independente
// das tags openGraph/twitter abaixo (lidas por crawlers de preview do
// WhatsApp/Telegram/etc., não por crawlers de busca) — podem conviver sem
// conflito, confirmado direto no HTML servido antes desta mudança.
const OG_TITLE       = 'Qual é a jogada certa?'
const OG_DESCRIPTION = 'Táticas de beach tennis — teste seu olho de jogo em situações reais de quadra.'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Táticas (protótipo)', // layout aplica o template "%s | Turaquete" — antes duplicava o sufixo
  openGraph: {
    title:       OG_TITLE,
    description: OG_DESCRIPTION,
    url:         'https://www.turaquete.com.br/tatica',
    siteName:    'Turaquete',
    locale:      'pt_BR',
    type:        'website',
    images: [{ url: '/tatica/opengraph-image', width: 1200, height: 630, alt: OG_TITLE }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       OG_TITLE,
    description: OG_DESCRIPTION,
    images:      ['/tatica/opengraph-image'],
  },
}

export default function TaticaPage() {
  return <TaticaClient />
}
