import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, CloudDownload, Lock, ShieldCheck, ShoppingBag, Landmark, Calculator } from "lucide-react";
import { getCart } from "@/lib/cart";
import { CartControls } from "@/components/cart-line";
import { PageHeader } from "@/components/page-header";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Keranjang", robots: { index: false } };

export default async function CartPage() {
  const { lines, subtotal, bundleDiscount } = await getCart();
  if (!lines.length) return (
    <div className="card mx-auto mt-6 grid max-w-lg place-items-center gap-3 p-10 text-center"><span className="grid h-14 w-14 place-items-center rounded-pill bg-brand-light text-brand"><ShoppingBag aria-hidden className="h-7 w-7" /></span><h1 className="text-2xl">Keranjangmu masih kosong</h1><p className="text-sm text-ink-soft">Temukan buku yang cocok untuk belajarmu.</p><Link href="/books" className="btn-primary">Jelajahi Buku</Link></div>);
  const blocked = lines.some((l) => l.problem);
  const items = lines.reduce((s, l) => s + l.quantity, 0);
  const normal = lines.reduce((s, l) => s + l.book.price * l.quantity, 0);
  const bookDiscount = normal - subtotal;
  return (
    <>
      <PageHeader title="Keranjang Belanja" subtitle="Periksa buku yang akan dipesan sebelum lanjut ke checkout." crumbs={[{ href: "/", label: "Beranda" }, { label: "Keranjang" }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">{lines.map((l) => {
          const digital = l.book.format !== "PRINT";
          return (
            <li key={l.book.id} className="card flex gap-4 p-4">
              <Link href={`/books/${l.book.slug}`} className="relative h-28 w-[84px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">{l.book.cover_url && <Image src={l.book.cover_url} alt={`Sampul ${l.book.title}`} fill sizes="84px" className="object-cover" />}</Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs"><span className={`badge ${digital ? "bg-leaf-light text-leaf" : "bg-brand-light text-brand"}`}>{digital ? "E-Book / PDF" : "Buku Cetak"}</span><span className="text-ink-mute">{l.book.author?.name}</span></div>
                <Link href={`/books/${l.book.slug}`} className="mt-1 line-clamp-2 block font-serif text-lg font-semibold leading-snug text-brand-dark hover:text-brand">{l.book.title}</Link>
                {l.problem && <p role="alert" className="mt-2 flex items-center gap-2 rounded-ctl bg-danger-light px-3 py-2 text-sm font-medium text-danger"><AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />{l.problem}. Sesuaikan jumlah atau hapus buku ini.</p>}
                {digital && !l.problem && <p className="mt-2 flex items-center gap-2 rounded-ctl bg-leaf-light px-3 py-2 text-sm text-leaf"><CloudDownload aria-hidden className="h-4 w-4 shrink-0" />Akses di Perpustakaan Digital setelah pembayaran diverifikasi.</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card bg-paper p-3">
                  <div className="leading-tight"><p><span className="font-bold text-brand">{formatRupiah(l.unit)}</span>{l.book.sale_price != null && l.book.sale_price < l.book.price && <span className="ml-2 text-xs text-ink-mute line-through">{formatRupiah(l.book.price)}</span>}</p><p className="mt-0.5 text-xs text-ink-soft">Subtotal: <strong>{formatRupiah(l.lineTotal)}</strong></p></div>
                  <CartControls bookId={l.book.id} quantity={l.quantity} max={l.available} />
                </div>
              </div>
            </li>); })}</ul>

        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-40">
          <h2 className="text-xl">Ringkasan Belanja</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Total item</dt><dd>{lines.length} produk ({items} buku)</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Total harga normal</dt><dd>{formatRupiah(normal)}</dd></div>
            {bookDiscount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Potongan diskon buku</dt><dd className="text-marigold-dark">−{formatRupiah(bookDiscount)}</dd></div>}
            {bundleDiscount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Potongan paket edukasi</dt><dd className="text-leaf">−{formatRupiah(bundleDiscount)}</dd></div>}
          </dl>
          <div className="flex items-center justify-between rounded-card bg-brand-light p-3"><div><p className="text-sm font-semibold">Subtotal belanja</p><p className="text-xs text-ink-soft">Sebelum ongkir & kupon</p></div><p className="text-xl font-bold text-brand-dark">{formatRupiah(subtotal - bundleDiscount)}</p></div>
          <p className="text-xs text-ink-mute">Ongkos kirim dan kupon dihitung otomatis pada langkah checkout.</p>
          <Link href="/checkout" aria-disabled={blocked} className={`btn-primary w-full ${blocked ? "pointer-events-none opacity-50" : ""}`}><Lock aria-hidden className="h-4 w-4" />Lanjut ke Checkout ({lines.length} Produk)</Link>
          {blocked && <p role="alert" className="text-xs text-danger">Selesaikan masalah stok di atas untuk melanjutkan.</p>}
          <ul className="space-y-2 rounded-card bg-paper p-3 text-xs text-ink-soft">
            <li className="flex gap-2"><Calculator aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />Harga dan total dihitung ulang oleh sistem saat pesanan dibuat.</li>
            <li className="flex gap-2"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />Stok diperiksa dan dikunci saat pesanan dibuat.</li>
            <li className="flex gap-2"><Landmark aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />Pembayaran lewat transfer bank, diverifikasi admin.</li>
          </ul>
        </aside>
      </div>
    </>
  );
}