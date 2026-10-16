import { describe, it, expect } from "vitest";
import { computeQuote, normalizeCouponCode, isValidCouponFormat, catalogPromo, sellingPrice } from "../src/lib/pricing/engine";
import type { Coupon, Promotion, PricingBook, QuoteContext, BundleDef } from "../src/lib/pricing/types";

const NOW = new Date("2026-10-10T05:00:00Z");
const B = (id: string, price: number, o: Partial<PricingBook> = {}): PricingBook => ({ id, title: `Buku ${id}`, format: "PRINT", price, salePrice: null, categoryIds: [], subjectIds: [], levelId: null, gradeId: null, ...o });
const P = (id: string, o: Partial<Promotion> = {}): Promotion => ({ id, title: `Promo ${id}`, benefitType: "PERCENT", benefitValue: 10, maxDiscount: null, minPurchase: 0, scopeType: "ALL", scopeIds: [], priority: 0, stackableWithCoupon: true, startsAt: null, endsAt: null, active: true, createdAt: "2026-01-01T00:00:00Z", ...o });
const C = (o: Partial<Coupon> = {}): Coupon => ({ id: "c1", code: "HEMAT", type: "PERCENT", value: 10, minPurchase: 0, maxDiscount: null, scopeType: "ALL", scopeIds: [], excludeBookIds: [], startsAt: null, endsAt: null, usageLimit: null, usedCount: 0, perUserLimit: 1, active: true, stackableWithPromo: true, ...o });
const ctx = (books: PricingBook[], o: Partial<QuoteContext> = {}): QuoteContext => ({ books: new Map(books.map((b) => [b.id, b])), promotions: [], bundles: [], coupon: null, couponCodeGiven: false, userUsedCount: 0, loggedIn: true, now: NOW, ...o });
const q = (c: QuoteContext, items: [string, number][], ship = 0) => computeQuote(c, { items: items.map(([bookId, quantity]) => ({ bookId, quantity })), shippingCost: ship });
const withCoupon = (books: PricingBook[], coupon: Coupon | null, o: Partial<QuoteContext> = {}) => ctx(books, { coupon, couponCodeGiven: true, ...o });

