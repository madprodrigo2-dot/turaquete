import type { RacketWithInsights } from './recommend'
import { classifyFace, classifyCore } from './motor'
import { getSaidaDeBola } from './saidaBola'
import { getSweetSpotCopy } from './sweetSpot'

// Textos editoriais da ficha redesenhada (PDP). Só traduzem para linguagem de
// quadra dados que já existem no catálogo/motor — nenhum dado novo é criado.

export type Tom = 'aqua' | 'emerald' | 'amber' | 'neutro'
type Insights = NonNullable<RacketWithInsights['racket_insights']>

// ── ADN rápido: valor -> micro-etiqueta ──────────────────────────────────────

export function tagPeso(g: number | null | undefined): { tag: string; tom: Tom } | null {
  if (g == null) return null
  if (g <= 320) return { tag: 'Leve e ágil', tom: 'aqua' }
  if (g <= 329) return { tag: 'Peso médio', tom: 'neutro' }
  return { tag: 'Pesada e estável', tom: 'amber' }
}

export function tagBalance(b: string | null | undefined): { tag: string; tom: Tom } | null {
  if (!b) return null
  const s = b.toLowerCase()
  if (s.includes('cabeça') || s.includes('cabeca')) return { tag: 'Mais potência', tom: 'amber' }
  if (s.includes('cabo')) return { tag: 'Mais ágil e controle', tom: 'aqua' }
  if (s.includes('médio') || s.includes('medio')) return { tag: 'Equilibrada', tom: 'neutro' }
  return null
}

const FACE_TAG: Record<string, string> = {
  CARBON_3K: 'Toque firme',
  CARBON_3K_METAL: 'Firme e estável',
  CARBON_1K: 'Muito firme e preciso',
  CARBON_6K: 'Firme, mais resposta',
  CARBON_6K_15K: 'Resposta mais viva',
  CARBON_18K: 'Rígida e potente',
  CARBON_24K: 'Máxima rigidez',
  KEVLAR_PURE: 'Absorve vibração',
  KEVLAR_CARBON: 'Firme com amortecimento',
  VIDRO: 'Macia e confortável',
  HYBRID_VIDRO: 'Macia com resposta',
}

export function tagFace(face: string | null | undefined): { tag: string; tom: Tom } | null {
  if (!face) return null
  return { tag: FACE_TAG[classifyFace(face)] ?? 'Face de carbono', tom: 'aqua' }
}

export function tagSuperficie(sup: string | null | undefined): { tag: string; tom: Tom } | null {
  if (!sup) return null
  const s = sup.toLowerCase()
  if (s.includes('lisa')) return { tag: 'Sem tratamento', tom: 'neutro' }
  if (s.includes('levemente')) return { tag: 'Textura leve', tom: 'aqua' }
  if (s.includes('tratamento de fábrica') || s.includes('tratamento de fabrica')) return { tag: 'Tratada de fábrica', tom: 'aqua' }
  if (s.includes('áspera') || s.includes('aspera') || s.includes('quartzo')) return { tag: 'Com textura', tom: 'aqua' }
  return null
}

// ── Especificações: micro-explicação do que cada linha significa na prática ──

export function microFace(face: string | null | undefined): string | null {
  if (!face) return null
  const m: Record<string, string> = {
    CARBON_3K: 'Carbono 3K: trama fina, mais sensibilidade e toque firme na bola.',
    CARBON_3K_METAL: 'Carbono com reforço metálico: resposta firme e estável no impacto.',
    CARBON_1K: 'Carbono 1K: o mais firme e preciso, pede técnica.',
    CARBON_6K: 'Carbono 6K: firme, com um pouco mais de resposta.',
    CARBON_6K_15K: 'Carbono de alta gramatura (12K a 16K): resposta mais viva e potência.',
    CARBON_18K: 'Carbono 18K: rígido, devolve mais energia (potência).',
    CARBON_24K: 'Carbono 24K: rigidez máxima, potência alta e toque seco.',
    KEVLAR_PURE: 'Kevlar: absorve vibração, mais conforto para o braço.',
    KEVLAR_CARBON: 'Kevlar com carbono: resposta firme com amortecimento.',
    VIDRO: 'Fibra de vidro: face macia, mais conforto e saída de bola suave.',
    HYBRID_VIDRO: 'Carbono com fibra de vidro: face macia com boa resposta.',
  }
  return m[classifyFace(face)] ?? null
}

export function microNucleo(core: string | null | undefined): string | null {
  if (!core) return null
  const m: Record<string, string> = {
    SUPERSOFT: 'EVA muito macio: absorve mais vibração e protege o braço.',
    SOFT: 'EVA macio: bom conforto com resposta viva.',
    MEDIUM: 'EVA médio: equilibra conforto e resposta.',
    HARD: 'EVA firme: devolve mais energia, protege menos o braço.',
  }
  return m[classifyCore(core)] ?? null
}

export function microEspessura(mm: number | null | undefined): string | null {
  if (mm == null) return null
  if (mm <= 20) return 'Perfil fino: resposta mais direta e mais controle.'
  if (mm <= 22) return 'Perfil médio: equilíbrio entre controle e potência.'
  return 'Perfil grosso: mais rigidez e potência.'
}

