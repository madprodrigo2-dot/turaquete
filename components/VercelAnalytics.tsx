'use client'

import { Analytics } from '@vercel/analytics/react'

function isTestMode(): boolean {
  return document.cookie.split(';').some(c => c.trim() === 'turaquete_test_mode=1')
}

export default function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => (isTestMode() ? null : event)}
    />
  )
}
