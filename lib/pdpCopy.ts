import type { RacketWithInsights } from './recommend'
import { classifyFace, classifyCore } from './motor'
import { getSaidaDeBola } from './saidaBola'
import { getSweetSpotCopy } from './sweetSpot'
import { GLOSSARIO } from './glossario'

// Textos editoriais da ficha redesenhada (PDP). Só traduzem para linguagem de
// quadra dados que já existem no catálogo/motor — nenhum dado novo é criado.

export type Tom = 'aqua' | 'emerald' | 'amber' | 'neutro'
type Insights = NonNullable<RacketWithInsights['racket_insights']>

// ── DNA rápido: valor -> micro-etiqueta ──────────────────────────────────────

export function tagPeso(g: number | null | undefined): { tag: string; tom: Tom } | null {
  if (g == null) return null
  if (g <= 320) return { tag: 'Leve e ágil', tom: 'aqua' }
  if (g <= 329) return { tag: 'Peso médio', tom: 'neutro' }
  return { tag: 'Pesada e estável', tom: 'amber' }
}

const FACE_TAG: Record<string, string> = {
  CARBON_3K: 'Toque firme',
  CARBON_3K_METAL: 'Firme e estável',
  CARBON_1K: 'Firme e preciso',
  CARBON_6K: 'Firme e reativa',
  CARBON_6K_15K: 'Resposta mais viva',
  CARBON_18K: 'Rígida e potente',
  CARBON_24K: 'Máxima rigidez',
  KEVLAR_PURE: 'Absorve vibração',
  KEVLAR_CARBON: 'Firme e amortecida',
  VIDRO: 'Macia e suave',
  HYBRID_VIDRO: 'Macia com resposta',
}

export function tagFace(face: string | null | undefined): { tag: string; tom: Tom } | null {
  if (!face) return null
  return { tag: FACE_TAG[classifyFace(face)] ?? 'Face de carbono', tom: 'aqua' }
}

// Etiquetas de núcleo (material -> benefício, sem repetir o cartão de conforto) e espessura: máx. 2-3 palavras (as 4 tarjetas do DNA rápido
// precisam ter a mesma altura no mobile).
export function tagNucleo(core: string | null | undefined): { tag: string; tom: Tom } | null {
  if (!core) return null
  const m: Record<string, { tag: string; tom: Tom }> = {
    SUPERSOFT: { tag: 'Protege o braço', tom: 'emerald' },
    SOFT: { tag: 'Amortece o impacto', tom: 'emerald' },
    MEDIUM: { tag: 'Equilibrado', tom: 'neutro' },
    HARD: { tag: 'Devolve energia', tom: 'amber' },
  }
  return m[classifyCore(core)] ?? null
}

export function tagEspessura(mm: number | null | undefined): { tag: string; tom: Tom } | null {
  if (mm == null) return null
  if (mm <= 20) return { tag: 'Perfil fino', tom: 'aqua' }
  if (mm <= 22) return { tag: 'Perfil médio', tom: 'neutro' }
  return { tag: 'Perfil grosso', tom: 'amber' }
}

// ── Especificações: micro-explicação do que cada linha significa na prática ──

export function microFace(face: string | null | undefined): string | null {
  if (!face) return null
  const m: Record<string, string> = {
    CARBON_3K: 'Trama fina, mais sensibilidade e toque firme na bola.',
    CARBON_3K_METAL: 'Reforço metálico: resposta firme e estável no impacto.',
    CARBON_1K: 'O mais firme e preciso, pede técnica.',
    CARBON_6K: 'Firme, com um pouco mais de resposta.',
    CARBON_6K_15K: 'Gramatura alta: resposta mais viva e potência.',
    CARBON_18K: 'Rígida, devolve mais energia (potência).',
    CARBON_24K: 'Rigidez máxima, potência alta e toque seco.',
    KEVLAR_PURE: 'Absorve vibração, mais conforto para o braço.',
    KEVLAR_CARBON: 'Resposta firme com amortecimento.',
    VIDRO: 'Face macia, mais conforto e saída de bola suave.',
    HYBRID_VIDRO: 'Face macia com boa resposta.',
  }
  return m[classifyFace(face)] ?? null
}

