import SiteNav from '@/components/SiteNav'

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen sand-texture">
      <SiteNav backLabel="Turaquete" />
      <main>{children}</main>
    </div>
  )
}
