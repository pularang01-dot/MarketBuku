import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SITE_URL, jsonLd } from "@/lib/utils";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Toko Buku Edukasi — Buku Pelajaran, Latihan Soal, dan Referensi", template: "%s | Toko Buku Edukasi" },
  description: "Temukan buku pelajaran, latihan soal, persiapan ujian, dan referensi guru untuk SD, SMP, dan SMA.",
  openGraph: { type: "website", siteName: "Toko Buku Edukasi", locale: "id_ID" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const org = { "@context": "https://schema.org", "@type": "Organization", name: "Toko Buku Edukasi", url: SITE_URL };
  return (
    <html lang="id" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Lewati ke konten</a>
        <Header />
        <main id="main" className="mx-auto min-h-[70vh] w-full max-w-page px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(org) }} />
      </body>
    </html>
  );
}