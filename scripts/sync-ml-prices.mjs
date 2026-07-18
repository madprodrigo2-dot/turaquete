/**
 * Sync racket prices from Mercado Livre affiliate pages.
 * Uses Playwright (headless: false) because ML blocks headless browsers.
 *
 * Usage:
 *   node scripts/sync-ml-prices.mjs
 *
 * What it does:
 *   1. Fetches the current price from each ML affiliate page
 *   2. Detects paused / finished / removed listings (does NOT unpublish automatically)
 *   3. Applies price updates directly to the DB (price + price_updated_at)
 *   4. Sends a Telegram summary on completion
 *
 * Env vars needed in .env.local:
 *   TELEGRAM_BOT_TOKEN=<token do bot>
 *   TELEGRAM_CHAT_ID=<chat id ou @username>
 *
 * Schedule weekly via Windows Task Scheduler.
 */

import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Load env vars from .env.local ─────────────────────────────────────────────
const envFile = new URL('../.env.local', import.meta.url)
let envContent = ''
try { envContent = readFileSync(envFile, 'utf-8') } catch {}
for (const line of envContent.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length && !process.env[k.trim()]) {
    process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '')
  }
}

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// ── Telegram ──────────────────────────────────────────────────────────────────
async function sendTelegram(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error('[Telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurado — pulando.')
    return
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    if (!res.ok) console.error('[Telegram] Erro ao enviar:', await res.text())
  } catch (e) {
    console.error('[Telegram] Falha na requisição:', e.message)
  }
}

// ── ML listing status detection ───────────────────────────────────────────────
// Returns 'active' | 'paused' | 'finished' | 'unavailable' | 'unknown'
async function detectListingStatus(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText ?? ''
    const bodyLower = body.toLowerCase()

    // Paused listing signals
    if (
      bodyLower.includes('anúncio pausado') ||
      bodyLower.includes('anuncio pausado') ||
      bodyLower.includes('este anúncio está pausado') ||
      document.querySelector('.ui-pdp-seller__header--paused') ||
      document.querySelector('[class*="paused"]')
    ) return 'paused'

    // Finished / removed signals
    if (
      bodyLower.includes('anúncio finalizado') ||
      bodyLower.includes('anúncio encerrado') ||
      bodyLower.includes('este produto não está disponível') ||
      bodyLower.includes('não encontramos o que você procura') ||
      bodyLower.includes('página não encontrada') ||
      document.querySelector('.ui-pdp-buybox__quantity__disabled') ||
      document.title?.toLowerCase().includes('não encontrado')
    ) return 'finished'

    // Catalog page with other variations still available — link still works,
    // user just needs to pick a different variation
    if (
      (bodyLower.includes('indisponível') || bodyLower.includes('indisponivel')) &&
      (bodyLower.includes('escolha outra variação') || bodyLower.includes('escolha outra variacao') ||
       bodyLower.includes('outra variação') || bodyLower.includes('outra variacao'))
    ) return 'variation'

    // Truly unavailable — no variation fallback, check BEFORE active button
    if (
      bodyLower.includes('indisponível') ||
      bodyLower.includes('indisponivel')
    ) return 'unavailable'

    // Has buy button = active
    if (
      document.querySelector('.andes-button--loud') ||
      document.querySelector('[class*="buy-now"]') ||
      document.querySelector('.ui-pdp-action-modal__trigger')
    ) return 'active'

    return 'unknown'
  }).catch(() => 'unknown')
}

// ── CLI flags ─────────────────────────────────────────────────────────────────
// --dry-run  : scrape prices but skip all DB writes and Telegram; write price-drift-report.md
const args      = process.argv.slice(2)
const DRY_RUN   = args.includes('--dry-run')
const slugFilter = args.filter(a => !a.startsWith('--'))

let query = sb
  .from('rackets')
  .select('slug, name, price, affiliate_url, is_active')
  .not('affiliate_url', 'is', null)
  .eq('publicada', true)
  .order('name')

if (slugFilter.length > 0) query = query.in('slug', slugFilter)

const { data: rackets, error: fetchErr } = await query

if (fetchErr) { console.error('DB error:', fetchErr.message); process.exit(1) }

console.error(`\nSincronizando preços de ${rackets.length} raquetes com afiliado ML...\n`)

// ── Launch visible browser (headless:false bypasses ML bot detection) ─────────
const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-infobars'],
})
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  locale: 'pt-BR',
  viewport: { width: 1280, height: 800 },
  extraHTTPHeaders: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
})
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false })
})

