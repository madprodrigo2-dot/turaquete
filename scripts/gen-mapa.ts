#!/usr/bin/env tsx
/**
 * scripts/gen-mapa.ts
 * Regenera as seções AUTO-GEN de docs/mapa-do-sistema.md lendo o código real.
 *
 * Usage:
 *   tsx scripts/gen-mapa.ts         # regenera e grava o arquivo
 *   tsx scripts/gen-mapa.ts --check # verifica divergência sem gravar (exit 1 se desatualizado)
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import {
  FACE_POWER, CORE_POWER, CORE_CTRL, FACE_CTRL,
  FACE_STAB, FACE_FORG, CORE_FORG, CORE_COMFORT, FACE_COMFORT,
} from '../lib/motorTables'
import { computeScorerWeights } from '../lib/scorer'
import { CONFIDENCE_CONFIG } from '../lib/agent/confidence'

const MAPA_PATH  = 'docs/mapa-do-sistema.md'
const PKG_PATH   = 'package.json'
const CHECK_MODE = process.argv.includes('--check')

// ── File helpers ──────────────────────────────────────────────────────────────

function findLine(filepath: string, pattern: string): number {
  const lines = readFileSync(filepath, 'utf8').split('\n')
  const idx = lines.findIndex(l => l.includes(pattern))
  return idx === -1 ? 0 : idx + 1
}

function lineRef(filepath: string, pattern: string): string {
  const n = findLine(filepath, pattern)
  return n > 0 ? `${filepath}:${n}` : filepath
}

function readEnv(): Record<string, string> {
  try {
    const env: Record<string, string> = {}
    readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
      const i = l.indexOf('=')
      if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
    })
    return env
  } catch { return {} }
}

// ── Marker helpers ────────────────────────────────────────────────────────────

function extractSection(content: string, name: string): string | null {
  const open  = `<!-- AUTO-GEN:${name} -->`
  const close = `<!-- /AUTO-GEN:${name} -->`
  if (!content.includes(open)) return null
  const a = content.indexOf(open) + open.length
  const b = content.indexOf(close)
  return b === -1 ? null : content.slice(a, b).trim()
}

function replaceSection(content: string, name: string, body: string): string {
  const open  = `<!-- AUTO-GEN:${name} -->`
  const close = `<!-- /AUTO-GEN:${name} -->`
  const a = content.indexOf(open) + open.length
  const b = content.indexOf(close)
  return content.slice(0, a) + '\n' + body + '\n' + content.slice(b)
}

function wrapSection(name: string, body: string): string {
  return `<!-- AUTO-GEN:${name} -->\n${body}\n<!-- /AUTO-GEN:${name} -->`
}

/** Insert markers on first run at the logical position for each section. */
function insertFirst(content: string, name: string, body: string): string {
  const wrapped = wrapSection(name, body)

  if (name === 'cabecera') {
    // Replace the hand-written "_Última atualização:..." line
    return content.replace(/_Última atualização:.*_/, wrapped)
  }

  if (name === 'tabla-scores') {
    // Find the table (starts at first "| Score |") through section end (before "---\n\n## 3.")
    const tableStart = content.indexOf('| Score |')
    const sec3Start  = content.indexOf('\n---\n\n## 3.')
    if (tableStart !== -1 && sec3Start !== -1) {
      return content.slice(0, tableStart) + wrapped + '\n' + content.slice(sec3Start)
    }
  }

  // umbrales and publicada: insert before the footer line
  const footer = '\n_Baseado no código real'
  const fi = content.indexOf(footer)
  if (fi !== -1) return content.slice(0, fi) + `\n\n${wrapped}` + content.slice(fi)

  return content + `\n\n${wrapped}\n`
}

// ── Generators ────────────────────────────────────────────────────────────────

