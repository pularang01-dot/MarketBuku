"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { readGuestCart, writeGuestCart } from "@/lib/cart";

const idQty = z.object({ bookId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(99) });

async function setQty(bookId: string, quantity: number | 0, mode: "add" | "set") {
  const user = await getUser();
  if (user) {
    const supabase = await createSupabaseServer();
    const { data: cur } = await supabase.from("cart_items").select("quantity").eq("user_id", user.id).eq("book_id", bookId).maybeSingle();
    const next = mode === "add" ? Math.min((cur?.quantity ?? 0) + quantity, 99) : quantity;
    if (next <= 0) await supabase.from("cart_items").delete().eq("user_id", user.id).eq("book_id", bookId);
    else await supabase.from("cart_items").upsert({ user_id: user.id, book_id: bookId, quantity: next });
    await supabase.from("user_events").insert({ user_id: user.id, type: "add_to_cart", book_id: bookId });
  } else {
    const lines = await readGuestCart();
    const i = lines.findIndex((l) => l.b === bookId);
    const next = mode === "add" ? Math.min((i >= 0 ? lines[i].q : 0) + quantity, 99) : quantity;
    if (i >= 0) { if (next <= 0) lines.splice(i, 1); else lines[i].q = next; }
    else if (next > 0) lines.push({ b: bookId, q: next });
    await writeGuestCart(lines);
  }
  revalidatePath("/", "layout");
}

export async function addToCart(bookId: string, quantity = 1) {
  const p = idQty.safeParse({ bookId, quantity });
  if (!p.success) return { ok: false, message: "Data tidak valid." };
  const supabase = await createSupabaseServer();
  const { data: b } = await supabase.from("books").select("id").eq("id", p.data.bookId).eq("status", "PUBLISHED").maybeSingle();
  if (!b) return { ok: false, message: "Buku tidak tersedia." };
  await setQty(p.data.bookId, p.data.quantity, "add");
  return { ok: true, message: "Ditambahkan ke keranjang." };
}

export async function updateCartQty(bookId: string, quantity: number) {
  if (quantity <= 0) return removeFromCart(bookId);
  const p = idQty.safeParse({ bookId, quantity });
  if (!p.success) return { ok: false, message: "Jumlah tidak valid." };
  await setQty(p.data.bookId, p.data.quantity, "set");
  return { ok: true };
}

export async function removeFromCart(bookId: string) {
  if (!z.string().uuid().safeParse(bookId).success) return { ok: false };
  await setQty(bookId, 0, "set");
  return { ok: true };
}

/** Merge the guest cookie cart into the DB cart right after login/register. */
export async function mergeGuestCart() {
  const user = await getUser();
  if (!user) return;
  const guest = await readGuestCart();
  if (!guest.length) return;
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase.from("cart_items").select("book_id, quantity").eq("user_id", user.id);
  const map = new Map((existing ?? []).map((e) => [e.book_id, e.quantity]));
  const rows = guest.map((g) => ({ user_id: user.id, book_id: g.b, quantity: Math.min((map.get(g.b) ?? 0) + g.q, 99) }));
  await supabase.from("cart_items").upsert(rows);
  await writeGuestCart([]);
}
