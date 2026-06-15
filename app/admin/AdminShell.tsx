'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ThemeCtx { dark: boolean; toggle: () => void }
const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {} })
export const useAdminTheme = () => useContext(Ctx)

export default function AdminShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem('admin-theme') === 'dark')
  }, [])

  const toggle = () =>
    setDark(prev => {
      const next = !prev
      localStorage.setItem('admin-theme', next ? 'dark' : 'light')
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