function genCabecera(): string {
  const version = (JSON.parse(readFileSync(PKG_PATH, 'utf8')) as { version: string }).version
  const today   = new Date().toISOString().slice(0, 10)
  let hash = '?'
  try { hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch {}
  return `_Versão: ${version} · Hash: ${hash} · Gerado em: ${today}_`
}

function genTablaScores(): string {
  type P = Parameters<typeof computeScorerWeights>[0]
  const profiles: { tag: string; p: P }[] = [
    { tag: 'lesão',       p: { cotovelo_sensivel: true } },
    { tag: 'ini',         p: { nivel: 'iniciante' } },
    { tag: 'inter/equil', p: { nivel: 'intermediario' } },
    { tag: 'inter/pot',   p: { nivel: 'intermediario', prioridade: 'potencia' } },
    { tag: 'inter/def',   p: { nivel: 'intermediario', prioridade: 'defesa' } },
    { tag: 'avan/equil',  p: { nivel: 'avancado' } },
    { tag: 'avan/pot',    p: { nivel: 'avancado', prioridade: 'potencia' } },
    { tag: 'avan/def',    p: { nivel: 'avancado', prioridade: 'defesa' } },
  ]

  // Build matrix: engDim → profileTag → weight
  const PT: Record<string, string> = {
    potência: 'power', controle: 'control', conforto: 'comfort',
    manuseio: 'maneuverability', estabilidade: 'stability', 'sweet spot': 'forgiveness',
  }
  const dims = ['power','control','comfort','maneuverability','spin','stability','forgiveness'] as const
  type Dim = typeof dims[number]
  const mat: Record<string, Record<string, number>> = Object.fromEntries(dims.map(d => [d, {}]))

  for (const { tag, p } of profiles) {
    const w = computeScorerWeights(p)
    for (const [ptKey, eng] of Object.entries(PT)) mat[eng][tag] = w[ptKey] ?? 0
    mat['spin'][tag] = 0
  }

  function pesoCol(dim: Dim): string {
    if (dim === 'spin') return '**0 em todos** (não entra no ranking)'
    const m = mat[dim]
    const inter = [m['inter/equil'], m['inter/pot'], m['inter/def']]
    const avan  = [m['avan/equil'], m['avan/pot'], m['avan/def']]
    const iMin = Math.min(...inter), iMax = Math.max(...inter)
    const aMin = Math.min(...avan),  aMax = Math.max(...avan)
    return `ini:${m['ini']} · inter:${iMin === iMax ? iMin : `${iMin}–${iMax}`} · avan:${aMin === aMax ? aMin : `${aMin}–${aMax}`} · lesão:${m['lesão']}`
  }

  // Table entries read from motorTables.ts values
  function fpow(k: keyof typeof FACE_POWER) { return FACE_POWER[k] }
  function fforg(k: keyof typeof FACE_FORG) { return FACE_FORG[k] }
  function fstab(k: keyof typeof FACE_STAB) { return FACE_STAB[k] ?? 0 }

  const rows: string[] = [
    '| Score | Inputs | Lógica (lida de lib/motorTables.ts) | Rango | UI | Peso por perfil /100 |',
    '|---|---|---|---|---|---|',
    `| **Potência** (power) | face_material, core, balance | face: VIDRO→${fpow('VIDRO')}…CARBON_24K→${fpow('CARBON_24K')}; core SUPERSOFT/SOFT${CORE_POWER['SUPERSOFT']}, HARD+${CORE_POWER['HARD']}; balance cabeça+1 | 1–10 | Hexagrama | ${pesoCol('power')} |`,
    `| **Controle** (control) | face_material, core, espessura_mm, furos, weight_g | base 4; SUPERSOFT+${CORE_CTRL['SUPERSOFT']}, HARD${CORE_CTRL['HARD']}; VIDRO/3K/Kevlar+${FACE_CTRL['VIDRO'] ?? 0}; esp≤20mm+2, ≥23mm−2; furos≥42−1; peso>340g−1 | 1–10 | Hexagrama | ${pesoCol('control')} |`,
    `| **Conforto** (comfort) | core, tecnologias antivib, espessura_mm, weight_g | base 5; SUPERSOFT/SOFT+${CORE_COMFORT['SUPERSOFT']}, HARD${CORE_COMFORT['HARD']}; antivib+1/+2 (cap 2); VIDRO/Kevlar+1; 18K/24K/6K15K−1; esp≤20mm−1, ≥23mm+1; peso≥340g−1 | 1–10 | Hexagrama | ${pesoCol('comfort')} |`,
    `| **Manuseio** (maneuverability) | espessura_mm, furos, weight_g | base 7; esp≤20mm+1, ≥23mm−1; peso≥340g−1; furos≥40+1, ≤20−1 | 1–10 | Hexagrama | ${pesoCol('maneuverability')} |`,
    `| **Spin** | superficie (textura) | áspera→7; levemente→5 (sem spin tech) / 7 (com); lisa→3/5; sem dado→5 | 1–10 | Hexagrama | ${pesoCol('spin')} |`,
    `| **Estabilidade** (stability) | face_material, tecnologias estruturais, espessura_mm, weight_g | base 5; VIDRO/HYBRID_VIDRO/KEVLAR_PURE→${fstab('VIDRO')}; CARBON_24K→${fstab('CARBON_24K')}; peso>340g+1; estrutural+1 (cap 1); esp≤20mm−1, ≥23mm+1; clamp [5,9] | 5–9 | Hexagrama | ${pesoCol('stability')} |`,
    `| **Forgiveness** | face_material, core, espessura_mm, formato | base 4; VIDRO+${fforg('VIDRO')}, HYBRID_VIDRO+${fforg('HYBRID_VIDRO')}, CARBON_24K${fforg('CARBON_24K')}; SUPERSOFT+${CORE_FORG['SUPERSOFT']}, HARD${CORE_FORG['HARD']}; redonda+1; esp≥22mm+1; 18K/24K cap 7 | 1–10 | Chip "Sweet spot" | ${pesoCol('forgiveness')} |`,
    '',
    '**Labels derivados em runtime (não são scores, são categorias):**',
    '',
    '| Label | Derivação | Valores |',
    '|---|---|---|',
    '| `sweet_spot` | forgiveness ≥7 → Generoso · 5–6 → Equilibrado · ≤4 → Exigente | Chip verde / cinza / âmbar |',
    '| `saida_de_bola` | comfort−power ≥2 → fácil · ≤−2 → exigente · senão → média | Chip verde / cinza / âmbar |',
    '',
    '**Regras absolutas do scorer:**',
    '- Spin tem peso **0** em todos os perfis (não afeta ranking; serve só como referência visual)',
    `- Lesão (cotovelo/ombro/punho) ativa override: conforto sobe para **${mat['comfort']['lesão']}/100** independente do nível`,
    `- Forgiveness tem peso **${mat['forgiveness']['ini']}/100** para iniciantes — o mais alto de todos os perfis para esse score`,
  ]

  return rows.join('\n')
}

function genUmbrales(): string {
  const conf = CONFIDENCE_CONFIG

  // Line refs found dynamically from source
  const confPath  = 'lib/agent/confidence.ts'
  const scorerPath = 'lib/scorer.ts'
  const recPath    = 'lib/recommend.ts'
  const sweetPath  = 'lib/sweetSpot.ts'
  const saidaPath  = 'lib/saidaBola.ts'
  const tablesPath = 'lib/motorTables.ts'
  const nivelPath  = 'lib/nivel.ts'

  const L = lineRef

  const rows: [string, string, string][] = [
    ['Confiança mínima para recomendar',          `${conf.threshold}%`,             L(confPath, 'threshold:')],
    ['Máximo de turnos sem recomendar',           `${conf.maxQuestions} turnos`,    L(confPath, 'maxQuestions:')],
    ['Peso mínimo inviolável (CATALOGO_FLOOR)',   '315g',                           L(scorerPath, 'CATALOGO_FLOOR = ')],
    ['Janela mínima de faixa de peso',            '15g (MIN_WINDOW)',               L(scorerPath, 'MIN_WINDOW = ')],
    ['Forgiveness floor para pool de iniciante',  '≤5 → excluída do pool',         L(recPath, 'forgiveness <=')],
    ['isAvancadaParaFiltro (gate de filtragem)',  'f≤4 | (f≤6 & (p≥8|c≥9)) | (f≤7 & p≥9)', L(recPath, 'return f <= 4')],
    ['derivarNivel (exibição — distinto do gate)','f≤4 | (f≤6 & (p≥7|c≥7)) | (f≤7 & p≥9)', L(nivelPath, "return 'avancado'")],
    ['Sweet spot: Generoso',                      'forgiveness ≥7',                L(sweetPath, '>= 7')],
    ['Sweet spot: Equilibrado',                   'forgiveness 5–6',               L(sweetPath, '>= 5')],
    ['Saída de bola: fácil',                      'comfort−power ≥ 2',             L(saidaPath, 'delta >= 2')],
    ['Saída de bola: exigente',                   'comfort−power ≤ −2',            L(saidaPath, 'delta <= -2')],
    ['FACE_POWER range',                          `VIDRO→${FACE_POWER['VIDRO']} … CARBON_24K→${FACE_POWER['CARBON_24K']}`, L(tablesPath, 'FACE_POWER')],
    ['CORE_POWER values',                         `SUPERSOFT/SOFT→${CORE_POWER['SUPERSOFT']}, MEDIUM→0, HARD→+${CORE_POWER['HARD']}`, L(tablesPath, 'CORE_POWER')],
    ['FACE_FORG range',                           `VIDRO→+${FACE_FORG['VIDRO']} … CARBON_24K→${FACE_FORG['CARBON_24K']}`, L(tablesPath, 'FACE_FORG')],
    ['CORE_COMFORT values',                       `SUPERSOFT/SOFT→+${CORE_COMFORT['SUPERSOFT']}, MEDIUM→0, HARD→${CORE_COMFORT['HARD']}`, L(tablesPath, 'CORE_COMFORT')],
    ['Stability: clamp',                          '[5, 9]',                        L('lib/motor.ts', 'Math.min(9, Math.max(5')],
    ['Faces 18K/24K: forgiveness cap',            '7',                             L('lib/motor.ts', 'faceGrade === \'CARBON_18K\'')],
  ]

  return [
    '## 7. Umbrais e Constantes Chave',
    '',
    '_Extraídos dinamicamente do código real. `arquivo:linha` é calculado ao gerar._',
    '',
    '| Constante / Regra | Valor | Fonte |',
    '|---|---|---|',
    ...rows.map(([name, val, src]) => `| ${name} | \`${val}\` | \`${src}\` |`),
  ].join('\n')
}

async function genPublicada(): Promise<string> {
  const env = readEnv()
  let count = 'N/A'
  let note  = ' _(requer `SUPABASE_URL` + `SUPABASE_ANON_KEY` em `.env.local`)_'

  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    try {
      const { count: n, error } = await sb
        .from('rackets')
        .select('*', { count: 'exact', head: true })
        .eq('publicada', true)
      if (!error && n != null) { count = `${n}`; note = '' }
      else if (error)           { note = ` _(erro DB: ${error.message})_` }
    } catch (e) { note = ` _(erro: ${(e as Error).message})_` }
    finally {
      // Fechar handles do cliente antes de retornar, para que process.exitCode
      // possa drenar o event loop sem disparar UV_HANDLE_CLOSING no Windows.
      sb.realtime.disconnect()
    }
  }

  return [
    '## 8. Raquete Publicada',
    '',
    '**Critério único de visibilidade pública:** campo `publicada = true` na tabela `rackets`.',
    '',
    'Controla: recomendador, catálogo, páginas, sitemap, todas as queries do código.',
    'Campos que NÃO controlam visibilidade: `is_active` (se modelo está no mercado), `stock`, `destaque_atleta`.',
    '',
    `**Contagem atual:** ${count} raquetes publicadas${note}`,
    '',
    '_Fonte: lib/recommend.ts:25–29 (comentário FIELD SEMANTICS)_',
  ].join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let content = readFileSync(MAPA_PATH, 'utf8')

  const sections: [string, string][] = [
    ['cabecera',      genCabecera()],
    ['tabla-scores',  genTablaScores()],
    ['umbrales',      genUmbrales()],
    ['publicada',     await genPublicada()],
  ]

  const stale: string[] = []
  let updated = content

  for (const [name, generated] of sections) {
    const current = extractSection(updated, name)

    if (current === null) {
      // No markers yet: insert on first run
      updated = insertFirst(updated, name, generated)
      if (!CHECK_MODE) console.log(`  ✔ created   AUTO-GEN:${name}`)
      else             { stale.push(name); console.log(`  MISSING    AUTO-GEN:${name}`) }
    } else if (current.trim() !== generated.trim()) {
      stale.push(name)
      if (!CHECK_MODE) {
        updated = replaceSection(updated, name, generated)
        console.log(`  ✔ updated   AUTO-GEN:${name}`)
      } else {
        console.log(`  DESATUALIZADO AUTO-GEN:${name}`)
      }
    } else {
      if (!CHECK_MODE) console.log(`  ✓ no change AUTO-GEN:${name}`)
    }
  }

  if (CHECK_MODE) {
    if (stale.length > 0) {
      console.error(`\n${stale.length} seção(ões) desatualizada(s): ${stale.join(', ')}`)
      console.error('Execute `tsx scripts/gen-mapa.ts` para atualizar.')
      process.exitCode = 1
      return  // deixa o event loop drenar; não dispara UV_HANDLE_CLOSING
    }
    console.log('\n✓ Mapa atualizado — nenhuma divergência detectada.')
    return
  }

  if (updated !== content) {
    writeFileSync(MAPA_PATH, updated, 'utf8')
    console.log('\ndocs/mapa-do-sistema.md atualizado.')
  } else {
    console.log('\nNenhuma alteração necessária.')
  }
}

main().catch(e => { console.error(e); process.exitCode = 2 })
