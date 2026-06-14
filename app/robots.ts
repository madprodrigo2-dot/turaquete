import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/ir/',      // affiliate redirect handler — no crawl value
          '/api/',     // internal API endpoints
          '/admin/',   // admin dashboard
        ],
      },
    ],
    sitemap: 'https://www.turaquete.com.br/sitemap.xml',
  }
}
