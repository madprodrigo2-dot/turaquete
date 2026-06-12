import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Turaquete',
    short_name:       'Turaquete',
    description:      'Especialista em raquetes de beach tennis',
    start_url:        '/',
    display:          'standalone',
    background_color: '#EAF7F6',
    theme_color:      '#0CC0BE',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
