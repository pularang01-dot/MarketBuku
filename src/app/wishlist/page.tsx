import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BookGrid } from "@/components/book-card";
import { BOOK_SELECT, type BookRow } from "@/types";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function Wishlist() {
  const user = await requireUser("/wishlist");
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("wishlist_items").select(`book:books(${BOOK_SELECT})`).eq("user_id", user.id).order("created_at", { ascending: false });
  const books = (data ?? []).map((r) => r.book as unknown as BookRow).filter(Boolean);
  return (<><h1 className="text-3xl">Wishlist</h1><p className="mb-5 mt-1 text-sm text-ink-soft">Buku yang kamu simpan. Kami memberi tahu saat harganya turun atau stok tersedia lagi.</p><BookGrid books={books} saved={new Set(books.map((b) => b.id))} empty="Wishlist masih kosong. Tekan ikon hati pada buku yang kamu suka." /></>);
}