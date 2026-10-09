import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Gift } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BookCard } from "@/components/book-card";
import { PageHeader } from "@/components/page-header";
import { CopyCode } from "@/components/copy-code";
import { AddBundle } from "@/components/add-bundle";
import { getSavedIds } from "@/lib/saved";
import { BOOK_SELECT, type BookRow } from "@/types";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Promo & Paket Hemat", description: "Kupon, paket edukasi hemat, dan buku diskon pilihan.", alternates: { canonical: "/promo" } };

const describe = (c: { type: string; value: number; min_purchase: number; max_discount: number | null }) =>
  c.type === "PERCENT" ? `Diskon ${c.value}%${c.max_discount ? ` hingga ${formatRupiah(c.max_discount)}` : ""}${c.min_purchase ? `, min. belanja ${formatRupiah(c.min_purchase)}` : ""}.`
  : c.type === "FIXED" ? `Potongan ${formatRupiah(c.value)}${c.min_purchase ? ` untuk belanja min. ${formatRupiah(c.min_purchase)}` : ""}.`
  : `Gratis ongkos kirim${c.min_purchase ? ` untuk belanja min. ${formatRupiah(c.min_purchase)}` : ""}.`;
const label = (t: string) => (t === "PERCENT" ? "DISKON PERSEN" : t === "FIXED" ? "POTONGAN HARGA" : "GRATIS ONGKIR");

export default async function Promo() {
  const supabase = await createSupabaseServer();
  const [{ data: promos }, { data: coupons }, { data: bundles }, { data: books }, saved] = await Promise.all([
    supabase.from("promotions").select("*").eq("active", true),
    supabase.from("coupons").select("code,type,value,min_purchase,max_discount,ends_at").eq("is_public", true).eq("active", true), // RLS: public + active + in date range
    supabase.from("bundles").select("id,title,slug,price,description,bundle_items(quantity, book:books(id,title,cover_url,price,sale_price))").eq("status", "PUBLISHED"),
    supabase.from("books").select(BOOK_SELECT).eq("status", "PUBLISHED").not("sale_price", "is", null).order("sold_count", { ascending: false }).limit(8),
    getSavedIds(),
  ]);
  return (
    <>
      <PageHeader title="Promo Pendidikan & Paket Hemat Belajar" subtitle="Kupon, paket buku hemat, dan buku diskon pilihan." crumbs={[{ href: "/", label: "Beranda" }, { label: "Promo" }]} />
      {promos?.map((p) => <div key={p.id} className="panel mb-4 p-4"><p className="font-serif text-lg font-semibold text-brand-dark">{p.title}</p><p className="text-sm text-ink-soft">{p.description}</p>{p.ends_at && <p className="mt-1 text-xs text-ink-mute">Berlaku hingga {new Date(p.ends_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>}</div>)}

      {!!coupons?.length && <section className="mt-8"><h2 className="text-2xl">Kupon & Voucher</h2><p className="mb-4 mt-1 text-sm text-ink-soft">Gunakan kode saat checkout.</p>
        <div className="grid gap-4 md:grid-cols-3">{coupons.map((c) => (
          <div key={c.code} className="panel flex flex-col gap-3 p-5"><div className="flex items-center justify-between"><span className="badge bg-white text-brand">{label(c.type)}</span>{c.ends_at && <span className="text-xs text-ink-mute">s.d. {new Date(c.ends_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span>}</div>
            <p className="font-mono text-2xl font-bold tracking-wide text-brand-dark">{c.code}</p><p className="text-sm text-ink-soft">{describe(c)}</p><div className="mt-auto flex justify-end border-t border-line pt-3"><CopyCode code={c.code} /></div></div>))}</div></section>}

      <section id="paket" className="mt-12"><h2 className="text-2xl">Paket Edukasi Bundel Hemat</h2><p className="mb-4 mt-1 text-sm text-ink-soft">Beli beberapa buku sekaligus dengan harga lebih hemat.</p>
        {!bundles?.length ? <p className="card p-8 text-center text-ink-soft">Belum ada paket.</p> : <div className="grid gap-4 md:grid-cols-3">{bundles.map((b) => {
          const items = b.bundle_items as unknown as { quantity: number; book: { id: string; title: string; cover_url: string | null; price: number; sale_price: number | null } }[];
          const normal = items.reduce((s, i) => s + (i.book.sale_price ?? i.book.price) * i.quantity, 0); const save = Math.max(normal - b.price, 0);
          return (<article key={b.id} className="card flex flex-col p-4">
            <Link href={`/bundles/${b.slug}`} className="flex h-44 items-center justify-center gap-[-8px] rounded-card bg-surface-muted p-3">{items.slice(0, 3).map((i, k) => <div key={i.book.id} className="relative h-36 w-24 overflow-hidden rounded-lg border border-line bg-white shadow-float" style={{ marginLeft: k ? -18 : 0, zIndex: 3 - k }}>{i.book.cover_url ? <Image src={i.book.cover_url} alt="" fill sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center p-1 text-center font-serif text-[10px] text-brand">{i.book.title}</span>}</div>)}</Link>
            <div className="mt-3 flex items-center justify-between text-xs"><span className="badge bg-marigold-light text-marigold-dark">Hemat {formatRupiah(save)}</span><span className="text-ink-mute">{items.length} judul lengkap</span></div>
            <h3 className="mt-2 text-lg"><Link href={`/bundles/${b.slug}`}>{b.title}</Link></h3><p className="mt-1 line-clamp-3 text-sm text-ink-soft">{b.description}</p>
            <div className="mt-auto pt-4"><p className="mb-3 flex items-baseline gap-2"><span className="text-xl font-bold text-brand">{formatRupiah(b.price)}</span><span className="text-sm text-ink-mute line-through">{formatRupiah(normal)}</span></p><AddBundle ids={items.map((i) => i.book.id)} /></div></article>); })}</div>}
        <p className="panel mt-4 p-3 text-xs text-ink-soft"><strong>Catatan sistem:</strong> harga paket otomatis terpotong di keranjang saat semua judul buku dalam paket dimasukkan. Satu paket terbaik berlaku per pesanan.</p></section>

      <section className="mt-12"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-2xl">Buku Diskon Pilihan</h2><p className="mt-1 text-sm text-ink-soft">Harga spesial untuk judul terlaris.</p></div><Link href="/books?sort=popular" className="text-sm font-semibold text-brand hover:underline">Lihat semua</Link></div>
        {!books?.length ? <p className="card p-8 text-center text-ink-soft">Belum ada buku diskon.</p> : <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{(books as unknown as BookRow[]).map((b) => <BookCard key={b.id} book={b} saved={saved.has(b.id)} />)}</div>}</section>
      <p className="mt-10 flex items-center gap-2 text-xs text-ink-mute"><Gift aria-hidden className="h-4 w-4" />Syarat dan ketentuan setiap kupon ditampilkan pada kartu kupon.</p>
    </>
  );
}