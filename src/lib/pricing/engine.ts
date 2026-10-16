import type { BundleDef, Coupon, CouponErrorCode, Promotion, PricingBook, Quote, QuoteContext, QuoteInput, QuoteLine, ScopeType } from "./types";
import { couponMessage } from "./messages";

/* ------------------------------------------------------------------ *
 *  POLICY (documented in docs/promotion-engine-v2.md)
 *  - All money is integer rupiah; percentages round DOWN (floor) everywhere.
 *  - Selling price = sale_price when set (and ≤ price), else price.
 *  - An automatic promotion is computed from the LIST price. It applies to a book only if it gives a LOWER price
 *    than the selling price ("best price wins") — a discount is never applied twice on the same base.
 *  - One automatic promotion per book: highest priority, then biggest saving, then oldest, then id.
 *  - Order: promotions → bundle (on promo-adjusted prices) → coupon (on eligible base) → shipping.
 *  - Coupon minimum purchase and discount use the ELIGIBLE base after promotions and the proportional bundle share.
 *  - Time windows: start inclusive, end exclusive, evaluated with the server clock only.
 * ------------------------------------------------------------------ */

export const sellingPrice = (b: Pick<PricingBook, "price" | "salePrice">) =>
  b.salePrice != null && b.salePrice >= 0 && b.salePrice <= b.price ? b.salePrice : b.price;

export function inWindow(startsAt: string | null, endsAt: string | null, now: Date) {
  const t = now.getTime();
  if (startsAt && t < new Date(startsAt).getTime()) return false;
  if (endsAt && t >= new Date(endsAt).getTime()) return false; // end is exclusive
  return true;
}

export function scopeMatches(scopeType: ScopeType, ids: string[], book: PricingBook) {
  switch (scopeType) {
    case "ALL": return true;
    case "BOOK": return ids.includes(book.id);
    case "CATEGORY": return book.categoryIds.some((c) => ids.includes(c));
    case "SUBJECT": return book.subjectIds.some((s) => ids.includes(s));
    case "LEVEL": return !!book.levelId && ids.includes(book.levelId);
    case "GRADE": return !!book.gradeId && ids.includes(book.gradeId);
    default: return false;
  }
}

export const isPromoLive = (p: Promotion, now: Date) =>
  p.active && p.benefitType !== null && p.benefitValue > 0 && inWindow(p.startsAt, p.endsAt, now);

/** Per-unit discount of a promotion, from the list price. maxDiscount is per unit. */
export function promoUnitDiscount(p: Promotion, listPrice: number) {
  const raw = p.benefitType === "PERCENT" ? Math.floor((listPrice * Math.min(p.benefitValue, 100)) / 100) : Math.min(p.benefitValue, listPrice);
  const capped = p.maxDiscount != null ? Math.min(raw, p.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, listPrice));
}

/** Saving versus the current selling price; 0 when the promotion is not cheaper than sale_price. */
export const promoSaving = (book: PricingBook, p: Promotion) => Math.max(0, sellingPrice(book) - (book.price - promoUnitDiscount(p, book.price)));

export function pickBestPromo(book: PricingBook, candidates: Promotion[]): { promo: Promotion; saving: number } | null {
  const ranked = candidates
    .map((promo) => ({ promo, saving: promoSaving(book, promo) }))
    .filter((c) => c.saving > 0)
    .sort((a, b) => b.promo.priority - a.promo.priority || b.saving - a.saving || a.promo.createdAt.localeCompare(b.promo.createdAt) || a.promo.id.localeCompare(b.promo.id));
  return ranked[0] ?? null;
}

/** Catalog view: only promotions with no minimum purchase can be priced without a cart. Same picking rule as the cart. */
export function catalogPromo(book: PricingBook, promos: Promotion[], now: Date) {
  const cands = promos.filter((p) => isPromoLive(p, now) && p.minPurchase === 0 && scopeMatches(p.scopeType, p.scopeIds, book));
  const best = pickBestPromo(book, cands);
  if (!best) return null;
  const netUnit = sellingPrice(book) - best.saving;
  return { promoId: best.promo.id, title: best.promo.title, unitDiscount: best.saving, netUnit, percent: book.price > 0 ? Math.round((1 - netUnit / book.price) * 100) : 0 };
}

