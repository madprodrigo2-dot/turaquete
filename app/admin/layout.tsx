import { auth, signOut } from '@/auth'
import AdminNav from './AdminNav'
import AdminShell from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL

  if (!isAdmin) return <>{children}</>

  return (
    <AdminShell>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-11 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 font-medium tracking-wide">Turaquete Admin</span>
            <AdminNav />
          </div>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }) }}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
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
