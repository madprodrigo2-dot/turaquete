export const CHAT_LIMITS = {
  BURST_PER_MIN:  20,   // max msgs per IP per minute (burst guard)
  MAX_PER_DAY_IP: 150,  // max msgs per IP per day
  MAX_PER_CONV:   25,   // hard stop per conversation (also enforced client-side)
  WARN_AT_CONV:   20,   // approaching-limit warning (client-side only)
}

const DAY_MS    = 24 * 60 * 60 * 1000
const MINUTE_MS = 60_000
const HOUR_MS   = 60 * 60 * 1000

const store = new Map<string, { count: number; resetAt: number }>()

function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

function peek(key: string): { count: number; resetAt: number } | null {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || entry.resetAt <= now) return null
  return entry
}

// Chat: 20 req/IP/min (burst guard) + 150 req/IP/day + 25 req/session
export function checkRateLimit(ip: string, sessionId?: string): boolean {
  if (!check(`ip_min:${ip}`, CHAT_LIMITS.BURST_PER_MIN, MINUTE_MS)) return false
  if (!check(`ip_day:${ip}`, CHAT_LIMITS.MAX_PER_DAY_IP, DAY_MS)) return false
  if (sessionId && !check(`sess:${sessionId}`, CHAT_LIMITS.MAX_PER_CONV, DAY_MS)) return false
  return true
}

export type LimitesState = {
  ipPerMin: { count: number; limit: number; resetInMs: number }
  ipPerDay: { count: number; limit: number; resetInMs: number }
  sessao:   { count: number; limit: number; resetInMs: number } | null
  ip: string
}

export function getRateLimitState(ip: string, sessionId?: string): LimitesState {
  const now = Date.now()
  const minEntry  = peek(`ip_min:${ip}`)
  const dayEntry  = peek(`ip_day:${ip}`)
  const sessEntry = sessionId ? peek(`sess:${sessionId}`) : null

  return {
    ipPerMin: {
      count:     minEntry?.count ?? 0,
      limit:     CHAT_LIMITS.BURST_PER_MIN,
      resetInMs: minEntry ? Math.max(0, minEntry.resetAt - now) : 0,
    },
    ipPerDay: {
      count:     dayEntry?.count ?? 0,
      limit:     CHAT_LIMITS.MAX_PER_DAY_IP,
      resetInMs: dayEntry ? Math.max(0, dayEntry.resetAt - now) : 0,
    },
    sessao: sessEntry ? {
      count:     sessEntry.count,
      limit:     CHAT_LIMITS.MAX_PER_CONV,
      resetInMs: Math.max(0, sessEntry.resetAt - now),
    } : null,
    ip,
  }
}

// Events: 120 req/IP/hour — generous for real users, stops bulk writes
export function checkEventsRateLimit(ip: string): boolean {
  return check(`ev:${ip}`, 120, HOUR_MS)
}
