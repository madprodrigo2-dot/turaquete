import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#EAF7F6',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          gap: '20px',
        }}
      >
        <div
          style={{
            fontSize: '100px',
            fontWeight: 800,
            color: '#0E3A40',
            letterSpacing: '-4px',
            lineHeight: 1,
          }}
        >
          Turaquete
        </div>
        <div
          style={{
            fontSize: '40px',
            color: '#0CC0BE',
            fontWeight: 500,
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          Encontre sua raquete de beach tennis ideal
        </div>
        <div
          style={{
            fontSize: '26px',
            color: '#0E3A40',
            opacity: 0.4,
            marginTop: '8px',
          }}
        >
          Grátis · 1 minuto · Sem cadastro
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
