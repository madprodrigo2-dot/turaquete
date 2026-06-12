import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/ir/',
      },
    ],
    sitemap: 'https://turaquete.com.br/sitemap.xml',
  }
}
