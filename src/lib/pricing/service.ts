import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { computeQuote, isValidCouponFormat, normalizeCouponCode } from "./engine";
import { couponMessage } from "./messages";
import type { BundleDef, Coupon, Promotion, PricingBook, Quote, QuoteContext } from "./types";

export const mapPromotion = (r: any): Promotion => ({
  id: r.id, title: r.title, benefitType: r.benefit_type ?? null, benefitValue: r.benefit_value ?? 0, maxDiscount: r.max_discount ?? null,
  minPurchase: r.min_purchase ?? 0, scopeType: r.scope_type ?? "ALL", scopeIds: r.scope_ids ?? [], priority: r.priority ?? 0,
  stackableWithCoupon: r.stackable_with_coupon ?? true, startsAt: r.starts_at ?? null, endsAt: r.ends_at ?? null, active: !!r.active, createdAt: r.created_at,
});
export const mapCoupon = (r: any): Coupon => ({
  id: r.id, code: r.code, type: r.type, value: r.value, minPurchase: r.min_purchase ?? 0, maxDiscount: r.max_discount ?? null,
  scopeType: r.scope_type ?? "ALL", scopeIds: r.scope_ids ?? [], excludeBookIds: r.exclude_book_ids ?? [],
  startsAt: r.starts_at ?? null, endsAt: r.ends_at ?? null, usageLimit: r.usage_limit ?? null, usedCount: r.used_count ?? 0,
  perUserLimit: r.per_user_limit ?? 1, active: !!r.active, stackableWithPromo: r.stackable_with_promo ?? true,
});

export interface QuoteArgs { items: { bookId: string; quantity: number }[]; shippingCost?: number; couponCode?: string | null; userId?: string | null; now?: Date }

/** Loads everything the pure engine needs, with the service-role client (server only). Prices always come from the database. */
export async function loadPricingContext(a: QuoteArgs): Promise<{ ctx: QuoteContext; badFormat: boolean }> {
  const db = createSupabaseAdmin();
  const now = a.now ?? new Date();
  const ids = [...new Set(a.items.map((i) => i.bookId))];
  const code = a.couponCode ? normalizeCouponCode(a.couponCode) : "";
  const given = code.length > 0;
  const badFormat = given && !isValidCouponFormat(code);

  const [books, cats, subs, promos, bundles] = await Promise.all([
    ids.length ? db.from("books").select("id,title,format,price,sale_price,education_level_id,grade_id").in("id", ids).eq("status", "PUBLISHED") : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from("book_categories").select("book_id,category_id").in("book_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from("book_subjects").select("book_id,subject_id").in("book_id", ids) : Promise.resolve({ data: [] as any[] }),
    db.from("promotions").select("*").eq("active", true).not("benefit_type", "is", null),
    db.from("bundles").select("id,price,bundle_items(book_id,quantity)").eq("status", "PUBLISHED"),
  ]);
  const catBy = new Map<string, string[]>(), subBy = new Map<string, string[]>();
  (cats.data ?? []).forEach((r: any) => catBy.set(r.book_id, [...(catBy.get(r.book_id) ?? []), r.category_id]));
  (subs.data ?? []).forEach((r: any) => subBy.set(r.book_id, [...(subBy.get(r.book_id) ?? []), r.subject_id]));
  const bookMap = new Map<string, PricingBook>((books.data ?? []).map((b: any) => [b.id, {
    id: b.id, title: b.title, format: b.format, price: b.price, salePrice: b.sale_price, categoryIds: catBy.get(b.id) ?? [], subjectIds: subBy.get(b.id) ?? [],
    levelId: b.education_level_id, gradeId: b.grade_id,
  }]));
  const bundleDefs: BundleDef[] = (bundles.data ?? []).map((b: any) => ({ id: b.id, price: b.price, items: (b.bundle_items ?? []).map((i: any) => ({ bookId: i.book_id, quantity: i.quantity })) }));

  let coupon: Coupon | null = null, userUsed = 0;
  if (given && !badFormat) {
    const { data: c } = await db.from("coupons").select("*").eq("code", code).maybeSingle();
    if (c) {
      coupon = mapCoupon(c);
      if (a.userId) {
        const { count } = await db.from("coupon_usages").select("id", { count: "exact", head: true }).eq("coupon_id", c.id).eq("user_id", a.userId).in("status", ["RESERVED", "REDEEMED"]);
        userUsed = count ?? 0;
      }
    }
  }
  return { badFormat, ctx: { books: bookMap, promotions: (promos.data ?? []).map(mapPromotion), bundles: bundleDefs, coupon, couponCodeGiven: given && !badFormat, userUsedCount: userUsed, loggedIn: !!a.userId, now } };
}

export async function getQuote(a: QuoteArgs): Promise<Quote> {
  const { ctx, badFormat } = await loadPricingContext(a);
  const quote = computeQuote(ctx, { items: a.items, shippingCost: a.shippingCost ?? 0 });
  if (badFormat) quote.couponError = { code: "COUPON_INVALID_FORMAT", message: couponMessage("COUPON_INVALID_FORMAT") };
  return quote;
}

/** Arguments for the create_order_v3 RPC: only server-computed numbers, which the database re-verifies atomically. */
export function orderRpcArgs(userId: string, quote: Quote, address: unknown, courier: string | null, service: string | null) {
  return {
    p_user: userId,
    p_items: quote.lines.map((l) => ({ book_id: l.bookId, quantity: l.quantity, selling_unit: l.sellingUnit, list_price: l.listPrice, promo_id: l.promoId, promo_title: l.promoTitle, promo_unit_discount: l.promoUnitDiscount })),
    p_address: address, p_courier: courier, p_service: service,
    p_quote: {
      subtotal: quote.subtotal, promo_discount: quote.promoDiscount, bundle_discount: quote.bundleDiscount, bundle_id: quote.bundleId,
      coupon_id: quote.coupon?.id ?? null, coupon_code: quote.coupon?.code ?? null, coupon_discount: quote.coupon?.discount ?? 0,
      shipping_cost: quote.shippingCost, shipping_discount: quote.shippingDiscount, total: quote.total,
      snapshot: { evaluatedAt: quote.evaluatedAt, lines: quote.lines, appliedPromos: quote.appliedPromos, bundleId: quote.bundleId, bundleDiscount: quote.bundleDiscount, coupon: quote.coupon, promoDiscount: quote.promoDiscount, subtotal: quote.subtotal, shipping: { cost: quote.shippingCost, discount: quote.shippingDiscount }, total: quote.total },
    },
  };
}