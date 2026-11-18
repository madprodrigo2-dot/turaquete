'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ComparePicker from '@/components/ComparePicker'
import type { RacketWithInsights } from '@/lib/recommend'

interface Props {
  rackets: RacketWithInsights[]
  popularPairs: { name: string; slug: string }[][]
}

function Content({
  rackets, popularPairs, a, b,
}: Props & { a?: string | null; b?: string | null }) {
  // ?a= / ?b= vêm de links na ficha da raquete e na landing. Ler aqui no cliente
  // (e não em searchParams do servidor) mantém /comparar estática/ISR.
  const initialSlotA = a ? rackets.find(r => r.slug === a) : undefined
  const initialSlotB = b ? rackets.find(r => r.slug === b) : undefined

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold text-tinta">Comparar raquetes</h1>
        <p className="text-tinta/60 text-sm">
          {initialSlotA
            ? `${initialSlotA.name} já está no slot A — escolha a segunda raquete.`
            : 'Escolha duas raquetes para comparar pontuações e especificações lado a lado.'}
        </p>
      </div>
      <ComparePicker
        key={`${initialSlotA?.slug ?? ''}|${initialSlotB?.slug ?? ''}`}
        rackets={rackets}
        initialSlotA={initialSlotA}
        initialSlotB={initialSlotB}
        popularPairs={popularPairs}
      />
    </>
  )
}

function WithParams(props: Props) {
  const sp = useSearchParams()
  return <Content {...props} a={sp.get('a')} b={sp.get('b')} />
}

export default function ComparePageClient(props: Props) {
  return (
    <Suspense fallback={<Content {...props} />}>
      <WithParams {...props} />
    </Suspense>
  )
}
