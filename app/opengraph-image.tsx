import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const contentType = 'image/png'
export const size        = { width: 1200, height: 630 }

export default function Image() {
  return new ImageResponse(
    (
      // Outer: exact pixel size, no padding, overflow hidden only for decorative circles
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0E3A40',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle — top right (stays in bounds) */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: 200,
            background: 'rgba(12,192,190,0.09)',
            display: 'flex',
          }}
        />
        {/* Decorative circle — bottom left (stays in bounds) */}
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 280,
            height: 280,
            borderRadius: 140,
            background: 'rgba(255,94,58,0.07)',
            display: 'flex',
          }}
        />

        {/* Content column — inner div owns the padding so overflow:hidden on outer never clips text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 96px',
            width: 1200,
            height: 630,
            position: 'relative',
          }}
        >
          {/* Aqua accent bar */}
          <div
            style={{
              width: 56,
              height: 5,
              borderRadius: 3,
              background: '#0CC0BE',
              marginBottom: 32,
              display: 'flex',
            }}
          />

          {/* Brand name — centered, no negative letter-spacing, whiteSpace nowrap */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              marginBottom: 22,
              display: 'flex',
            }}
          >
            Turaquete
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: '#0CC0BE',
              textAlign: 'center',
              lineHeight: 1.35,
              marginBottom: 14,
              maxWidth: 720,
              display: 'flex',
            }}
          >
            Especialista em raquetes de beach tennis
          </div>

          {/* Sub-tagline */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.40)',
              textAlign: 'center',
              display: 'flex',
            }}
          >
            A raquete certa de primeira.
          </div>

          {/* URL — bottom right, absolute within inner div */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 64,
              fontSize: 18,
              color: 'rgba(12,192,190,0.45)',
              display: 'flex',
            }}
          >
            turaquete.com.br
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
