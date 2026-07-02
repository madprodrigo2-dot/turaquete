import type { Metadata } from 'next'
import Link from 'next/link'
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
    <div className="min-h-screen sand-texture">
      <div className="max-w-md mx-auto px-5 pt-4 pb-1">
        <Link href="/" className="text-aqua text-sm font-medium hover:underline">
          ← Voltar
        </Link>
      </div>
      <QuizPerfilClient />
    </div>
  )
}
