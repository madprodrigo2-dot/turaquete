'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const COOKIE = 'admin_test_view'
const TEST_MODE_COOKIE = 'turaquete_test_mode'

export default function AdminTestToggle() {
  const [active, setActive] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setActive(document.cookie.split(';').some(c => c.trim().startsWith(`${COOKIE}=1`)))
    // Marca automaticamente sessões de chat como teste enquanto admin estiver logado
    document.cookie = `${TEST_MODE_COOKIE}=1; path=/; max-age=86400`
  }, [])

  const toggle = () => {
    if (active) {
      document.cookie = `${COOKIE}=; path=/admin; max-age=0`
      setActive(false)
    } else {
      document.cookie = `${COOKIE}=1; path=/admin; max-age=86400`
      setActive(true)
    }
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
        active
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      {active ? '🧪 c/ teste' : '🧪 s/ teste'}
    </button>
  )
}