export const MICRO_FUROS =
  'Aberturas que formam a trama da face; influenciam spin, saída de bola e controle.'

export function isSuperficieLisa(sup: string | null | undefined, tratamentoFabrica?: boolean | null): boolean {
  return (sup ?? '').toLowerCase().includes('lisa') || tratamentoFabrica === false
}

export function microSuperficie(sup: string | null | undefined, tratamentoFabrica?: boolean | null): string | null {
  if (!sup) return null
  if (isSuperficieLisa(sup, tratamentoFabrica)) {
    return 'Sem textura de fábrica: gera menos spin de saída, mas dá pra aplicar tratamento depois.'
  }
  if (sup.toLowerCase().includes('levemente')) return 'Textura leve: um pouco mais de atrito com a bola.'
  return 'Textura de fábrica: mais atrito com a bola, mais spin.'
}

// ── Tecnologias: uma linha do que a categoria faz (por tipo, não por marca) ──

const TECH_DESC: Record<string, string> = {
  estrutural: 'Reforço de construção: mais estabilidade e firmeza no impacto.',
  antivibracao: 'Reduz a vibração que chega ao braço.',
  ergonomia: 'Pensada para a pegada e o conforto na mão.',
  'furação': 'Padrão de furos que influencia spin e saída de bola.',
  declarativa: 'Acabamento ou detalhe da edição.',
}

export function descTecnologia(tipo: string): string {
  return TECH_DESC[tipo] ?? 'Característica de construção desta raquete.'
}

// ── Comportamento em quadra: 3 cartões ───────────────────────────────────────

export interface PerfilPrincipal { titulo: string; texto: string }

export function perfilPrincipal(ins: Insights): PerfilPrincipal | null {
  if (ins.power == null || ins.control == null) return null
  const d = ins.control - ins.power
  if (d >= 2) return {
    titulo: 'Mais controle do que força',
    texto: 'Coloca a bola onde você quer. A força vem do seu swing, não da raquete.',
  }
  if (d <= -2) return {
    titulo: 'Mais força do que controle',
    texto: 'Entrega potência fácil, mas pede mão firme para colocar a bola com precisão.',
  }
  return {
    titulo: 'Força e controle equilibrados',
    texto: 'Nenhum dos dois domina: é uma raquete versátil para vários estilos de jogo.',
  }
}

// O que o hexágono mostra mas os 3 cartões não nomeiam: manuseio, estabilidade,
// conforto e spin, em palavras. O número exato fica no hexágono.
export function outrasDimensoes(ins: Insights, spinLisa: boolean): string[] {
  const out: string[] = []
  if (ins.maneuverability != null) {
    out.push(ins.maneuverability >= 8 ? 'muito ágil na mão' : ins.maneuverability >= 6 ? 'ágil na mão' : 'mais lenta de manejar')
  }
  if (ins.stability != null) {
    out.push(ins.stability >= 8 ? 'muito firme no impacto' : ins.stability >= 6 ? 'firme no impacto' : 'menos estável em bola forte')
  }
  if (ins.comfort != null) {
    out.push(ins.comfort >= 8 ? 'protege bem o braço' : ins.comfort >= 6 ? 'conforto moderado' : 'mais firme no braço')
  }
  if (ins.spin != null) {
    const s = ins.spin >= 7 ? 'bom spin de fábrica' : ins.spin >= 4 ? 'spin moderado' : 'pouco spin de fábrica'
    out.push(spinLisa && ins.spin < 7 ? `${s} (dá pra subir com tratamento)` : s)
  }
  return out
}

export interface CartaoCopy { titulo: string; texto: string; tom: Tom }

export function saidaDeBolaCopy(ins: Insights): CartaoCopy | null {
  const s = getSaidaDeBola(ins.comfort, ins.power)
  if (!s) return null
  if (s === 'fácil') return {
    titulo: 'Fácil', tom: 'emerald',
    texto: 'Devolve a bola sem exigir muita força. Rende bem mesmo com batida suave, ideal pra quem tá evoluindo.',
  }
  if (s === 'exigente') return {
    titulo: 'Exigente', tom: 'amber',
    texto: (ins.power ?? 0) >= 8
      ? 'Só entrega a potência toda com batida forte e técnica. Com batida suave, rende menos que uma raquete macia.'
      : 'Pede batida forte para render. Com batida suave, a bola sai mais curta.',
  }
  return {
    titulo: 'Média', tom: 'neutro',
    texto: 'Pede batida moderada: nem sobra nem falta, rende bem com um swing consistente.',
  }
}

export function sweetSpotCardCopy(forgiveness: number | null | undefined): CartaoCopy | null {
  const c = getSweetSpotCopy(forgiveness)
  if (!c) return null
  const tom: Tom = c.label === 'Generoso' ? 'emerald' : c.label === 'Exigente' ? 'amber' : 'neutro'
  return { titulo: c.chip, texto: c.descricao, tom }
}
