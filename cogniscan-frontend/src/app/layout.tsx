import type { Metadata } from "next";
import { Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CogniScan — Refleksi terpandu untuk pikiranmu",
  description:
    "Platform skrining kesehatan mental berbasis AI untuk anak muda Indonesia. Refleksi terpandu pola pikir, bukan diagnosis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${notoSerif.variable} ${manrope.variable}`}
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
