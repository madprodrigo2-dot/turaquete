'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface ThemeCtx { dark: boolean; toggle: () => void }
const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {} })
export const useAdminTheme = () => useContext(Ctx)

export default function AdminShell({ children, initialDark }: { children: ReactNode; initialDark: boolean }) {
  const [dark, setDark] = useState(initialDark)

  const toggle = () =>
    setDark(prev => {
      const next = !prev
      localStorage.setItem('admin-theme', next ? 'dark' : 'light')
      document.cookie = `admin-theme=${next ? 'dark' : 'light'};path=/;max-age=31536000`
      return next
    })

  return (
    <Ctx.Provider value={{ dark, toggle }}>
      <div className={`min-h-screen bg-gray-50 font-sans text-sm text-gray-800${dark ? ' dark' : ''}`}>
        {children}
      </div>
    </Ctx.Provider>
  )
}
