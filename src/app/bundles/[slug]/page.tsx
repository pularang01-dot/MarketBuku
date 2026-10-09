import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BookCard } from "@/components/book-card";
import { AddBundle } from "@/components/add-bundle";
import { Breadcrumb } from "@/components/breadcrumb";
import { getSavedIds } from "@/lib/saved";
import { formatRupiah } from "@/lib/utils";
import { BOOK_SELECT, type BookRow } from "@/types";

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const [{ data: b }, saved] = await Promise.all([supabase.from("bundles").select(`*, bundle_items(quantity, book:books(${BOOK_SELECT}))`).eq("slug", slug).eq("status", "PUBLISHED").maybeSingle(), getSavedIds()]);
  if (!b) notFound();
  const items = b.bundle_items as unknown as { quantity: number; book: BookRow }[];
  const normal = items.reduce((s, i) => s + (i.book.sale_price ?? i.book.price) * i.quantity, 0);
  const save = Math.max(normal - b.price, 0);
  return (
    <>
      <Breadcrumb crumbs={[{ href: "/", label: "Beranda" }, { href: "/promo#paket", label: "Paket Edukasi" }, { label: b.title }]} />
      <section className="card p-6 sm:p-8"><span className="badge bg-marigold-light text-marigold-dark">Hemat {formatRupiah(save)}</span><h1 className="mt-3 text-3xl sm:text-4xl">{b.title}</h1><p className="mt-2 max-w-2xl text-ink-soft">{b.description}</p>
        <p className="mt-4 flex items-baseline gap-3"><span className="text-3xl font-bold text-brand">{formatRupiah(b.price)}</span><span className="text-ink-mute line-through">{formatRupiah(normal)}</span></p>
        <div className="mt-4 max-w-sm"><AddBundle ids={items.map((i) => i.book.id)} /></div>
        <p className="panel mt-4 p-3 text-xs text-ink-soft">Harga paket otomatis berlaku di keranjang dan checkout bila semua buku paket ada di keranjang. Satu paket terbaik berlaku per pesanan.</p></section>
      <h2 className="mb-4 mt-10 text-2xl">Isi Paket ({items.length} judul)</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{items.map((i) => <BookCard key={i.book.id} book={i.book} saved={saved.has(i.book.id)} />)}</div>
    </>
  );
}