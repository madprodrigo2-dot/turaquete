export async function sendTelegram(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados')

  // URLSearchParams usa percent-encoding (UTF-8) para o body, o que garante
  // que emoji e acentos chegam corretos independente de qualquer wrapper de fetch.
  const ac  = new AbortController()
  const t   = setTimeout(() => ac.abort(), 30_000)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      signal: ac.signal,
      body:   new URLSearchParams({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Telegram error ${res.status}: ${err}`)
    }
  } finally {
    clearTimeout(t)
  }
}
