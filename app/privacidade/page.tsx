import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacidade — Turaquete',
  description: 'Política de privacidade da Turaquete.',
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen sand-texture flex flex-col items-center px-5 py-12 md:py-16">
      <div className="w-full max-w-xl flex flex-col gap-6">

        <Link href="/" className="text-aqua text-sm font-medium hover:underline">
          ← Voltar
        </Link>

        <h1 className="font-heading font-extrabold text-tinta text-3xl md:text-4xl leading-tight">
          Privacidade
        </h1>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-aqua/20 shadow-sm flex flex-col gap-6 text-tinta/80 text-sm md:text-base leading-relaxed">

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">Conversas</h2>
            <p>
              As mensagens trocadas com o consultor da Turaquete podem ser armazenadas de forma anônima para melhorar a qualidade das recomendações. Nenhuma informação pessoal identificável é coletada ou vinculada ao conteúdo das conversas.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">Métricas de uso</h2>
            <p>
              Utilizamos o Google Analytics para entender como o site é usado: páginas visitadas, tempo de sessão e eventos de navegação. Esses dados são agregados e anônimos. Nenhum dado pessoal é enviado ao Google.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">Links de afiliado</h2>
            <p>
              Os links para compra de raquetes apontam para o Mercado Livre e lojas parceiras. A Turaquete pode receber uma comissão sobre compras realizadas por esses links, sem custo adicional para você. Isso não influencia as recomendações, que são baseadas exclusivamente nas especificações técnicas e no seu perfil de jogo.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading font-bold text-tinta text-base md:text-lg">Contato</h2>
            <p>
              Dúvidas sobre privacidade? Fale com a gente:{' '}
              <a
                href="mailto:contato@turaquete.com.br"
                className="text-aqua hover:underline"
              >
                contato@turaquete.com.br
              </a>
              {' '}ou pelo{' '}
              <a
                href="https://wa.me/5547997649011?text=Oi!%20Vim%20pelo%20Turaquete%20e%20queria%20tirar%20uma%20d%C3%BAvida."
                target="_blank"
                rel="noopener noreferrer"
                className="text-aqua hover:underline"
              >
                WhatsApp
              </a>
              .
            </p>
          </section>

        </div>

        <p className="text-center text-tinta/30 text-xs">
          Última atualização: junho de 2026
        </p>

      </div>
    </div>
  )
}
