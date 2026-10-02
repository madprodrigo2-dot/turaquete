import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

// resvg (o rasterizador que o next/og usa por baixo) não decodifica WebP —
// toda imagem embutida precisa virar PNG antes de virar data URI, senão a
// rota quebra com "TypeError: u2 is not iterable" (erro genérico do bundle
// minificado, sem relação óbvia com o problema real).
async function toPngDataUri(relPath: string) {
  const buf = readFileSync(join(process.cwd(), 'public', relPath))
  const png = await sharp(buf).png().toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

export default async function Image() {
  const [fondo, red, pelota, rival, equipe, tury] = await Promise.all([
    toPngDataUri('tactica/fondo-cancha.webp'),
    toPngDataUri('tactica/red.webp'),
    toPngDataUri('tactica/pelota.webp'),
    toPngDataUri('tactica/jugador-rival-frente.webp'),
    toPngDataUri('tactica/jugador-defensa-espalda.webp'),
    toPngDataUri('tury-saludando.png'),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0E3A40',
          padding: '70px 90px',
          boxSizing: 'border-box',
        }}
      >
        {/* Texto */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 600 }}>
          <div style={{ width: 48, height: 4, background: '#0CC0BE', borderRadius: 2, marginBottom: 24, display: 'flex' }} />
          <div style={{ fontSize: 58, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, display: 'flex' }}>
            Qual é a jogada certa?
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, color: 'rgba(255,255,255,0.72)', marginTop: 20, lineHeight: 1.4, display: 'flex' }}>
            Táticas de beach tennis — teste seu olho de jogo
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: 40, gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og (satori) só aceita <img>, não next/image */}
            <img src={tury} alt="" width={64} height={74} />
            <div style={{ fontSize: 20, color: 'rgba(12,192,190,0.75)', fontWeight: 600, display: 'flex' }}>
              turaquete.com.br/tatica
            </div>
          </div>
        </div>

        {/* Mini-diagrama da quadra */}
        <div
          style={{
            width: 400,
            height: 490,
            borderRadius: 28,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og (satori) só aceita <img>, não next/image */}
          <img
            src={fondo}
            alt=""
            width={400}
            height={490}
            style={{ objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 400,
              height: 490,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '36px 28px',
              boxSizing: 'border-box',
            }}
          >
            {/* eslint-disable @next/next/no-img-element -- next/og (satori) só aceita <img>, não next/image */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
              <img src={rival} alt="" width={54} height={77} />
              <img src={rival} alt="" width={54} height={77} />
            </div>
            <img src={red} alt="" width={344} height={32} style={{ alignSelf: 'center', display: 'flex' }} />
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
              <img src={pelota} alt="" width={28} height={28} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
              <img src={equipe} alt="" width={54} height={58} />
              <img src={equipe} alt="" width={54} height={58} />
            </div>
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
