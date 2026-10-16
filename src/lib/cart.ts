import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { BOOK_SELECT, type BookRow } from "@/types";
import { getQuote } from "@/lib/pricing/service";
import { computeQuote } from "@/lib/pricing/engine";
import { readCouponCode } from "@/lib/coupon-cookie";
import type { Quote, QuoteLine } from "@/lib/pricing/types";

export const CART_COOKIE = "tbe_cart";
export interface RawLine { b: string; q: number }
/** unit / lineTotal are the NET figures after automatic promotions (what the buyer pays before bundle/coupon). */
export interface CartLine { book: BookRow; quantity: number; unit: number; lineTotal: number; available: number | null; problem: string | null; pricing: QuoteLine | null }

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

async function readRawCart(): Promise<{ raw: RawLine[]; userId: string | null }> {
  const user = await getUser();
  if (user) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.from("cart_items").select("book_id, quantity").eq("user_id", user.id);
    return { raw: (data ?? []).map((r) => ({ b: r.book_id, q: r.quantity })), userId: user.id };
  }
  return { raw: await readGuestCart(), userId: null };
}

/** Cheap item count for the header (no pricing queries). */
export async function getCartCount() { return (await readRawCart()).raw.reduce((s, l) => s + l.q, 0); }

/** Cart items for pricing actions (e.g. applying a coupon). */
export async function readCartItems() { return (await readRawCart()).raw.map((l) => ({ bookId: l.b, quantity: l.q })); }

/** Builds the cart with prices, promotions, coupon and stock re-read from the database — never from the browser. */
export async function getCart(): Promise<{ lines: CartLine[]; quote: Quote; couponCode: string | null; subtotal: number; bundleDiscount: number; weightGram: number; hasPhysical: boolean }> {
  const { raw, userId } = await readRawCart();
  const couponCode = await readCouponCode();
  if (!raw.length) {
    const quote = computeQuote({ books: new Map(), promotions: [], bundles: [], coupon: null, couponCodeGiven: false, userUsedCount: 0, loggedIn: !!userId, now: new Date() }, { items: [], shippingCost: 0 });
    return { lines: [], quote, couponCode, subtotal: 0, bundleDiscount: 0, weightGram: 0, hasPhysical: false };
  }

  const supabase = await createSupabaseServer();
  const { data: books } = await supabase.from("books").select(BOOK_SELECT).in("id", raw.map((r) => r.b)).eq("status", "PUBLISHED");
  const byId = new Map((books as BookRow[] | null ?? []).map((b) => [b.id, b]));
  const present = raw.filter((r) => byId.has(r.b));
  const quote = await getQuote({ items: present.map((r) => ({ bookId: r.b, quantity: r.q })), shippingCost: 0, couponCode, userId });
  const priced = new Map(quote.lines.map((l) => [l.bookId, l]));

  const lines: CartLine[] = [];
  const seen = new Set<string>();
  for (const r of present) {
    if (seen.has(r.b)) continue; seen.add(r.b);
    const book = byId.get(r.b)!;
    const pricing = priced.get(r.b) ?? null;
    const qty = pricing?.quantity ?? r.q;
    const inv = stockOf(book);
    const avail = book.format === "PRINT" ? Math.max((inv?.stock ?? 0) - (inv?.reserved ?? 0), 0) : null;
    let problem: string | null = null;
    if (avail !== null && avail === 0) problem = "Stok habis";
    else if (avail !== null && qty > avail) problem = `Stok tersisa ${avail}`;
    lines.push({ book, quantity: qty, unit: pricing?.netUnit ?? book.price, lineTotal: pricing?.lineNet ?? book.price * qty, available: avail, problem, pricing });
  }
  return {
    lines, quote, couponCode,
    subtotal: quote.subtotal, bundleDiscount: quote.bundleDiscount,
    weightGram: lines.filter((l) => l.book.format === "PRINT").reduce((s, l) => s + l.book.weight_gram * l.quantity, 0),
    hasPhysical: lines.some((l) => l.book.format === "PRINT"),
  };
}