describe("A. automatic promotions", () => {
  it("percentage discount, rounded down", () => {
    const r = q(ctx([B("a", 99999)], { promotions: [P("p", { benefitValue: 15 })] }), [["a", 1]]);
    expect(r.lines[0].promoUnitDiscount).toBe(14999); // floor(99999*15/100) = 14999.85 -> 14999
    expect(r.total).toBe(99999 - 14999);
  });
  it("fixed amount, never above the list price", () => {
    const r = q(ctx([B("a", 30000)], { promotions: [P("p", { benefitType: "FIXED", benefitValue: 50000 })] }), [["a", 2]]);
    expect(r.lines[0].netUnit).toBe(0);
    expect(r.total).toBe(0);
  });
  it("max discount is applied per unit", () => {
    const r = q(ctx([B("a", 200000)], { promotions: [P("p", { benefitValue: 50, maxDiscount: 15000 })] }), [["a", 2]]);
    expect(r.lines[0].promoUnitDiscount).toBe(15000);
    expect(r.promoDiscount).toBe(30000);
  });
  it("only eligible books get the promotion (category scope)", () => {
    const r = q(ctx([B("a", 100000, { categoryIds: ["math"] }), B("b", 100000, { categoryIds: ["art"] })], { promotions: [P("p", { scopeType: "CATEGORY", scopeIds: ["math"] })] }), [["a", 1], ["b", 1]]);
    expect(r.lines.map((l) => l.promoUnitDiscount)).toEqual([10000, 0]);
  });
  it("level / grade / subject / book scopes", () => {
    const books = [B("a", 100000, { levelId: "sd", gradeId: "k5", subjectIds: ["mtk"] }), B("b", 100000)];
    for (const [scopeType, scopeIds] of [["LEVEL", ["sd"]], ["GRADE", ["k5"]], ["SUBJECT", ["mtk"]], ["BOOK", ["a"]]] as const) {
      const r = q(ctx(books, { promotions: [P("p", { scopeType, scopeIds: [...scopeIds] })] }), [["a", 1], ["b", 1]]);
      expect(r.lines.map((l) => l.promoUnitDiscount)).toEqual([10000, 0]);
    }
  });
  it("minimum purchase: below, exactly at, and above the threshold", () => {
    const c = ctx([B("a", 50000)], { promotions: [P("p", { minPurchase: 100000 })] });
    expect(q(c, [["a", 1]]).promoDiscount).toBe(0);      // 50.000 < 100.000
    expect(q(c, [["a", 2]]).promoDiscount).toBe(10000);  // exactly 100.000
    expect(q(c, [["a", 3]]).promoDiscount).toBe(15000);  // above
  });
  it("expired promotions do not apply; future ones do not apply yet; start is inclusive, end exclusive", () => {
    const run = (o: Partial<Promotion>) => q(ctx([B("a", 100000)], { promotions: [P("p", o)] }), [["a", 1]]).promoDiscount;
    expect(run({ endsAt: "2026-10-09T00:00:00Z" })).toBe(0);
    expect(run({ startsAt: "2026-10-11T00:00:00Z" })).toBe(0);
    expect(run({ startsAt: "2026-10-10T05:00:00Z" })).toBe(10000);  // starts exactly now
    expect(run({ endsAt: "2026-10-10T05:00:00Z" })).toBe(0);        // ends exactly now
    expect(run({ active: false })).toBe(0);
  });
  it("no double discount: the cheaper of sale_price and the promotion wins", () => {
    const sale = B("a", 100000, { salePrice: 80000 });
    expect(q(ctx([sale], { promotions: [P("p", { benefitValue: 10 })] }), [["a", 1]]).lines[0].netUnit).toBe(80000); // sale price is better
    expect(q(ctx([sale], { promotions: [P("p", { benefitValue: 30 })] }), [["a", 1]]).lines[0].netUnit).toBe(70000); // promotion is better
  });
  it("competing promotions: priority first, then biggest saving, then oldest", () => {
    const book = B("a", 100000);
    const win = (ps: Promotion[]) => q(ctx([book], { promotions: ps }), [["a", 1]]).lines[0].promoId;
    expect(win([P("big", { benefitValue: 30 }), P("small", { benefitValue: 10, priority: 5 })])).toBe("small"); // priority beats saving
    expect(win([P("x", { benefitValue: 10 }), P("y", { benefitValue: 20 })])).toBe("y");                           // saving
    expect(win([P("old", { createdAt: "2026-01-01T00:00:00Z" }), P("new", { createdAt: "2026-06-01T00:00:00Z" })])).toBe("old");
  });
  it("cart changes trigger a recalculation (same function, different cart)", () => {
    const c = ctx([B("a", 100000)], { promotions: [P("p", { minPurchase: 150000 })] });
    expect(q(c, [["a", 1]]).total).toBe(100000);
    expect(q(c, [["a", 2]]).total).toBe(180000);
  });
  it("total is never negative and unknown books are reported, not priced", () => {
    const r = q(ctx([B("a", 1000)]), [["a", 1], ["ghost", 1]]);
    expect(r.missingBookIds).toEqual(["ghost"]);
    expect(r.total).toBe(1000);
  });
  it("duplicate cart rows are merged and quantity is capped at 99", () => {
    const r = q(ctx([B("a", 1000)]), [["a", 60], ["a", 60]]);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(99);
  });
});

describe("bundles use promotion-adjusted prices", () => {
  const bundle: BundleDef = { id: "bd", price: 150000, items: [{ bookId: "a", quantity: 1 }, { bookId: "b", quantity: 1 }] };
  it("discounts only the remaining gap", () => {
    const books = [B("a", 100000), B("b", 100000)];
    expect(q(ctx(books, { bundles: [bundle] }), [["a", 1], ["b", 1]]).bundleDiscount).toBe(50000);
    expect(q(ctx(books, { bundles: [bundle], promotions: [P("p", { benefitValue: 20 })] }), [["a", 1], ["b", 1]]).bundleDiscount).toBe(10000); // 160.000 - 150.000
  });
});

