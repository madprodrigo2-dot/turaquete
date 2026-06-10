import { listarMarcas } from '@/lib/recommend'
import HomeClient from '@/components/HomeClient'

export default async function Page() {
  const brands = await listarMarcas().catch(() => [])
  return <HomeClient brands={brands} />
}
