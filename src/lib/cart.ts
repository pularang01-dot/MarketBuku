import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { BOOK_SELECT, type BookRow } from "@/types";
import { unitPrice } from "@/lib/pricing";
import { bestBundleDiscount, type BundleDef } from "@/lib/bundles";

export const CART_COOKIE = "tbe_cart";
export interface RawLine { b: string; q: number }
export interface CartLine { book: BookRow; quantity: number; unit: number; lineTotal: number; available: number | null; problem: string | null }

export const stockOf = (b: BookRow) => (Array.isArray(b.inventory) ? b.inventory[0] : b.inventory) ?? null;

export async function readGuestCart(): Promise<RawLine[]> {
  const store = await cookies();
  try {
    const parsed = JSON.parse(store.get(CART_COOKIE)?.value ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((l) => typeof l?.b === "string" && Number.isInteger(l?.q) && l.q > 0 && l.q < 100).slice(0, 50)
      : [];
  } catch { return []; }
}

export async function writeGuestCart(lines: RawLine[]) {
  const store = await cookies();
  store.set(CART_COOKIE, JSON.stringify(lines), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

/** Builds cart with prices and stock re-read from the database — never from the browser. */
export async function getCart(): Promise<{ lines: CartLine[]; subtotal: number; bundleDiscount: number; weightGram: number; hasPhysical: boolean }> {
  const user = await getUser();
  const supabase = await createSupabaseServer();
  let raw: RawLine[];
  if (user) {
    const { data } = await supabase.from("cart_items").select("book_id, quantity").eq("user_id", user.id);
    raw = (data ?? []).map((r) => ({ b: r.book_id, q: r.quantity }));
  } else raw = await readGuestCart();
  if (!raw.length) return { lines: [], subtotal: 0, bundleDiscount: 0, weightGram: 0, hasPhysical: false };

  const { data: books } = await supabase.from("books").select(BOOK_SELECT).in("id", raw.map((r) => r.b)).eq("status", "PUBLISHED");
  const byId = new Map((books as BookRow[] | null ?? []).map((b) => [b.id, b]));
  const lines: CartLine[] = [];
  for (const r of raw) {
    const book = byId.get(r.b);
    if (!book) continue;
    const inv = stockOf(book);
    const avail = book.format === "PRINT" ? Math.max((inv?.stock ?? 0) - (inv?.reserved ?? 0), 0) : null;
    const unit = unitPrice({ price: book.price, salePrice: book.sale_price });
    let problem: string | null = null;
    if (avail !== null && avail === 0) problem = "Stok habis";
    else if (avail !== null && r.q > avail) problem = `Stok tersisa ${avail}`;
    lines.push({ book, quantity: r.q, unit, lineTotal: unit * r.q, available: avail, problem });
  }
  const { data: bd } = await supabase.from("bundles").select("id, price, bundle_items(book_id, quantity, book:books(price, sale_price))").eq("status", "PUBLISHED");
  const defs: BundleDef[] = (bd ?? []).map((b) => ({
    id: b.id, price: b.price,
    items: (b.bundle_items as unknown as { book_id: string; quantity: number; book: { price: number; sale_price: number | null } }[]).map((i) => ({ bookId: i.book_id, quantity: i.quantity, unit: unitPrice({ price: i.book.price, salePrice: i.book.sale_price }) })),
  }));
  const bundleDiscount = bestBundleDiscount(new Map(lines.map((l) => [l.book.id, l.quantity])), defs).discount;
  return {
    lines,
    bundleDiscount: Math.min(bundleDiscount, lines.reduce((s, l) => s + l.lineTotal, 0)),
    subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    weightGram: lines.filter((l) => l.book.format === "PRINT").reduce((s, l) => s + l.book.weight_gram * l.quantity, 0),
    hasPhysical: lines.some((l) => l.book.format === "PRINT"),
  };
}
