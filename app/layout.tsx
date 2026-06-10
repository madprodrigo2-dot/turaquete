import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

const TITLE = 'Turaquete — Encontre sua raquete de beach tennis'
const DESCRIPTION =
  'Consultor virtual de raquetes de beach tennis. Conte como você joga e receba a raquete ideal em 1 minuto — grátis, sem cadastro.'

export const metadata: Metadata = {
  metadataBase: new URL('https://turaquete.vercel.app'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}
