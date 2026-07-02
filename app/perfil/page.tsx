import type { Metadata } from 'next'
import QuizPerfilClient from '@/components/QuizPerfilClient'

export const metadata: Metadata = {
  title: 'Qual é o seu perfil de jogador de beach tennis? | Turaquete',
  description:
    'Descubra se você é Muralha, Canhão, Finalizador, Dono da Rede, Contra-Atacante ou Camaleão. Quiz gratuito de 7 perguntas baseado nos estilos de jogo do tênis profissional.',
  openGraph: {
    title: 'Qual é o seu perfil de jogador de beach tennis?',
    description: 'Quiz gratuito · 7 perguntas · resultado na hora.',
    url: 'https://www.turaquete.com.br/perfil',
    siteName: 'Turaquete',
    locale: 'pt_BR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.turaquete.com.br/perfil',
  },
}

export default function PerfilPage() {
  return (
    <main className="min-h-screen bg-fundo flex flex-col">
      <QuizPerfilClient />
    </main>
  )
}
