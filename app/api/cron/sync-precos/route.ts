import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min — Vercel Pro limit

const GECKO_URL       = 'https://api.geckoapi.com.br/v1/extract'
const DELAY_MS        = 1200
const RETRY_DELAYS_MS = [2000, 4000, 6000] // só para 429

function stripParams(url: string): string {
  try { const u = new URL(url); return u.origin + u.pathname } catch { return url }
}

function isSpecificMlUrl(url: string | null): boolean {
  if (!url) return false
  return (
    url.includes('/up/MLBU') ||
    url.includes('/p/MLB')   ||
    url.includes('produto.mercadolivre.com.br/MLB')
  )
}

function extractPrice(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  // direct: { price: 299 }
  if (typeof b.price === 'number' && b.price > 0) return b.price
  // nested: { data: { price: 299 } }
  if (b.data && typeof b.data === 'object') {
    const d = b.data as Record<string, unknown>
    if (typeof d.price === 'number' && d.price > 0) return d.price
  }
  return null
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchGecko(
  cleanUrl: string,
  geckoKey: string,
): Promise<{ ok: boolean; status: number; body: unknown; retries: number; credits: number }> {
  let retries = 0
  for (let attempt = 0; attempt < 1 + RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(GECKO_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geckoKey}` },
      body:    JSON.stringify({ target: 'mercadolivre.com.br', type: 'pdp', url: cleanUrl }),
    })
    if (res.status !== 429) {
      const body = res.ok ? await res.json().catch(() => null) : null
      return { ok: res.ok, status: res.status, body, retries, credits: retries + 1 }
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await delay(RETRY_DELAYS_MS[attempt])
      retries++
    }
  }
  return { ok: false, status: 429, body: null, retries, credits: retries + 1 }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dry   = req.nextUrl.searchParams.get('dry') === 'true'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '0', 10) || 0

  const geckoKey = process.env.GECKOAPI_KEY
  if (!geckoKey) return NextResponse.json({ error: 'GECKOAPI_KEY não configurada' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Busca candidatas: URL específica de produto ML, publicadas, não inativas
  const query = sb
    .from('rackets')
    .select('id, name, price, affiliate_url')
    .eq('publicada', true)
    .not('is_active', 'eq', false)
    .not('affiliate_url', 'is', null)
    .order('id')

  const { data: all, error: fetchErr } = await query
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const candidatas = (all ?? []).filter(r => isSpecificMlUrl(r.affiliate_url))
  const batch = limit > 0 ? candidatas.slice(0, limit) : candidatas

  const results: { id: number; name: string; priceBefore: number | null; priceAfter: number | null; status: string; retries: number }[] = []
  let updated      = 0
  let failed       = 0
  let noPrice      = 0
  let priceChanged = 0
  let creditsTotal = 0
  const failedNames: string[] = []
  const startedAt = Date.now()

  for (const racket of batch) {
    const cleanUrl = stripParams(racket.affiliate_url!)

    let priceAfter: number | null = null
    let itemStatus = 'ok'
    let itemRetries = 0

    try {
      const { ok, status, body, retries, credits } = await fetchGecko(cleanUrl, geckoKey)
      itemRetries = retries
      creditsTotal += credits

      if (!ok) {
        itemStatus = status === 429 ? `gecko_429_after_${retries}_retries` : `gecko_${status}`
        failed++
        failedNames.push(racket.name)
      } else {
        priceAfter = extractPrice(body)
        if (priceAfter === null) {
          itemStatus = 'no_price'
          noPrice++
        } else {
          if (priceAfter !== racket.price) priceChanged++
          if (!dry) {
            const { error: upsertErr } = await sb
              .from('rackets')
              .update({
                price:            priceAfter,
                price_updated_at: new Date().toISOString(),
                price_source:     'geckoapi',
              })
              .eq('id', racket.id)
            if (upsertErr) { itemStatus = `db_err: ${upsertErr.message}`; failed++; failedNames.push(racket.name) }
            else updated++
          } else {
            updated++ // dry-run count
          }
        }
      }
    } catch (e) {
      itemStatus = `exception: ${e instanceof Error ? e.message : String(e)}`
      failed++
      failedNames.push(racket.name)
      creditsTotal++ // contabiliza tentativa mesmo com exception
    }

    results.push({
      id:          racket.id,
      name:        racket.name,
      priceBefore: racket.price,
      priceAfter,
      status:      itemStatus,
      retries:     itemRetries,
    })

    if (batch.indexOf(racket) < batch.length - 1) await delay(DELAY_MS)
  }

  if (!dry) {
    const durSec  = Math.round((Date.now() - startedAt) / 1000)
    const durLabel = durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${durSec}s`
    const failRate = batch.length > 0 ? failed / batch.length : 0
    const isAlert  = failRate > 0.15
    const icon     = isAlert ? '⚠️' : '✅'
    const dateLabel = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    })

    const lines = [
      `${icon} <b>Sync de Preços — ${dateLabel}</b>`,
      '',
      `📦 ${batch.length} processadas · ${updated} atualizadas`,
      `🔄 ${priceChanged} mudaram de preço`,
      `⬜ ${noPrice} sem preço (anterior mantido)`,
      `❌ ${failed} falha${failed !== 1 ? 's' : ''} (após retries)${isAlert ? ` — ${(failRate * 100).toFixed(1)}%` : ''}`,
    ]

    if (isAlert && failedNames.length > 0) {
      const shown = failedNames.slice(0, 5)
      const extra = failedNames.length - shown.length
      lines.push(`  → ${shown.join(', ')}${extra > 0 ? ` e mais ${extra}` : ''}`)
    }

    lines.push(`💳 ${creditsTotal} créditos · ⏱ ${durLabel}`)

    sendTelegram(lines.join('\n')).catch(() => {}) // fire-and-forget
  }

  return NextResponse.json({
    dry,
    total:    batch.length,
    updated,
    failed,
    noPrice,
    creditsUsed: creditsTotal,
    results,
  })
}