export function microNucleo(core: string | null | undefined): string | null {
  if (!core) return null
  const m: Record<string, string> = {
    SUPERSOFT: 'Muito macio: absorve mais vibração e protege o braço.',
    SOFT: 'Macio: bom conforto com resposta viva.',
    MEDIUM: 'Médio: equilibra conforto e resposta.',
    HARD: 'Firme: devolve mais energia, protege menos o braço.',
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

// ── Comportamento em quadra: 3 cartões homogêneos (textos curtos, ≤10 palavras) ──

// nivel: 1 = mais exigente/seco, 2 = equilibrado, 3 = amigável/protegido (barra de 3 segmentos).
export interface CartaoCopy { titulo: string; texto: string; tom: Tom; nivel: 1 | 2 | 3 }

// soAvancado: o nível recomendado começa no avançado; então a copy não pode falar
// em iniciante/evolução (contradiz o "Nível recomendado").
export function saidaDeBolaCopy(ins: Insights, soAvancado = false): CartaoCopy | null {
  const s = getSaidaDeBola(ins.comfort, ins.power)
  if (!s) return null
  if (s === 'fácil') return {
    titulo: 'Fácil', tom: 'emerald', nivel: 3,
    texto: soAvancado ? 'Rende bem mesmo sem forçar o braço.' : 'Devolve a bola sem exigir muita força.',
  }
  if (s === 'exigente') return {
    titulo: 'Controlada', tom: 'amber', nivel: 1,
    texto: (ins.power ?? 0) >= 8
      ? 'Só entrega a potência toda com batida forte.'
      : 'Pede batida forte para render.',
  }
  return {
    titulo: 'Moderada', tom: 'neutro', nivel: 2,
    texto: 'Pede batida moderada, rende com swing consistente.',
  }
}

// Conforto no braço: cortes 8 / 6 (os mesmos do agente e do recommend).
export function confortoCardCopy(comfort: number | null | undefined): CartaoCopy | null {
  if (comfort == null) return null
  if (comfort >= 8) return {
    titulo: 'Protegido', tom: 'emerald', nivel: 3,
    texto: 'Absorve muita vibração, poupa o cotovelo.',
  }
  if (comfort >= 6) return {
    titulo: 'Equilibrado', tom: 'neutro', nivel: 2,
    texto: 'Amortece o impacto sem perder firmeza.',
  }
  return {
    titulo: 'Seco', tom: 'amber', nivel: 1,
    texto: 'Mais vibração no braço, pede batida limpa.',
  }
}

// Versão curta só da ficha nova (o texto longo de lib/sweetSpot segue nos outros usos).
export function sweetSpotCardCopy(forgiveness: number | null | undefined): CartaoCopy | null {
  const c = getSweetSpotCopy(forgiveness)
  if (!c) return null
  if (c.label === 'Generoso') return { titulo: 'Perdoa erros', tom: 'emerald', nivel: 3, texto: 'Perdoa golpes fora do centro, vibra menos.' }
  if (c.label === 'Exigente') return { titulo: 'Exigente', tom: 'amber', nivel: 1, texto: 'Área menor: rende no centro da raquete.' }
  return { titulo: 'Equilibrado', tom: 'neutro', nivel: 2, texto: 'Boa área de acerto, resposta viva no centro.' }
}

// ── Gráfico de 6 dimensões (radar): valor + descrição, uma fonte só ──────────
// As descrições vêm do GLOSSARIO (mesmas do "Como ler este gráfico" e do modal).

export interface DimensaoStat {
  key: 'power' | 'control' | 'comfort' | 'maneuverability' | 'spin' | 'stability'
  label: string
  value: number | null
  desc: string
}

const DIMENSOES: { key: DimensaoStat['key']; label: string; termo: string }[] = [
  { key: 'power', label: 'Potência', termo: 'potência' },
  { key: 'control', label: 'Controle', termo: 'controle' },
  { key: 'comfort', label: 'Conforto', termo: 'conforto' },
  { key: 'maneuverability', label: 'Manuseio', termo: 'manuseio' },
  { key: 'spin', label: 'Spin', termo: 'spin' },
  { key: 'stability', label: 'Estabilidade', termo: 'estabilidade' },
]

export function dimensoesStats(ins: Insights, spinLisa: boolean): DimensaoStat[] {
  return DIMENSOES.map(d => {
    const def = GLOSSARIO.find(e => e.termo === d.termo)?.definicao ?? ''
    const extra = d.key === 'spin' && spinLisa
      ? ' Superfície lisa de fábrica: dá pra aumentar com tratamento aplicado depois.'
      : ''
    return { key: d.key, label: d.label, value: ins[d.key] ?? null, desc: def + extra }
  })
}

// ── Onde brilha / O que abre mão ─────────────────────────────────────────────
// Relativo às 6 notas DA raquete: ≥8 brilha (se nenhuma chega a 8, o corte cai
// para 7 só nessa raquete); ≤5 abre mão; 6-7 ficam implícitas (só no gráfico).
// Scorecard: cada item = nota + nome + frase curta.

export interface DestaqueLinha { key: DimensaoStat['key']; label: string; value: number; nota?: string }

const NOTA_ALTO: Record<DimensaoStat['key'], string> = {
  power: 'bola rápida',
  control: 'coloca onde quer',
  comfort: 'poupa o braço',
  maneuverability: 'muito ágil',
  spin: 'bom efeito',
  stability: 'firme no impacto',
}

const NOTA_BAIXO: Record<DimensaoStat['key'], string> = {
  power: 'exige seu swing',
  control: 'pede técnica',
  comfort: 'mais vibração',
  maneuverability: 'mais pesada',
  spin: 'pouco efeito',
  stability: 'sente o impacto',
}

export interface Destaques { brilha: DestaqueLinha[]; abreMao: DestaqueLinha[]; corteBrilha: number }

export function destaques(stats: DimensaoStat[], spinLisa: boolean): Destaques {
  const com = stats.filter((s): s is DimensaoStat & { value: number } => s.value != null)
  const corteBrilha = com.some(s => s.value >= 8) ? 8 : 7
  const base = (s: DimensaoStat & { value: number }): DestaqueLinha => ({ key: s.key, label: s.label, value: s.value })
  const brilha = com.filter(s => s.value >= corteBrilha).sort((x, y) => y.value - x.value).map(base)
  const abreMao = com.filter(s => s.value <= 5).sort((x, y) => x.value - y.value).map(base)
  // Cada item leva sua frase curta (scorecard). Intensificador "muito" só com nota 8+.
  for (const l of brilha) {
    l.nota = l.key === 'maneuverability' && l.value < 8 ? 'ágil' : NOTA_ALTO[l.key]
  }
  for (const l of abreMao) {
    l.nota = l.key === 'spin' && spinLisa ? 'lisa de fábrica' : NOTA_BAIXO[l.key]
  }
  return { brilha, abreMao, corteBrilha }
}
