import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BookGrid } from "@/components/book-card";
import { getSavedIds } from "@/lib/saved";
import { BOOK_SELECT, type BookRow } from "@/types";

export const metadata: Metadata = { title: "Promo", alternates: { canonical: "/promo" } };

export default async function Promo() {
  const supabase = await createSupabaseServer();
  const [{ data: promos }, { data: books }, saved] = await Promise.all([
    supabase.from("promotions").select("*").eq("active", true),
    supabase.from("books").select(BOOK_SELECT).eq("status", "PUBLISHED").not("sale_price", "is", null).order("sold_count", { ascending: false }).limit(24),
    getSavedIds(),
  ]);
  return (<><h1 className="text-3xl font-bold">Promo</h1>{promos?.map((p) => <div key={p.id} className="card mt-4 border-l-4 border-marigold p-4"><h2 className="text-xl font-bold">{p.title}</h2><p className="text-sm text-ink-soft">{p.description}</p></div>)}<h2 className="mb-3 mt-8 text-2xl font-bold">Buku diskon</h2><BookGrid books={(books ?? []) as unknown as BookRow[]} saved={saved} /></>);
}