export function normalizeCouponCode(raw: string) {
  return raw.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, "").toUpperCase();
}
export const isValidCouponFormat = (code: string) => /^[A-Z0-9_-]{3,30}$/.test(code);

function bestBundle(bundles: BundleDef[], qtyByBook: Map<string, number>, netUnit: Map<string, number>) {
  let best = 0, bestId: string | null = null;
  for (const b of [...bundles].sort((x, y) => x.id.localeCompare(y.id))) {
    if (!b.items.length) continue;
    const sets = Math.min(...b.items.map((i) => Math.floor((qtyByBook.get(i.bookId) ?? 0) / i.quantity)));
    if (sets <= 0) continue;
    const normal = b.items.reduce((s, i) => s + (netUnit.get(i.bookId) ?? 0) * i.quantity, 0);
    const d = Math.max(normal - b.price, 0) * sets;
    if (d > best) { best = d; bestId = b.id; }
  }
  return { discount: best, id: bestId };
}

function couponError(code: CouponErrorCode, d?: { minPurchase?: number; perUserLimit?: number }) { return { code, message: couponMessage(code, d) }; }

interface CouponEvalInput { lines: QuoteLine[]; appliedPromos: Quote["appliedPromos"]; live: Promotion[]; hasPhysical: boolean; netSubtotal: number; bundleDiscount: number; shippingCost: number }

function evaluateCoupon(ctx: QuoteContext, i: CouponEvalInput): { applied: Quote["coupon"]; error: Quote["couponError"] } {
  const fail = (code: CouponErrorCode, d?: { minPurchase?: number; perUserLimit?: number }) => ({ applied: null, error: couponError(code, d) });
  const c = ctx.coupon;
  if (!ctx.loggedIn) return fail("COUPON_LOGIN_REQUIRED");
  if (!c) return fail("COUPON_NOT_FOUND");
  if (!c.active) return fail("COUPON_INACTIVE");
  if (c.startsAt && ctx.now.getTime() < new Date(c.startsAt).getTime()) return fail("COUPON_NOT_STARTED");
  if (c.endsAt && ctx.now.getTime() >= new Date(c.endsAt).getTime()) return fail("COUPON_EXPIRED");
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return fail("COUPON_EXHAUSTED");
  if (ctx.userUsedCount >= c.perUserLimit) return fail("COUPON_USER_LIMIT", { perUserLimit: c.perUserLimit });

  const eligibleLines = i.lines.filter((l) => scopeMatches(c.scopeType, c.scopeIds, ctx.books.get(l.bookId)!) && !c.excludeBookIds.includes(l.bookId));
  if (!eligibleLines.length) return fail("COUPON_NOT_APPLICABLE");
  if (c.type === "FREE_SHIPPING" && !i.hasPhysical) return fail("COUPON_NO_PHYSICAL");
  const promoBlocks = i.appliedPromos.length > 0 && (!c.stackableWithPromo || i.appliedPromos.some((p) => i.live.find((x) => x.id === p.id)?.stackableWithCoupon === false));
  if (promoBlocks) return fail("COUPON_STACKING");

  const eligiblePre = eligibleLines.reduce((s, l) => s + l.lineNet, 0);
  const bundleShare = i.netSubtotal > 0 ? Math.floor((i.bundleDiscount * eligiblePre) / i.netSubtotal) : 0;
  const eligibleBase = Math.max(0, eligiblePre - bundleShare);
  if (eligibleBase < c.minPurchase) return fail("COUPON_MIN_PURCHASE", { minPurchase: c.minPurchase });

  let discount = 0, shippingDiscount = 0;
  if (c.type === "PERCENT") { discount = Math.floor((eligibleBase * Math.min(c.value, 100)) / 100); if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount); }
  else if (c.type === "FIXED") discount = Math.min(c.value, eligibleBase);
  else shippingDiscount = i.shippingCost;
  discount = Math.max(0, Math.min(discount, eligibleBase));
  return { applied: { id: c.id, code: c.code, type: c.type, discount, shippingDiscount, eligibleBase }, error: null };
}

