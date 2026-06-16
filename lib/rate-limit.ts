const store = new Map<string, { count: number; resetAt: number }>()
const MINUTE_MS = 60_000
const HOUR_MS   = 60 * 60 * 1000

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

// Chat: 5 req/IP/min (burst guard) + 30 req/IP/hour + 20 req/session/24h
// Human pace: one message every 15-45s → 5/min is never reached legitimately.
export function checkRateLimit(ip: string, sessionId?: string): boolean {
  if (!check(`ip_min:${ip}`, 5, MINUTE_MS)) return false
  if (!check(`ip:${ip}`, 30, HOUR_MS)) return false
  if (sessionId && !check(`sess:${sessionId}`, 20, 24 * HOUR_MS)) return false
  return true
}

// Events: 120 req/IP/hour — generous for real users, stops bulk writes
export function checkEventsRateLimit(ip: string): boolean {
  return check(`ev:${ip}`, 120, HOUR_MS)
}
