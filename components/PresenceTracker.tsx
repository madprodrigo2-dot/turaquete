'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const CHANNEL = 'turaquete:presence'

export default function PresenceTracker({ url, anonKey }: { url: string; anonKey: string }) {
  const [count, setCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.json())
      .then((d: { isAdmin: boolean }) => setIsAdmin(d.isAdmin ?? false))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const client = createClient(url, anonKey)
    const myKey = crypto.randomUUID()

    const ch = client.channel(CHANNEL, {
      config: { presence: { key: myKey } },
    })

    ch.on('presence', { event: 'sync' }, () => {
      setCount(Object.keys(ch.presenceState()).length)
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ t: Date.now() })
      }
    })

    return () => { client.removeChannel(ch) }
  }, [url, anonKey])

  if (!isAdmin || count === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9998] flex items-center gap-1.5 bg-[#0E3A40] text-white/80 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg pointer-events-none select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0CC0BE] animate-pulse" />
      {count} {count === 1 ? 'pessoa online' : 'pessoas online'}
    </div>
  )
}
