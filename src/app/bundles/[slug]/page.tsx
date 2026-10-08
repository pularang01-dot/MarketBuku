import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BookGrid } from "@/components/book-card";
import { AddBundle } from "@/components/add-bundle";
import { formatRupiah } from "@/lib/utils";
import { BOOK_SELECT, type BookRow } from "@/types";

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const { data: b } = await supabase.from("bundles").select(`*, bundle_items(quantity, book:books(${BOOK_SELECT}))`).eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  if (!b) notFound();
  const items = b.bundle_items as unknown as { quantity: number; book: BookRow }[];
  const normal = items.reduce((s, i) => s + (i.book.sale_price ?? i.book.price) * i.quantity, 0);
  return (<><h1 className="text-3xl font-bold">{b.title}</h1><p className="mt-1 text-ink-soft">{b.description}</p><p className="mt-3 text-2xl font-bold">{formatRupiah(b.price)} <span className="text-base font-normal text-ink-mute line-through">{formatRupiah(normal)}</span></p>
    <div className="my-4"><AddBundle ids={items.map((i) => i.book.id)} /></div><BookGrid books={items.map((i) => i.book)} />
    <p className="mt-3 text-xs text-ink-mute">Harga paket otomatis berlaku di keranjang dan checkout bila semua buku paket ada di keranjang.</p></>);
}
