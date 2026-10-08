import { describe, it, expect } from "vitest";
import { subtotal, unitPrice, evaluateCoupon, orderTotal, type CouponRule } from "../src/lib/pricing";

const base: CouponRule = { type: "PERCENT", value: 10, minPurchase: 100000, maxDiscount: 30000, usedCount: 0, perUserLimit: 1, active: true };

describe("pricing", () => {
  it("uses sale price when lower", () => { expect(unitPrice({ price: 100, salePrice: 80 })).toBe(80); });
  it("ignores invalid sale price above price", () => { expect(unitPrice({ price: 100, salePrice: 120 })).toBe(100); });
  it("computes subtotal", () => { expect(subtotal([{ price: 100, salePrice: 80, quantity: 2 }, { price: 50, quantity: 1 }])).toBe(210); });
  it("total never negative and adds shipping", () => { expect(orderTotal(100, 500, 9000)).toBe(9000); expect(orderTotal(200000, 20000, 9000)).toBe(189000); });
});

describe("coupon", () => {
  it("percent capped by maxDiscount", () => { expect(evaluateCoupon(base, 500000, 0)).toEqual({ ok: true, discount: 30000, freeShipping: false }); });
  it("percent below cap", () => { expect(evaluateCoupon(base, 200000, 0)).toEqual({ ok: true, discount: 20000, freeShipping: false }); });
  it("fixed cannot exceed subtotal", () => { expect(evaluateCoupon({ ...base, type: "FIXED", value: 999999, maxDiscount: null, minPurchase: 0 }, 50000, 0)).toEqual({ ok: true, discount: 50000, freeShipping: false }); });
  it("free shipping", () => { expect(evaluateCoupon({ ...base, type: "FREE_SHIPPING" }, 150000, 0)).toEqual({ ok: true, discount: 0, freeShipping: true }); });
  it("rejects below minimum", () => { expect(evaluateCoupon(base, 50000, 0)).toEqual({ ok: false, reason: "MIN_PURCHASE" }); });
  it("rejects expired", () => { expect(evaluateCoupon({ ...base, endsAt: "2020-01-01" }, 200000, 0)).toEqual({ ok: false, reason: "EXPIRED" }); });
  it("rejects not started", () => { expect(evaluateCoupon({ ...base, startsAt: "2999-01-01" }, 200000, 0)).toEqual({ ok: false, reason: "NOT_STARTED" }); });
  it("rejects exhausted and per-user limit", () => {
    expect(evaluateCoupon({ ...base, usageLimit: 5, usedCount: 5 }, 200000, 0)).toEqual({ ok: false, reason: "EXHAUSTED" });
    expect(evaluateCoupon(base, 200000, 1)).toEqual({ ok: false, reason: "USER_LIMIT" });
  });
  it("rejects inactive / missing", () => { expect(evaluateCoupon({ ...base, active: false }, 200000, 0).ok).toBe(false); expect(evaluateCoupon(null, 200000, 0).ok).toBe(false); });
});
