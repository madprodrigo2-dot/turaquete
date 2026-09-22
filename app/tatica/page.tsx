import type { Metadata } from 'next'
import TaticaClient from './TaticaClient'

// Protótipo exploratório — puzzles táticos hardcoded, sem Supabase. Não linkado
// de nenhum lugar do site ainda; página solta pra validação visual.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Táticas (protótipo) | Turaquete',
}

export default function TaticaPage() {
  return <TaticaClient />
}
