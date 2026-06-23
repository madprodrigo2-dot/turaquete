import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const contentType = 'image/png'
export const size        = { width: 1200, height: 630 }

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0E3A40',
          padding: '72px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle — top right */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'rgba(12,192,190,0.08)',
            display: 'flex',
          }}
        />
        {/* Decorative circle — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(255,94,58,0.06)',
            display: 'flex',
          }}
        />

        {/* Aqua accent bar */}
        <div
          style={{
            width: 64,
            height: 6,
            borderRadius: 3,
            background: '#0CC0BE',
            marginBottom: 36,
            display: 'flex',
          }}
        />

        {/* Brand name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-3px',
            lineHeight: 1,
            marginBottom: 24,
            display: 'flex',
          }}
        >
          Turaquete
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 34,
            fontWeight: 500,
            color: '#0CC0BE',
            lineHeight: 1.3,
            marginBottom: 16,
            display: 'flex',
          }}
        >
          Especialista em raquetes de beach tennis
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.45)',
            display: 'flex',
          }}
        >
          A raquete certa de primeira.
        </div>

        {/* URL — bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            right: 80,
            fontSize: 20,
            color: 'rgba(12,192,190,0.5)',
            letterSpacing: '0.5px',
            display: 'flex',
          }}
        >
          turaquete.com.br
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