// ── Results tracking ──────────────────────────────────────────────────────────
const updated        = []  // { slug, name, oldPrice, newPrice }
const unchanged      = []  // { slug, name, price }
const paused         = []  // { slug, name, price, status }
const failed         = []  // { slug, name, reason }
const markedInactive = []  // { slug, name } — is_active changed false this run
const markedActive   = []  // { slug, name } — is_active returned true this run

// ── Scrape each racket ────────────────────────────────────────────────────────
for (const racket of rackets) {
  process.stderr.write(`  ${racket.name.padEnd(42)}`)

  const page = await context.newPage()
  try {
    await page.goto(racket.affiliate_url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForSelector('.andes-money-amount__fraction', { timeout: 10000 }).catch(() => {})

    const listingStatus = await detectListingStatus(page)

    // Extract the current price
    const currPrice = await page.evaluate(() => {
      function parseMoney(el) {
        if (!el) return null
        const frac = el.querySelector('.andes-money-amount__fraction')
        if (!frac) return null
        const num = parseInt(frac.textContent.replace(/\./g, '').trim(), 10)
        const centsEl = el.querySelector('.andes-money-amount__cents')
        const cents = centsEl ? parseInt(centsEl.textContent.trim(), 10) : 0
        return isNaN(num) ? null : (cents > 0 ? parseFloat(`${num}.${cents}`) : num)
      }
      const all = [...document.querySelectorAll('.andes-money-amount')]
      const curr = all.find(el =>
        !el.classList.contains('andes-money-amount--previous') &&
        !el.closest('.andes-money-amount--previous') &&
        el.querySelector('.andes-money-amount__fraction')
      )
      return parseMoney(curr)
    }).catch(() => null)

    if (listingStatus === 'variation') {
      // Catalog page — specific variation unavailable but page still works.
      // Mark is_active=true (link is valid); don't update price (shown price is for another variation).
      failed.push({ slug: racket.slug, name: racket.name, reason: 'variação específica indisponível — página de catálogo ainda ativa' })
      process.stderr.write(`!! variação indisponível (catálogo ok)\n`)
      if (racket.is_active !== true) {
        if (!DRY_RUN) await sb.from('rackets').update({ is_active: true }).eq('slug', racket.slug)
        markedActive.push({ slug: racket.slug, name: racket.name })
      }
    } else if (listingStatus === 'paused' || listingStatus === 'finished' || listingStatus === 'unavailable') {
      paused.push({ slug: racket.slug, name: racket.name, price: racket.price, status: listingStatus })
      process.stderr.write(`!! ANUNCIO ${listingStatus.toUpperCase()}\n`)
      if (racket.is_active !== false) {
        if (!DRY_RUN) await sb.from('rackets').update({ is_active: false }).eq('slug', racket.slug)
        markedInactive.push({ slug: racket.slug, name: racket.name, status: listingStatus })
      }
    } else if (currPrice == null || currPrice <= 0) {
      const reason = listingStatus === 'unknown'
        ? 'seletor de preço não encontrado na página (layout pode ter mudado)'
        : `anúncio com status "${listingStatus}" sem preço visível`
      failed.push({ slug: racket.slug, name: racket.name, reason })
      process.stderr.write(`!! preço não encontrado\n`)
    } else {
      const oldPrice = racket.price != null ? Number(racket.price) : null
      const priceChanged = oldPrice !== currPrice

      if (priceChanged) {
        updated.push({ slug: racket.slug, name: racket.name, oldPrice, newPrice: currPrice })
        process.stderr.write(`R$${String(oldPrice ?? '—').padStart(8)} → R$${currPrice}  ← alterado\n`)
      } else {
        unchanged.push({ slug: racket.slug, name: racket.name, price: currPrice })
        process.stderr.write(`R$${currPrice}  (sem alteração)\n`)
      }

      if (racket.is_active !== true) markedActive.push({ slug: racket.slug, name: racket.name })

      if (!DRY_RUN) {
        const { error: upErr } = await sb
          .from('rackets')
          .update({ price: currPrice, price_updated_at: new Date().toISOString(), is_active: true })
          .eq('slug', racket.slug)
        if (upErr) {
          failed.push({ slug: racket.slug, name: racket.name, reason: `DB error: ${upErr.message}` })
          process.stderr.write(`     !! DB error: ${upErr.message}\n`)
          const uidx = updated.findIndex(r => r.slug === racket.slug)
          if (uidx >= 0) updated.splice(uidx, 1)
          const uidx2 = unchanged.findIndex(r => r.slug === racket.slug)
          if (uidx2 >= 0) unchanged.splice(uidx2, 1)
        }
      }
    }
  } catch (err) {
    const reason = err.message?.slice(0, 80) ?? 'erro desconhecido'
    failed.push({ slug: racket.slug, name: racket.name, reason })
    process.stderr.write(`!! ERRO: ${reason}\n`)
  } finally {
    await page.close().catch(() => {})
    await new Promise(r => setTimeout(r, 1200))
  }
}

await browser.close()

// ── Console summary ───────────────────────────────────────────────────────────
console.error('\n' + '─'.repeat(60))
console.error(`Concluído: ${updated.length} alterados  |  ${unchanged.length} sem alteração  |  ${paused.length} anúncios inativos  |  ${failed.length} falhas`)

if (updated.length > 0) {
  console.error('\nPreços alterados:')
  for (const r of updated) {
    console.error(`  ${r.name.padEnd(42)} R$${String(r.oldPrice ?? '—').padStart(8)} → R$${r.newPrice}`)
  }
}
if (paused.length > 0) {
  console.error('\nAnúncios inativos (NÃO despublicados automaticamente):')
  for (const r of paused) {
    console.error(`  [${r.status}]  ${r.name}`)
  }
}
if (failed.length > 0) {
  console.error(`\nFalhas (${failed.length}):`)
  for (const r of failed) {
    console.error(`  [${r.slug}]  ${r.reason}`)
  }
}

// ── Telegram notification ─────────────────────────────────────────────────────
const SIGNIFICANT_PCT  = 5    // ≥5% de variação
const SIGNIFICANT_BRL  = 80   // E ≥R$80 de diferença absoluta

function isSignificant(oldPrice, newPrice) {
  if (oldPrice == null || oldPrice === 0) return false
  const diff    = Math.abs(newPrice - oldPrice)
  const pct     = (diff / oldPrice) * 100
  return pct >= SIGNIFICANT_PCT && diff >= SIGNIFICANT_BRL
}

const bigDrops     = updated.filter(r => r.oldPrice != null && r.newPrice < r.oldPrice  && isSignificant(r.oldPrice, r.newPrice))
const bigIncreases = updated.filter(r => r.oldPrice != null && r.newPrice > r.oldPrice  && isSignificant(r.oldPrice, r.newPrice))

const now   = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
const total = rackets.length

// Group failures by type for compact summary
const failVariacao  = failed.filter(r => r.reason.includes('variação'))
const failLayout    = failed.filter(r => r.reason.includes('layout') || r.reason.includes('seletor'))
const failSemPreco  = failed.filter(r => r.reason.includes('sem preço visível'))

let msg = `<b>Turaquete — Sync ML Preços</b>\n`
msg += `${now} · ${total} verificadas\n`
msg += `✅ ${updated.length} atualizadas · ${unchanged.length} iguais`
if (paused.length > 0) msg += ` · ⚠️ ${paused.length} inativo(s)`
if (failed.length > 0) msg += ` · ❌ ${failed.length} falhas`
msg += '\n'

if (markedInactive.length > 0) {
  msg += `\n🔴 <b>Inativado(s):</b>\n`
  for (const r of markedInactive) {
    const motivo = r.status === 'unavailable' ? 'indisponível' : r.status === 'paused' ? 'pausado' : 'encerrado'
    msg += `  • ${r.name} (${motivo})\n`
  }
}

if (markedActive.length > 0) {
  msg += `\n🟢 <b>Reativado(s):</b>\n`
  for (const r of markedActive) {
    msg += `  • ${r.name}\n`
  }
}

if (bigDrops.length > 0) {
  msg += `\n📉 <b>Quedas ≥${SIGNIFICANT_PCT}% e ≥R$${SIGNIFICANT_BRL}:</b>\n`
  for (const r of bigDrops) {
    const pct = Math.round(((r.oldPrice - r.newPrice) / r.oldPrice) * 100)
    msg += `  • ${r.name}: R$${r.oldPrice}→R$${r.newPrice} (−${pct}%)\n`
  }
}

if (bigIncreases.length > 0) {
  msg += `\n📈 <b>Altas ≥${SIGNIFICANT_PCT}% e ≥R$${SIGNIFICANT_BRL}:</b>\n`
  for (const r of bigIncreases) {
    const pct = Math.round(((r.newPrice - r.oldPrice) / r.oldPrice) * 100)
    msg += `  • ${r.name}: R$${r.oldPrice}→R$${r.newPrice} (+${pct}%)\n`
  }
}

// Failures: layout/seletor ones listed individually (need link review); others as counts
if (failed.length > 0) {
  msg += `\n❌ <b>Falhas (${failed.length}):</b>\n`
  if (failVariacao.length > 0) msg += `  • ${failVariacao.length} variação indisponível (catálogo ok)\n`
  if (failSemPreco.length > 0) msg += `  • ${failSemPreco.length} sem preço visível (scraper)\n`
  const failOther = failed.length - failVariacao.length - failSemPreco.length - failLayout.length
  if (failOther > 0)           msg += `  • ${failOther} outros\n`
}
if (failLayout.length > 0) {
  msg += `\n🔴 <b>Revisar link — seletor não encontrado (${failLayout.length}):</b>\n`
  for (const r of failLayout) msg += `  • ${r.name}\n`
}

if (paused.length === 0 && bigDrops.length === 0 && bigIncreases.length === 0 && failed.length === 0 && markedInactive.length === 0 && markedActive.length === 0) {
  msg += `\nTudo estável, sem variações significativas.`
}

// ── Dry-run: generate price-drift-report.md, skip Telegram ───────────────────
if (DRY_RUN) {
  import('fs').then(({ writeFileSync }) => {
    const allScraped = [
      ...updated.map(r => ({ ...r, status: 'changed' })),
      ...unchanged.map(r => ({ ...r, oldPrice: r.price, newPrice: r.price, status: 'unchanged' })),
      ...paused.map(r => ({ ...r, oldPrice: r.price, newPrice: null, status: r.status })),
      ...failed.map(r => ({ ...r, oldPrice: null, newPrice: null, status: 'failed' })),
    ]

    // Compute drift for rows with both prices
    const withDrift = allScraped
      .filter(r => r.oldPrice != null && r.newPrice != null)
      .map(r => {
        const drift = r.oldPrice === 0 ? null : ((r.newPrice - r.oldPrice) / r.oldPrice) * 100
        return { ...r, drift }
      })
      .sort((a, b) => Math.abs(b.drift ?? 0) - Math.abs(a.drift ?? 0))

    const noDrift = allScraped.filter(r => r.newPrice == null)
    const over10  = withDrift.filter(r => r.drift != null && Math.abs(r.drift) > 10).length

    const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const lines  = []

    lines.push('# Price Drift Report — Turaquete (Dry-Run)')
    lines.push('')
    lines.push(`> Gerado em: **${nowStr}** · DRY-RUN — nenhuma escrita no banco`)
    lines.push('')
    lines.push('## Contexto')
    lines.push('')
    lines.push(`Das **98** raquetes sem \`price_updated_at\` no catálogo:`)
    lines.push(`- **3** têm \`affiliate_url\` e foram verificadas aqui (Fobel Macaw, Fobel Macaw Onyx, Mormaii Samantha Barijan II 2025)`)
    lines.push(`- **95** são source-only (sem afiliado ML) — preço não pode ser verificado automaticamente`)
    lines.push('')
    lines.push('## Resumo')
    lines.push('')
    lines.push(`| | Qtd |`)
    lines.push(`|---|---|`)
    lines.push(`| Verificadas com preço obtido | ${withDrift.length} |`)
    lines.push(`| Com drift > 10% | ${over10} |`)
    lines.push(`| Anúncios inativos/pausados | ${paused.length} |`)
    lines.push(`| Falhas (preço não obtido) | ${noDrift.filter(r => r.status === 'failed').length} |`)
    lines.push('')

    if (withDrift.length > 0) {
      lines.push('## Drift de Preços (ordem: maior diferença)')
      lines.push('')
      lines.push('| Raquete | Preço DB (R$) | Preço ML atual (R$) | Drift % | Status |')
      lines.push('|---------|--------------|---------------------|---------|--------|')
      for (const r of withDrift) {
        const driftStr = r.drift != null
          ? `${r.drift > 0 ? '+' : ''}${r.drift.toFixed(1)}%`
          : '—'
        const flag = r.drift != null && Math.abs(r.drift) > 10 ? ' ⚠️' : ''
        lines.push(`| ${r.name} | ${r.oldPrice} | ${r.newPrice} | ${driftStr}${flag} | ${r.status} |`)
      }
      lines.push('')
    }

    if (noDrift.length > 0) {
      lines.push('## Sem Preço Obtido')
      lines.push('')
      for (const r of noDrift) {
        const reason = r.reason ?? r.status
        lines.push(`- **${r.name}** — ${reason}`)
      }
      lines.push('')
    }

    lines.push('## Source-Only (95 raquetes — não verificáveis via ML)')
    lines.push('')
    lines.push('Essas raquetes têm preço manual sem timestamp. Para atualizá-las é preciso visitar cada site oficial manualmente ou adicionar um afiliado ML.')
    lines.push('')
    lines.push(`**Drift > 10%:** ${over10} de ${withDrift.length} verificadas`)
    lines.push('')

    writeFileSync('scripts/price-drift-report.md', lines.join('\n'), 'utf8')
    console.error('\n📄 Dry-run report salvo: scripts/price-drift-report.md')
    console.error(`   Drift > 10%: ${over10}/${withDrift.length} verificadas`)
  })
  process.exitCode = 0
} else {
  await sendTelegram(msg)
}
