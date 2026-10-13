import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import Link from 'next/link'

type AdminGrip = {
  id: number
  name: string
  slug: string
  material: string | null
  espessura_mm: number | null
  comprimento_cm: number | null
  largura_cm: number | null
  tipo: string | null
  embalagem_unidades: number | null
  embalagem_formato: string | null
  image_url: string | null
  source_url: string | null
  affiliate_url: string | null
  price: number | null
  currency: string | null
  confianca: string | null
  fonte_notas: string | null
  specs_extra: Record<string, unknown> | null
  publicada: boolean
  is_active: boolean | null
  brand: { id: number; name: string } | null
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-gray-700">
        {value === null || value === undefined || value === '' ? (
          <span className="text-gray-300 italic">não informado</span>
        ) : (
          value
        )}
      </p>
    </div>
  )
}

export default async function GripPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) redirect('/admin/login')

  const { slug } = await params
  const sb = getSupabase()

  const { data, error } = await sb
    .from('grips')
    .select(`
      id, name, slug, material, espessura_mm, comprimento_cm, largura_cm, tipo,
      embalagem_unidades, embalagem_formato,
      image_url, source_url, affiliate_url, price, currency,
      confianca, fonte_notas, specs_extra,
      publicada, is_active,
      brand:brands(id, name)
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) notFound()

  const raw = data as Record<string, unknown>
  const grip: AdminGrip = {
    ...(raw as Omit<AdminGrip, 'brand'>),
    brand: Array.isArray(raw.brand) ? ((raw.brand[0] as AdminGrip['brand']) ?? null) : (raw.brand as AdminGrip['brand']),
  }

  const confiancaColor =
    grip.confianca === 'alta' ? 'text-teal-600 bg-teal-50' :
    grip.confianca === 'media' ? 'text-amber-600 bg-amber-50' :
    grip.confianca === 'baixa' ? 'text-red-500 bg-red-50' :
    'text-gray-400 bg-gray-50'

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Grips</span>
        <span>›</span>
        <span className="text-gray-700 font-medium">{grip.name}</span>
        {!grip.publicada && (
          <span className="ml-2 bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-medium">
            não publicado
          </span>
        )}
      </div>

      <section className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Preview — somente leitura
          </span>
          {grip.confianca && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${confiancaColor}`}>
              confiança: {grip.confianca}
            </span>
          )}
        </div>

        <div className="p-5 flex gap-5">
          <div className="shrink-0 w-32 h-40 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
            {grip.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={grip.image_url} alt={grip.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-gray-300 text-center px-2">sem foto<br />pendente</span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Nome" value={grip.name} />
            <Field label="Marca" value={grip.brand?.name} />
            <Field label="Material" value={grip.material} />
            <Field label="Tipo" value={grip.tipo} />
            <Field label="Espessura (mm)" value={grip.espessura_mm} />
            <Field
              label="Dimensões"
              value={
                grip.comprimento_cm || grip.largura_cm
                  ? `${grip.comprimento_cm ?? '?'} × ${grip.largura_cm ?? '?'} cm`
                  : null
              }
            />
            <Field
              label="Embalagem"
              value={
                grip.embalagem_unidades || grip.embalagem_formato
                  ? `${grip.embalagem_unidades ?? '?'}un — ${grip.embalagem_formato ?? '?'}`
                  : null
              }
            />
            <Field
              label="Preço"
              value={grip.price ? `${grip.currency ?? 'BRL'} ${grip.price}` : null}
            />
            <Field
              label="Afiliado"
              value={
                grip.affiliate_url ? (
                  <a href={grip.affiliate_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                    link
                  </a>
                ) : null
              }
            />
            <Field
              label="Fonte"
              value={
                grip.source_url ? (
                  <a href={grip.source_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline break-all">
                    {grip.source_url}
                  </a>
                ) : null
              }
            />
          </div>
        </div>

        {grip.fonte_notas && (
          <div className="px-5 pb-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Notas de fonte</p>
            <p className="text-xs text-gray-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg p-3">
              {grip.fonte_notas}
            </p>
          </div>
        )}

        {grip.specs_extra && Object.keys(grip.specs_extra).length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">specs_extra</p>
            <pre className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(grip.specs_extra, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600">
        ← voltar ao admin
      </Link>
    </div>
  )
}
