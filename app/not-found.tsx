import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Página não encontrada — Turaquete',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-aqua-light flex flex-col items-center justify-center px-5 text-center gap-6">
      <Link href="/" aria-label="Voltar à página inicial" className="cursor-pointer">
        <Image
          src="/turaquete-logo.png"
          alt="Turaquete"
          width={852}
          height={474}
          className="h-8 w-auto"
          style={{ width: 'auto' }}
        />
      </Link>
      <Image
        src="/tury-apenada.png"
        alt="Tury, a mascote da Turaquete, com cara de desculpa"
        width={300}
        height={300}
        className="w-[140px] md:w-[160px] h-auto"
        priority
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading font-extrabold text-tinta text-2xl md:text-3xl leading-tight">
          Opa! Essa página saiu da quadra.
        </h1>
        <p className="text-tinta/60 text-base md:text-lg leading-relaxed max-w-xs mx-auto">
          Parece que esse endereço não existe — ou a bola foi longe demais.
        </p>
      </div>
      <Link
        href="/"
        className="font-heading font-bold bg-coral text-white text-base px-6 py-3 rounded-2xl hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all shadow-md"
      >
        Voltar para a quadra
      </Link>
    </div>
  )
}
