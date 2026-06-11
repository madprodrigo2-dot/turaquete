import { RacketWithInsights } from './recommend'

export function gerarExplicacoes(racket: RacketWithInsights): string[] {
  const linhas: string[] = []
  const extra = (racket.specs_extra ?? {}) as Record<string, string | number>
  const core  = racket.core?.toLowerCase() ?? ''
  const face  = racket.face_material?.toLowerCase() ?? ''
  const trama  = (extra.trama_carbono  as string | undefined)?.toLowerCase()
  const textura = (extra.textura       as string | undefined)?.toLowerCase()
  const formato = (extra.formato_cabeca as string | undefined)?.toLowerCase()

  // ── EVA / núcleo ──────────────────────────────────────────────────────────
  if (core.includes('supersoft')) {
    linhas.push('Núcleo supersoft: máximo conforto e absorção, saída de bola fácil')
  } else if (core.includes('soft')) {
    linhas.push('Núcleo soft: absorve impacto, mais conforto e saída de bola')
  } else if (core.includes('medium') || core.includes('médio')) {
    linhas.push('Núcleo médio: equilíbrio entre controle e potência')
  } else if (core.includes('hard') || core.includes('duro')) {
    linhas.push('Núcleo duro: resposta explosiva, mais potência, exige técnica')
  }

  // ── Material / trama de carbono ───────────────────────────────────────────
  if (trama === 'kevlar' || face.includes('kevlar')) {
    linhas.push('Kevlar: absorve vibração, gentil com o braço')
  } else if (trama === '3k') {
    linhas.push('Trama 3K: mais flexível e jogável')
  } else if (trama === '12k' || trama === '18k') {
    linhas.push('Trama rígida: mais potência e resposta seca')
  } else if (trama === 'bio') {
    linhas.push('Carbono biológico: leveza, sustentabilidade e boa absorção')
  } else if (face.includes('fibra') || face.includes('vidro')) {
    linhas.push('Fibra de vidro: mais flexível, confortável, perdoa erros')
  }

  // ── Textura ───────────────────────────────────────────────────────────────
  if (textura === 'lisa') {
    linhas.push('Superfície lisa: mais controle, menos spin')
  } else if (textura && (textura.includes('arena') || textura.includes('3d') || textura.includes('relevo'))) {
    linhas.push('Superfície texturizada: mais efeito e spin')
  }

  // ── Peso ──────────────────────────────────────────────────────────────────
  if (racket.weight_g != null) {
    if (racket.weight_g <= 320) {
      linhas.push(`Leve (${racket.weight_g}g): mais agilidade e menos fadiga`)
    } else if (racket.weight_g >= 330) {
      linhas.push(`Mais pesada (${racket.weight_g}g): mais solidez no impacto`)
    }
  }

  // ── Formato da cabeça ────────────────────────────────────────────────────
  if (formato === 'diamante') {
    linhas.push('Cabeça diamante: sweet spot mais alto, ideal para ataque')
  }

  // ── Furos ─────────────────────────────────────────────────────────────────
  const furos = extra.furos as number | undefined
  if (furos != null && furos >= 30) {
    linhas.push(`Muitos furos (${furos}): swing mais leve e ágil`)
  }

  // ── Saída de bola ─────────────────────────────────────────────────────────
  const saidaDeBola = (racket.specs_extra as Record<string, unknown> | null)?.saida_de_bola as string | undefined
  if (saidaDeBola === 'fácil') {
    linhas.push('Saída de bola fácil: devolve bem mesmo com swing suave — ótimo para iniciantes')
  } else if (saidaDeBola === 'exigente') {
    linhas.push('Saída de bola exigente: entrega todo potencial com swing rápido e técnica apurada')
  }

  // ── Spin / tratamento de superfície ───────────────────────────────────────
  const tratamentoFabrica = (racket.specs_extra as Record<string, unknown> | null)?.tratamento_fabrica
  if (tratamentoFabrica === false) {
    linhas.push('Spin: superfície lisa de fábrica — dá pra aumentar com areado aplicado depois')
  }

  return linhas.slice(0, 6)
}
