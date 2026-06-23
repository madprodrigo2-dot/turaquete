import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import VercelAnalytics from "@/components/VercelAnalytics";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
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
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        {children}
        <VercelAnalytics />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
