import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/telegram'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300 // 5 min — Vercel Pro limit

const GECKO_URL          = 'https://api.geckoapi.com.br/v1/extract'
const DELAY_MS           = 1200
const RETRY_DELAYS_MS    = [2000, 4000, 6000] // só para 429
const CHUNK_SIZE         = 25
const BUDGET_MS          = 230_000  // 70s de margem antes do kill de 300s do Vercel
const FOURTEEN_DAYS_MS   = 14 * 24 * 60 * 60 * 1000 // janela de elegibilidade
// Buffer: ciclo atual (~190 raquetes / 25/dia = 8 dias), janela 14 = 6 dias de buffer.
// Aguenta até ~350 raquetes antes de precisar ajustar (bump manual).

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
  if (typeof b.price === 'number' && b.price > 0) return b.price
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
    const ac = new AbortController()
    const t  = setTimeout(() => ac.abort(), 15_000) // 15s por tentativa
    let res: Response
    try {
      res = await fetch(GECKO_URL, {
        signal:  ac.signal,
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geckoKey}` },
        body:    JSON.stringify({ target: 'mercadolivre.com.br', type: 'pdp', url: cleanUrl }),
      })
      clearTimeout(t)
    } catch (e) {
      clearTimeout(t)
      if (e instanceof Error && e.name === 'AbortError') {
        return { ok: false, status: 408, body: null, retries, credits: retries + 1 }
      }
      throw e
    }
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

  const dry       = req.nextUrl.searchParams.get('dry') === 'true'
  const chunkSize = Math.max(1, parseInt(req.nextUrl.searchParams.get('chunk') ?? String(CHUNK_SIZE), 10) || CHUNK_SIZE)

  const geckoKey = process.env.GECKOAPI_KEY
  if (!geckoKey) return NextResponse.json({ error: 'GECKOAPI_KEY não configurada' }, { status: 500 })

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const fourteenDaysAgo = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString()

  // Busca candidatas ordenadas por desatualização de preço (mais velhas primeiro, NULL first).
  // Filtragem por URL e janela de elegibilidade feita no cliente — dataset pequeno (~266 linhas).
  const { data: all, error: fetchErr } = await sb
    .from('rackets')
    .select('id, name, price, price_updated_at, affiliate_url, last_sync_at')
    .eq('publicada', true)
    .not('is_active', 'eq', false)
    .not('affiliate_url', 'is', null)
    .order('price_updated_at', { ascending: true, nullsFirst: true })

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const items = (all ?? [])
    .filter(r =>
      isSpecificMlUrl(r.affiliate_url) &&
      (r.price_updated_at === null || r.price_updated_at < fourteenDaysAgo) &&
      (r.last_sync_at    === null || r.last_sync_at    < fourteenDaysAgo)
    )
    .slice(0, chunkSize)

  if (items.length === 0) {
    console.log('[sync] fila vazia — nenhuma raquete elegível hoje')
    return NextResponse.json({ dry, chunk: 0, processed: 0 })
  }

  // Claim pessimista: 1 UPDATE com todos os IDs ANTES do loop fecha a janela de overlap
  // entre invocações concorrentes. O update final por item sobrescreve com o status real.
  if (!dry) {
    await sb.from('rackets')
      .update({ last_sync_at: new Date().toISOString() })
      .in('id', items.map(r => r.id))
  }

  const results: {
    id: number; name: string; priceBefore: number | null; priceAfter: number | null
    status: string; retries: number
  }[] = []

  let updated         = 0
  let failed          = 0
  let noPrice         = 0
  let priceChanged    = 0
  let creditsTotal    = 0
  let budgetExhausted = false
  const failedNames: string[] = []
  const startTime = Date.now()

  try {
    for (let i = 0; i < items.length; i++) {
      if (Date.now() - startTime > BUDGET_MS) { budgetExhausted = true; break }

      const racket   = items[i]
      const cleanUrl = stripParams(racket.affiliate_url!)

      let priceAfter: number | null = null
      let itemStatus     = 'ok'
      let itemRetries    = 0

      try {
        const { ok, status, body, retries, credits } = await fetchGecko(cleanUrl, geckoKey)
        itemRetries   = retries
        creditsTotal += credits

        if (!ok) {
          itemStatus = status === 429 ? `gecko_429_after_${retries}_retries` : `gecko_${status}`
          failed++
          failedNames.push(racket.name)
        } else {
          priceAfter = extractPrice(body)
          if (priceAfter === null) {
            // no_price: NÃO toca price_updated_at — mantém raquete prioritária na próxima janela
            itemStatus = 'no_price'
            noPrice++
          } else {
            if (priceAfter !== racket.price) priceChanged++
            if (!dry) {
              const syncNow = new Date().toISOString()
              const { error: upsertErr } = await sb
                .from('rackets')
                .update({
                  price_previous:   racket.price,
                  price:            priceAfter,
                  price_updated_at: syncNow,
                  price_source:     'geckoapi',
                  last_sync_status: 'ok',
                  last_sync_at:     syncNow,
                })
                .eq('id', racket.id)
              if (upsertErr) {
                itemStatus = `db_err: ${upsertErr.message}`
                failed++
                failedNames.push(racket.name)
              } else {
                updated++
              }
            } else {
              updated++
            }
          }
        }
      } catch (e) {
        itemStatus = `exception: ${e instanceof Error ? e.message : String(e)}`
        failed++
        failedNames.push(racket.name)
        creditsTotal++
      }

      results.push({
        id:          racket.id,
        name:        racket.name,
        priceBefore: racket.price,
        priceAfter,
        status:      itemStatus,
        retries:     itemRetries,
      })

      if (!dry && itemStatus !== 'ok') {
        const syncStatus = itemStatus === 'no_price'        ? 'no_price'
          : itemStatus.startsWith('gecko_429')              ? 'error_429'
          : itemStatus === 'gecko_408'                      ? 'timeout'
          : 'error'
        try {
          await sb.from('rackets')
            .update({ last_sync_status: syncStatus, last_sync_at: new Date().toISOString() })
            .eq('id', racket.id)
        } catch { /* status write failure não afeta o fluxo principal */ }
      }

      if (i < items.length - 1) await delay(DELAY_MS)
    }
  } catch (e) {
    const stoppedAt = items[results.length]?.name ?? '?'
    await sendTelegram([
      '⛔ <b>Sync INTERROMPIDO</b>',
      '',
      `Parou em: <b>${stoppedAt}</b> (item ${results.length + 1} de ${items.length} nesta chunk)`,
      `Motivo: ${e instanceof Error ? e.message : String(e)}`,
      '',
      'Amanhã retoma automaticamente das mais desatualizadas.',
    ].join('\n')).catch((err: unknown) => {
      console.error('[sync] telegram falhou (interrupt):', err instanceof Error ? err.message : String(err))
    })
    throw e
  }

  // Telegram diário: resumo do chunk processado hoje
  if (!dry) {
    const durSec  = Math.round((Date.now() - startTime) / 1000)
    const durLabel = durSec >= 60
      ? `${Math.floor(durSec / 60)}m ${durSec % 60}s`
      : `${durSec}s`
    const dateLabel = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    })

    const hasErrors = failed > 0
    const icon = hasErrors ? '⚠️' : '✅'

    const lines = [
      `${icon} <b>Sync diário — ${dateLabel}</b>`,
      '',
      `📦 ${results.length} processadas`,
    ]

    const parts: string[] = []
    if (updated > 0 || (!hasErrors && noPrice === 0)) parts.push(`✓ ${updated} ok`)
    if (noPrice > 0)  parts.push(`⚠️ ${noPrice} no_price`)
    if (failed > 0)   parts.push(`❌ ${failed} erro${failed !== 1 ? 's' : ''}`)
    if (parts.length) lines.push(parts.join('  |  '))

    if (hasErrors && failedNames.length > 0) {
      const shown = failedNames.slice(0, 5)
      const extra = failedNames.length - shown.length
      lines.push(`  → ${shown.join(', ')}${extra > 0 ? ` e mais ${extra}` : ''}`)
    }

    lines.push(`🔄 ${priceChanged} mudaram de preço`)
    lines.push(`🪙 ${creditsTotal} crédito${creditsTotal !== 1 ? 's' : ''}`)
    lines.push(`⏱ ${durLabel}`)
    if (budgetExhausted) lines.push('⚡ budget esgotado — chunk interrompido')

    console.log('[sync] enviando Telegram diário')
    await sendTelegram(lines.join('\n')).catch((e: unknown) => {
      console.error('[sync] telegram falhou:', e instanceof Error ? e.message : String(e))
    })
  }

  console.log('[sync] chunk completo:', { budgetExhausted, processed: results.length, updated, failed, noPrice })

  return NextResponse.json({
    dry,
    chunk:           items.length,
    processed:       results.length,
    budgetExhausted,
    updated,
    failed,
    noPrice,
    priceChanged,
    creditsUsed:     creditsTotal,
    results,
  })
}
