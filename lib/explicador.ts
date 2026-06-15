import { RacketWithInsights } from './recommend'

interface TechEntry { nome: string; tipo: string }

export function gerarExplicacoes(racket: RacketWithInsights): string[] {
  const linhas: string[] = []
  const used = new Set<string>() // prevents repeating the same physical factor

  const extra = (racket.specs_extra ?? {}) as Record<string, unknown>
  const ins   = racket.racket_insights

  // ── Scores ────────────────────────────────────────────────────────────────
  const spin       = ins?.spin       ?? null
  const comfort    = ins?.comfort    ?? null
  const stability  = ins?.stability  ?? null
  const power      = ins?.power      ?? null
  const control    = ins?.control    ?? null
  const forgiveness = ins?.forgiveness ?? null

  // ── Motor inputs (new structured fields) ─────────────────────────────────
  // superficie: same field the motor reads for texturaScore
  const superficieRaw = (extra.superficie as string | undefined)?.toLowerCase()
    ?? (extra.textura as string | undefined)?.toLowerCase()  // legacy fallback

  const furos      = extra.furos      as number | undefined
  const espessuraMm = extra.espessura_mm as number | undefined

  const tecnologias: TechEntry[] = Array.isArray(extra.tecnologias)
    ? (extra.tecnologias as TechEntry[])
    : []

  const antivibTechs   = tecnologias.filter(t => t.tipo === 'antivibração' || t.tipo === 'antivibracao')
  const estruturalTechs = tecnologias.filter(t => t.tipo === 'estrutural')
  const spinTechs       = tecnologias.filter(t => t.tipo === 'superficie')

  // ── Legacy fields ─────────────────────────────────────────────────────────
  const core  = racket.core?.toLowerCase() ?? ''
  const face  = racket.face_material?.toLowerCase() ?? ''
  const trama = (extra.trama_carbono as string | undefined)?.toLowerCase()
  const saidaDeBola = extra.saida_de_bola as string | undefined

  // ── Helpers ───────────────────────────────────────────────────────────────
  function push(key: string, linha: string) {
    if (!used.has(key)) { used.add(key); linhas.push(linha) }
  }

  function superficieLabel(): string {
    if (!superficieRaw) return ''
    if (superficieRaw.includes('áspera') || superficieRaw.includes('aspera')) return 'superfície áspera'
    if (superficieRaw.includes('quartzo')) return 'superfície quartzo'
    if (superficieRaw.includes('levemente')) return 'superfície levemente áspera'
    if (superficieRaw.includes('lisa')) return 'superfície lisa'
    return `superfície ${superficieRaw}`
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SCORE-DRIVEN EXPLANATIONS — explain HIGH notes using their causes
  // ═════════════════════════════════════════════════════════════════════════

  // ── SPIN (≥ 6) ────────────────────────────────────────────────────────────
  if (spin != null && spin >= 6) {
    const parts: string[] = []
    const supLabel = superficieLabel()
    if (supLabel && !supLabel.includes('lisa')) {
      parts.push(supLabel)
      used.add('superficie')
    }
    if (spinTechs.length > 0) {
      parts.push(spinTechs.map(t => t.nome).join(' + '))
      used.add('spintech')
    }
    if (furos != null && furos >= 36) {
      parts.push(`${furos} furos`)
      used.add('furos')
    }
    if (parts.length > 0) {
      const desc = spin >= 8
        ? 'máxima geração de efeito — coloca giro intenso em qualquer batida'
        : spin === 7
          ? 'gera efeito intenso na bola'
          : 'boa geração de spin'
      push('spin', `Spin ${spin}: ${parts.join(' + ')} — ${desc}`)
    }
  }

  // ── COMFORT (≥ 8 → sempre por antivib techs no motor) ────────────────────
  if (comfort != null && comfort >= 8 && antivibTechs.length > 0) {
    const tecNames = antivibTechs.map(t => t.nome).join(' + ')
    used.add('antivib')
    const desc = comfort === 9
      ? 'amortecimento máximo — isola braço e ombro do impacto'
      : 'absorção ativa de vibração, gentil com braço e ombro'
    push('comfort', `Conforto ${comfort}: ${tecNames} — ${desc}`)
  }

  // ── STABILITY (≥ 7 → sempre por estrutural techs no motor) ───────────────
  if (stability != null && stability >= 7 && estruturalTechs.length > 0) {
    const parts = estruturalTechs.map(t => t.nome)
    used.add('estrutural')
    if (espessuraMm != null && espessuraMm >= 23) {
      parts.push(`perfil ${espessuraMm}mm`)
      used.add('espessura')
    }
    push('stability', `Estabilidade ${stability}: ${parts.join(' + ')} — mantém controle nas trocas longas e nos smashes`)
  }

  // ── POWER (≥ 8) ───────────────────────────────────────────────────────────
  if (power != null && power >= 8 && linhas.length < 4) {
    const parts: string[] = []
    if (trama && (trama === '18k' || trama === '12k' || trama === '24k')) {
      parts.push(`carbono ${trama}`)
      used.add('trama')
    } else if (face.includes('carbon') || face.includes('carbono')) {
      parts.push('face de carbono')
      used.add('trama')
    }
    if (racket.weight_g != null && racket.weight_g >= 330 && !used.has('peso')) {
      parts.push(`${racket.weight_g}g`)
      used.add('peso')
    }
    if (parts.length > 0) {
      push('power', `Potência ${power}: ${parts.join(' + ')} — resposta explosiva na bola`)
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. CONTEXTUAL — generic factors, only if not already covered above
  // ═════════════════════════════════════════════════════════════════════════

  // Core / núcleo
  if (!used.has('antivib') && !used.has('nucleo') && core && linhas.length < 5) {
    if (core.includes('supersoft')) {
      push('nucleo', 'Núcleo supersoft: máximo conforto e absorção, saída de bola fácil')
    } else if (core.includes('soft')) {
      push('nucleo', 'Núcleo soft: absorve impacto e suaviza a batida')
    } else if (core.includes('medium') || core.includes('médio')) {
      push('nucleo', 'Núcleo médio: equilíbrio entre controle e potência')
    } else if (core.includes('hard') || core.includes('duro')) {
      push('nucleo', 'Núcleo duro: resposta explosiva, mais potência')
    }
  }

  // Trama / material (if not yet mentioned)
  if (!used.has('trama') && linhas.length < 5) {
    if (trama === 'kevlar' || face.includes('kevlar')) {
      push('trama', 'Kevlar: absorve vibração, gentil com o braço')
    } else if (trama === '3k') {
      push('trama', 'Trama 3K: mais flexível e jogável')
    } else if (trama === '18k' || trama === '12k') {
      push('trama', `Trama ${trama} rígida: resposta seca e potente`)
    } else if (face.includes('fibra') || face.includes('vidro')) {
      push('trama', 'Fibra de vidro: mais flexível, confortável, perdoa erros')
    }
  }

  // Forgiveness (if high and there are factors to cite — no duplicate core)
  if (forgiveness != null && forgiveness >= 8 && linhas.length < 5) {
    const parts: string[] = []
    if (!used.has('trama') && (trama === 'kevlar' || face.includes('kevlar'))) {
      parts.push('trama de Kevlar')
      used.add('trama')
    } else if (!used.has('trama') && (face.includes('fibra') || face.includes('vidro'))) {
      parts.push('face de fibra de vidro')
      used.add('trama')
    }
    if (!used.has('nucleo') && (core.includes('soft') || core.includes('supersoft'))) {
      parts.push('Núcleo macio')
      used.add('nucleo')
    }
    if (parts.length > 0) {
      push('forgiveness', `${parts.join(' e ')}: perdoa quando não acerta no centro`)
    }
  }

  // Peso (if not yet mentioned)
  if (!used.has('peso') && racket.weight_g != null && linhas.length < 5) {
    if (racket.weight_g <= 320) {
      push('peso', `Leve (${racket.weight_g}g): mais agilidade e menos fadiga`)
    } else if (racket.weight_g >= 335) {
      push('peso', `Peso (${racket.weight_g}g): mais solidez no impacto`)
    }
  }

  // Furos (if not yet mentioned and notable)
  if (!used.has('furos') && furos != null && furos >= 36 && linhas.length < 5) {
    push('furos', `Muitos furos (${furos}): batida mais leve e estável em dia de vento`)
  }

  // Saída de bola
  if (saidaDeBola && linhas.length < 5) {
    if (saidaDeBola === 'fácil') {
      push('saida', 'Saída de bola fácil: devolve bem mesmo com batida suave. Ótimo para iniciantes.')
    } else if (saidaDeBola === 'exigente') {
      push('saida', 'Saída de bola exigente: entrega todo potencial com batida rápida e técnica apurada')
    }
  }

  // Superfície lisa (spin baixo por design — mencionar só se não foi coberto)
  if (!used.has('superficie') && superficieRaw?.includes('lisa') && linhas.length < 5) {
    push('superficie', 'Superfície lisa: favorece controle sobre efeito')
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CONTRAPARTIDA — honest tradeoff when relevant
  // ═════════════════════════════════════════════════════════════════════════

  if (spin != null && spin >= 7 && control != null && control <= 6 && linhas.length < 5) {
    push('contrapartida', `Controle ${control}: com tanto spin, exige posicionamento para não abrir demais a bola`)
  }

  return linhas.slice(0, 5)
}
