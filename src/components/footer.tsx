import Link from "next/link";
import { BookOpen } from "lucide-react";
const col = (title: string, links: [string, string][]) => (
  <div><p className="font-serif text-lg font-semibold text-brand-dark">{title}</p><ul className="mt-3 space-y-2 text-sm text-ink-soft">{links.map(([h, l]) => <li key={l}><Link href={h} className="hover:text-brand">{l}</Link></li>)}</ul></div>
);
export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div><p className="flex items-center gap-2.5 font-serif text-xl font-semibold text-brand-dark"><span className="grid h-9 w-9 place-items-center rounded-ctl bg-brand text-white"><BookOpen aria-hidden className="h-5 w-5" /></span>Toko Buku Edukasi</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">Toko buku pelajaran, latihan soal, persiapan ujian, dan referensi guru untuk siswa SD, SMP, dan SMA.</p></div>
        {col("Belanja", [["/books", "Katalog buku"], ["/books?sort=popular", "Terlaris"], ["/books?sort=newest", "Terbaru"], ["/promo", "Promo"], ["/bundles", "Paket edukasi"], ["/book-finder", "Cari buku"]])}
        {col("Akun", [["/account", "Akun saya"], ["/orders", "Lacak pesanan"], ["/wishlist", "Wishlist"], ["/library", "Perpustakaan digital"]])}
        {col("Informasi", [["/articles", "Artikel edukasi"], ["/book-finder", "Panduan memilih buku"]])}
      </div>
      <div className="border-t border-line"><div className="mx-auto flex max-w-page flex-wrap justify-between gap-2 px-4 py-4 text-xs text-ink-mute sm:px-6"><p>© {new Date().getFullYear()} Toko Buku Edukasi. Hak cipta dilindungi.</p><p>Pembayaran melalui transfer bank, diverifikasi admin.</p></div></div>
    </footer>
  );
}