"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";

export async function toggleWishlist(bookId: string) {
  if (!z.string().uuid().safeParse(bookId).success) return { ok: false, message: "Data tidak valid." };
  const user = await getUser();
  if (!user) return { ok: false, needLogin: true, message: "Masuk dulu untuk menyimpan wishlist." };
  const supabase = await createSupabaseServer();
  const { data: ex } = await supabase.from("wishlist_items").select("book_id").eq("user_id", user.id).eq("book_id", bookId).maybeSingle();
  if (ex) {
    const { error } = await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("book_id", bookId);
    if (error) return { ok: false, message: "Gagal menghapus." };
    revalidatePath("/wishlist");
    return { ok: true, saved: false };
  }
  const { data: b } = await supabase.from("books").select("price, sale_price").eq("id", bookId).single();
  const { error } = await supabase.from("wishlist_items").insert({ user_id: user.id, book_id: bookId, price_at_add: b?.sale_price ?? b?.price });
  if (error) return { ok: false, message: "Gagal menyimpan." };
  await supabase.from("user_events").insert({ user_id: user.id, type: "wishlist", book_id: bookId });
  revalidatePath("/wishlist");
  return { ok: true, saved: true };
}