describe("B. coupon validation", () => {
  const books = [B("a", 100000)];
  const code = (coupon: Coupon | null, o: Partial<QuoteContext> = {}, qty = 1) => q(withCoupon(books, coupon, o), [["a", qty]]).couponError?.code;
  it("not found / inactive / not started / expired", () => {
    expect(code(null)).toBe("COUPON_NOT_FOUND");
    expect(code(C({ active: false }))).toBe("COUPON_INACTIVE");
    expect(code(C({ startsAt: "2026-10-11T00:00:00Z" }))).toBe("COUPON_NOT_STARTED");
    expect(code(C({ endsAt: "2026-10-10T05:00:00Z" }))).toBe("COUPON_EXPIRED");
  });
  it("global quota and per-user limit", () => {
    expect(code(C({ usageLimit: 5, usedCount: 5 }))).toBe("COUPON_EXHAUSTED");
    expect(code(C({ usageLimit: 5, usedCount: 4 }))).toBeUndefined();
    expect(code(C({ perUserLimit: 1 }), { userUsedCount: 1 })).toBe("COUPON_USER_LIMIT");
    expect(code(C({ perUserLimit: 2 }), { userUsedCount: 1 })).toBeUndefined();
  });
  it("requires login", () => { expect(code(C(), { loggedIn: false })).toBe("COUPON_LOGIN_REQUIRED"); });
  it("minimum purchase: below / at / above (on the eligible base)", () => {
    const c = C({ minPurchase: 200000 });
    expect(code(c, {}, 1)).toBe("COUPON_MIN_PURCHASE");
    expect(code(c, {}, 2)).toBeUndefined();
    expect(code(c, {}, 3)).toBeUndefined();
  });
  it("the minimum is checked AFTER automatic promotions", () => {
    const r = q(withCoupon(books, C({ minPurchase: 200000 }), { promotions: [P("p", { benefitValue: 10 })] }), [["a", 2]]); // 180.000 after promo
    expect(r.couponError?.code).toBe("COUPON_MIN_PURCHASE");
    expect(r.couponError?.message).toContain("200.000");
  });
  it("scope and excluded books", () => {
    const bs = [B("a", 100000, { categoryIds: ["math"] }), B("b", 100000)];
    const r = q(withCoupon(bs, C({ scopeType: "CATEGORY", scopeIds: ["math"] })), [["a", 1], ["b", 1]]);
    expect(r.coupon?.eligibleBase).toBe(100000);
    expect(r.coupon?.discount).toBe(10000);
    expect(q(withCoupon(bs, C({ scopeType: "CATEGORY", scopeIds: ["art"] })), [["a", 1]]).couponError?.code).toBe("COUPON_NOT_APPLICABLE");
    expect(q(withCoupon(bs, C({ excludeBookIds: ["a"] })), [["a", 1], ["b", 1]]).coupon?.eligibleBase).toBe(100000);
    expect(q(withCoupon(bs, C({ excludeBookIds: ["a"] })), [["a", 1]]).couponError?.code).toBe("COUPON_NOT_APPLICABLE");
  });
  it("percentage, fixed, max discount, never above the base", () => {
    expect(q(withCoupon(books, C({ value: 10 })), [["a", 1]]).coupon?.discount).toBe(10000);
    expect(q(withCoupon(books, C({ value: 50, maxDiscount: 20000 })), [["a", 1]]).coupon?.discount).toBe(20000);
    expect(q(withCoupon(books, C({ type: "FIXED", value: 500000 })), [["a", 1]]).coupon?.discount).toBe(100000);
    expect(q(withCoupon(books, C({ type: "FIXED", value: 500000 })), [["a", 1]]).total).toBe(0);
  });
  it("free shipping discounts shipping only, and only for print orders", () => {
    const fs = C({ type: "FREE_SHIPPING", value: 0 });
    const r = q(withCoupon(books, fs), [["a", 1]], 18000);
    expect(r.coupon?.shippingDiscount).toBe(18000);
    expect(r.coupon?.discount).toBe(0);
    expect(r.total).toBe(100000);
    const digital = [B("e", 50000, { format: "EBOOK" })];
    expect(q(withCoupon(digital, fs), [["e", 1]], 18000).couponError?.code).toBe("COUPON_NO_PHYSICAL");
  });
  it("code normalisation: case, spaces, zero-width characters", () => {
    expect(normalizeCouponCode("  hemat 10  ")).toBe("HEMAT10");
    expect(normalizeCouponCode("he\u200Bmat")).toBe("HEMAT");
    expect(isValidCouponFormat("HEMAT-10")).toBe(true);
    expect(isValidCouponFormat("A")).toBe(false);
    expect(isValidCouponFormat("BAD CODE!")).toBe(false);
  });
});

