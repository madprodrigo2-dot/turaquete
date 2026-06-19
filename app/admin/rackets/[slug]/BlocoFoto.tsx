'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function BlocoFoto({ slug, currentUrl }: { slug: string; currentUrl: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; url?: string; error?: string } | null>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slug', slug)
      const res = await fetch('/api/admin/upload-racket-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setResult({ ok: false, error: json.error ?? 'Erro desconhecido' })
      } else {
        setResult({ ok: true, url: json.image_url })
        setFile(null)
        setPreview(null)
        if (inputRef.current) inputRef.current.value = ''
        router.refresh()
      }
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message })
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = result?.url ?? currentUrl

  return (
    <section className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          D — Foto
        </span>
      </div>

      <div className="p-5 flex gap-5">
        {/* Current / preview image */}
        <div className="shrink-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">
            {preview ? 'Nova (antes do upload)' : 'Atual'}
          </p>
          <div className="w-28 h-36 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
            {(preview ?? displayUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview ?? displayUrl ?? ''}
                alt="foto"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-xs text-gray-300">sem foto</span>
            )}
          </div>
        </div>

        {/* Upload area */}
        <div className="flex-1 flex flex-col gap-3">
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <p className="text-xs text-gray-400">
              {file ? file.name : 'Arraste uma foto ou clique para selecionar'}
            </p>
            {file && (
              <p className="text-[10px] text-gray-300 mt-0.5">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />

          <p className="text-[10px] text-gray-400 leading-relaxed">
            O servidor remove o fundo automaticamente (BFS flood-fill) e normaliza para 800×1020 webp. JPG, PNG e WebP aceitos, ate 10MB.
          </p>

          {result && (
            <p className={`text-xs ${result.ok ? 'text-teal-600' : 'text-red-500'}`}>
              {result.ok ? 'Foto atualizada com sucesso.' : result.error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {uploading ? 'Processando…' : 'Enviar foto'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