export function computeQuote(ctx: QuoteContext, input: QuoteInput): Quote {
  // 1) lines (merge duplicate books, validate quantity, drop unknown books)
  const qtyByBook = new Map<string, number>();
  const order: string[] = [];
  const missing: string[] = [];
  for (const it of input.items) {
    if (!ctx.books.has(it.bookId)) { if (!missing.includes(it.bookId)) missing.push(it.bookId); continue; }
    const q = Math.max(0, Math.min(99, Math.trunc(it.quantity)));
    if (q <= 0) continue;
    if (!qtyByBook.has(it.bookId)) order.push(it.bookId);
    qtyByBook.set(it.bookId, Math.min(99, (qtyByBook.get(it.bookId) ?? 0) + q));
  }
  const base = order.map((id) => { const b = ctx.books.get(id)!; return { b, qty: qtyByBook.get(id)!, selling: sellingPrice(b) }; });
  const subtotal = base.reduce((s, l) => s + l.selling * l.qty, 0);

  // 2) automatic promotions: a promo is eligible when the eligible-lines subtotal meets its minimum purchase
  const live = ctx.promotions.filter((p) => isPromoLive(p, ctx.now));
  const eligible = live.filter((p) => {
    const sub = base.filter((l) => scopeMatches(p.scopeType, p.scopeIds, l.b)).reduce((s, l) => s + l.selling * l.qty, 0);
    return sub > 0 && sub >= p.minPurchase;
  });
  const lines: QuoteLine[] = base.map((l) => {
    const best = pickBestPromo(l.b, eligible.filter((p) => scopeMatches(p.scopeType, p.scopeIds, l.b)));
    const unitDiscount = best?.saving ?? 0;
    const netUnit = l.selling - unitDiscount;
    return {
      bookId: l.b.id, title: l.b.title, format: l.b.format, quantity: l.qty, listPrice: l.b.price, sellingUnit: l.selling,
      promoId: best?.promo.id ?? null, promoTitle: best?.promo.title ?? null, promoUnitDiscount: unitDiscount,
      netUnit, promoDiscountTotal: unitDiscount * l.qty, lineSubtotal: l.selling * l.qty, lineNet: netUnit * l.qty,
    };
  });
  const promoDiscount = lines.reduce((s, l) => s + l.promoDiscountTotal, 0);
  const netSubtotal = subtotal - promoDiscount;
  const appliedPromos = [...new Map(lines.filter((l) => l.promoId).map((l) => [l.promoId!, { id: l.promoId!, title: l.promoTitle!, discount: 0 }])).values()]
    .map((p) => ({ ...p, discount: lines.filter((l) => l.promoId === p.id).reduce((s, l) => s + l.promoDiscountTotal, 0) }));

  // 3) bundle on promotion-adjusted prices
  const bundle = bestBundle(ctx.bundles, qtyByBook, new Map(lines.map((l) => [l.bookId, l.netUnit])));
  const bundleDiscount = Math.min(bundle.discount, netSubtotal);

  const hasPhysical = lines.some((l) => l.format === "PRINT");
  const shippingCost = hasPhysical ? Math.max(0, Math.trunc(input.shippingCost)) : 0;

  // 4) coupon (evaluated by a pure helper so TypeScript can track the result)
  const evaluated = ctx.couponCodeGiven
    ? evaluateCoupon(ctx, { lines, appliedPromos, live, hasPhysical, netSubtotal, bundleDiscount, shippingCost })
    : { applied: null as Quote["coupon"], error: null as Quote["couponError"] };
  const applied = evaluated.applied;
  const cErr = evaluated.error;

  const couponDiscount = applied?.discount ?? 0;
  const shippingDiscount = applied?.shippingDiscount ?? 0;
  const total = Math.max(netSubtotal - bundleDiscount - couponDiscount, 0) + shippingCost - shippingDiscount;

  return {
    lines, missingBookIds: missing, subtotal, promoDiscount, netSubtotal,
    bundleDiscount, bundleId: bundleDiscount > 0 ? bundle.id : null, appliedPromos,
    coupon: applied, couponError: cErr, hasPhysical, shippingCost, shippingDiscount, total,
    evaluatedAt: ctx.now.toISOString(),
  };
}