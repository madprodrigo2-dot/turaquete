import { auth, signOut } from '@/auth'
import AdminNav from './AdminNav'
import AdminShell from './AdminShell'
import AdminTestToggle from '@/components/AdminTestToggle'

const buildLabel = process.env.NEXT_PUBLIC_BUILD_LABEL ?? null

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL

  if (!isAdmin) return <>{children}</>

  return (
    <AdminShell>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-11 flex items-center gap-3">
          <div className="relative flex-1 min-w-0 overflow-hidden">
            <div
              className="overflow-x-auto flex items-center gap-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              <span className="hidden md:inline shrink-0 text-xs text-gray-400 font-medium tracking-wide">
                Turaquete Admin
              </span>
              <AdminNav />
            </div>
            <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>
          <AdminTestToggle />
          {buildLabel && (
            <span className="shrink-0 text-[10px] font-mono text-gray-400">
              {buildLabel}
            </span>
          )}
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }) }}>
            <button
              type="submit"
              className="shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-6">{children}</div>
    </AdminShell>
  )
}