describe("stacking policy", () => {
  const books = [B("a", 100000)];
  it("stackable by default: promotion first, coupon on the reduced base", () => {
    const r = q(withCoupon(books, C({ value: 10 }), { promotions: [P("p", { benefitValue: 20 })] }), [["a", 1]]);
    expect(r.promoDiscount).toBe(20000);
    expect(r.coupon?.eligibleBase).toBe(80000);
    expect(r.coupon?.discount).toBe(8000);
    expect(r.total).toBe(72000);
  });
  it("coupon marked not-stackable is refused when a promotion applied", () => {
    const r = q(withCoupon(books, C({ stackableWithPromo: false }), { promotions: [P("p")] }), [["a", 1]]);
    expect(r.couponError?.code).toBe("COUPON_STACKING");
  });
  it("promotion marked not-stackable also blocks the coupon", () => {
    const r = q(withCoupon(books, C(), { promotions: [P("p", { stackableWithCoupon: false })] }), [["a", 1]]);
    expect(r.couponError?.code).toBe("COUPON_STACKING");
  });
  it("a non-stackable coupon works when no promotion applied", () => {
    expect(q(withCoupon(books, C({ stackableWithPromo: false })), [["a", 1]]).coupon).not.toBeNull();
  });
  it("coupon base excludes the proportional share of a bundle discount", () => {
    const bs = [B("a", 100000), B("b", 100000)];
    const bundle: BundleDef = { id: "bd", price: 150000, items: [{ bookId: "a", quantity: 1 }, { bookId: "b", quantity: 1 }] };
    const r = q(withCoupon(bs, C({ value: 10 }), { bundles: [bundle] }), [["a", 1], ["b", 1]]);
    expect(r.bundleDiscount).toBe(50000);
    expect(r.coupon?.eligibleBase).toBe(150000);
    expect(r.total).toBe(150000 - 15000);
  });
});

describe("catalog price == cart price (single rule)", () => {
  it("catalogPromo and computeQuote agree for promotions without a minimum", () => {
    const book = B("a", 120000, { salePrice: 110000 });
    const promos = [P("p1", { benefitValue: 20 }), P("p2", { benefitValue: 15, priority: 3 })];
    const cat = catalogPromo(book, promos, NOW)!;
    const line = q(ctx([book], { promotions: promos }), [["a", 1]]).lines[0];
    expect(cat.netUnit).toBe(line.netUnit);
    expect(cat.promoId).toBe(line.promoId);
  });
  it("promotions with a minimum purchase are not priced in the catalog", () => {
    expect(catalogPromo(B("a", 100000), [P("p", { minPurchase: 1 })], NOW)).toBeNull();
  });
  it("sellingPrice ignores an invalid sale price above the list price", () => { expect(sellingPrice({ price: 100, salePrice: 120 })).toBe(100); });
});