import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Turaquete — Encontre sua raquete de beach tennis",
  description:
    "Consultor virtual de raquetes de beach tennis. Encontre a raquete ideal para o seu jogo com recomendações personalizadas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}
