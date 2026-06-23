import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const contentType = 'image/png'
export const size        = { width: 1200, height: 630 }

export default function Image() {
  return new ImageResponse(
    // Single flat container — no nesting, no overflow, no absolute positioning.
    // Safe zone: 180px horizontal (15%), 90px vertical (14%) — well clear of any preview crop.
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0E3A40',
        paddingLeft: 180,
        paddingRight: 180,
        paddingTop: 90,
        paddingBottom: 90,
        boxSizing: 'border-box',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: 48,
          height: 4,
          background: '#0CC0BE',
          borderRadius: 2,
          marginBottom: 28,
          display: 'flex',
        }}
      />

      {/* Wordmark — 72px, plenty of room inside safe zone */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#FFFFFF',
          lineHeight: 1,
          marginBottom: 20,
          display: 'flex',
          textAlign: 'center',
        }}
      >
        Turaquete
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 27,
          fontWeight: 500,
          color: '#0CC0BE',
          lineHeight: 1.4,
          marginBottom: 12,
          textAlign: 'center',
          display: 'flex',
        }}
      >
        Especialista em raquetes de beach tennis
      </div>

      {/* Sub-tagline */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.40)',
          textAlign: 'center',
          display: 'flex',
        }}
      >
        A raquete certa de primeira.
      </div>

      {/* Domain */}
      <div
        style={{
          fontSize: 16,
          color: 'rgba(12,192,190,0.40)',
          marginTop: 32,
          display: 'flex',
        }}
      >
        turaquete.com.br
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
