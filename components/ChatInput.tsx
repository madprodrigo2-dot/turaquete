'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
      <div className="flex items-end gap-2 max-w-2xl mx-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Me conta como você joga..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 bg-gray-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="rounded-xl bg-emerald-600 text-white px-4 py-3 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
          aria-label="Enviar"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
