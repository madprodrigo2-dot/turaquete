import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const TITLE       = 'Turaquete | Especialista em raquetes de beach tennis'
const OG_TITLE    = 'Turaquete | A raquete certa de primeira.'
const DESCRIPTION = 'Conte como você joga e nosso especialista indica a raquete ideal pro seu nível, estilo e bolso. De graça, explicando o porquê de cada escolha.'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EAF7F6' },
    { media: '(prefers-color-scheme: dark)',  color: '#0E3A40' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.turaquete.com.br'),
  title: {
    default:  TITLE,
    template: '%s | Turaquete',
  },
  description: DESCRIPTION,
  openGraph: {
    title:       OG_TITLE,
    description: DESCRIPTION,
    images:      ['/opengraph-image.png'],
    locale:      'pt_BR',
    type:        'website',
    url:         'https://www.turaquete.com.br',
    siteName:    'Turaquete',
  },
  twitter: {
    card:        'summary_large_image',
    title:       OG_TITLE,
    description: DESCRIPTION,
  },
  icons: {
    icon: [
      { url: '/turaquete-favicon.png', sizes: '32x32',  type: 'image/png' },
      { url: '/icon-192.png',          sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',          sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${inter.variable} antialiased`}>
        {children}
        {process.env.NEXT_PUBLIC_BUILD_LABEL && (
          <div className="fixed bottom-2 right-2 text-[9px] text-gray-400/70 select-none pointer-events-none z-50 font-mono">
            {process.env.NEXT_PUBLIC_BUILD_LABEL}
          </div>
        )}
        <Analytics />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
