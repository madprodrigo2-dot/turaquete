const store = new Map<string, { count: number; resetAt: number }>()
const HOUR_MS = 60 * 60 * 1000

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

// 30 req/IP/hour — 20 req/session (janela de 24h, reseta se a sessão for renovada)
export function checkRateLimit(ip: string, sessionId?: string): boolean {
  if (!check(`ip:${ip}`, 30, HOUR_MS)) return false
  if (sessionId && !check(`sess:${sessionId}`, 20, 24 * HOUR_MS)) return false
  return true
}
