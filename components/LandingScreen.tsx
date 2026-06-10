import Image from 'next/image'
import { Brand } from '@/lib/recommend'

interface Props {
  onStart: () => void
  brands: Brand[]
}

const BADGES = ['Grátis', '1 minuto', 'Sem cadastro']

const ANALYSIS_ITEMS = [
  { icon: '📊', label: 'Seu nível' },
  { icon: '🏸', label: 'Seu estilo' },
  { icon: '💪', label: 'Dores no braço' },
  { icon: '💰', label: 'Orçamento' },
]

function StatusIndicator({ status }: { status: Brand['status'] }) {
  if (status === 'disponivel') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-emerald-600 text-xs font-medium">Disponível</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex rounded-full h-2 w-2 bg-gray-300" />
      <span className="text-gray-400 text-xs font-medium">Em breve</span>
    </div>
  )
}

export default function LandingScreen({ onStart, brands }: Props) {
  return (
    <div className="min-h-screen bg-aqua-light flex flex-col items-center px-5 md:px-8 py-10 md:py-16">
      <div className="w-full max-w-sm md:max-w-xl flex flex-col gap-7 md:gap-9">

        {/* Logo */}
        <div className="flex justify-center pt-2">
          <Image
            src="/turaquete-logo.svg"
            alt="Turaquete"
            width={820}
            height={240}
            priority
            className="h-24 md:h-36 w-auto"
          />
        </div>

        {/* Título + subtítulo */}
        <div className="flex flex-col gap-3 md:gap-4">
          <h1 className="text-[2rem] md:text-5xl font-bold text-tinta leading-tight">
            Uma consultoria de especialista. De graça.
          </h1>
          <p className="text-tinta/70 text-base md:text-lg leading-relaxed">
            Conte como você joga e receba a raquete ideal em 1 minuto, analisando seu nível, estilo, dores no braço e orçamento.
          </p>
        </div>

        {/* Franja destacada */}
        <div className="bg-aqua/15 border-l-4 border-coral rounded-r-xl px-4 py-3 md:px-5 md:py-4">
          <p className="text-tinta font-medium text-sm md:text-base leading-relaxed">
            O mesmo que um especialista faz numa consultoria paga — aqui sem custo.
          </p>
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          {BADGES.map(badge => (
            <span
              key={badge}
              className="bg-white text-tinta text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border border-aqua/30 shadow-sm"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Marcas disponíveis */}
        {brands.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-tinta font-semibold text-sm md:text-base">Marcas disponíveis</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {brands.map(brand => (
                <div
                  key={brand.id}
                  className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-aqua/20 shadow-sm"
                >
                  <span className="text-tinta text-sm font-medium">{brand.name}</span>
                  <StatusIndicator status={brand.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analisamos seu jogo */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-aqua/20">
          <p className="text-tinta font-semibold text-sm md:text-base mb-4">Analisamos seu jogo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ANALYSIS_ITEMS.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xl w-7 text-center leading-none">{item.icon}</span>
                <span className="text-tinta text-sm md:text-base">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full bg-coral text-white font-semibold text-base md:text-lg py-4 md:py-5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
        >
          Começar agora
        </button>

        {/* Linha de confiança */}
        <p className="text-center text-tinta/50 text-xs md:text-sm leading-relaxed">
          Recomendações baseadas em specs reais e análise especializada. Sem achismo.
        </p>

        {/* Footer */}
        <footer className="pt-2 pb-2 flex justify-center border-t border-tinta/10">
          <a
            href="mailto:contato@turaquete.com.br"
            className="text-tinta/40 text-xs hover:text-tinta/70 transition-colors"
          >
            Contato
          </a>
        </footer>

      </div>
    </div>
  )
}
