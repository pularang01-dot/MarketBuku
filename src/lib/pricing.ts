export interface PriceableItem { price: number; salePrice?: number | null; quantity: number }

export const unitPrice = (i: Pick<PriceableItem, "price" | "salePrice">) =>
  i.salePrice != null && i.salePrice <= i.price ? i.salePrice : i.price;

export function subtotal(items: PriceableItem[]) {
  return items.reduce((s, i) => s + unitPrice(i) * i.quantity, 0);
}

export interface CouponRule {
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minPurchase: number;
  maxDiscount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  perUserLimit: number;
  active: boolean;
}

export type CouponResult =
  | { ok: true; discount: number; freeShipping: boolean }
  | { ok: false; reason: "INVALID" | "NOT_STARTED" | "EXPIRED" | "MIN_PURCHASE" | "EXHAUSTED" | "USER_LIMIT" };

/** Mirror of the SQL logic in create_order(); used for UI preview only. SQL is authoritative. */
export function evaluateCoupon(c: CouponRule | null, sub: number, userUsed: number, now = new Date()): CouponResult {
  if (!c || !c.active) return { ok: false, reason: "INVALID" };
  if (c.startsAt && now < new Date(c.startsAt)) return { ok: false, reason: "NOT_STARTED" };
  if (c.endsAt && now > new Date(c.endsAt)) return { ok: false, reason: "EXPIRED" };
  if (sub < c.minPurchase) return { ok: false, reason: "MIN_PURCHASE" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, reason: "EXHAUSTED" };
  if (userUsed >= c.perUserLimit) return { ok: false, reason: "USER_LIMIT" };
  if (c.type === "FREE_SHIPPING") return { ok: true, discount: 0, freeShipping: true };
  let d = c.type === "PERCENT" ? Math.floor((sub * Math.min(c.value, 100)) / 100) : Math.min(c.value, sub);
  if (c.maxDiscount != null) d = Math.min(d, c.maxDiscount);
  return { ok: true, discount: d, freeShipping: false };
}

export function orderTotal(sub: number, discount: number, shipping: number) {
  return Math.max(sub - discount, 0) + shipping;
}

export const COUPON_MESSAGES: Record<string, string> = {
  COUPON_INVALID: "Kode kupon tidak valid.",
  COUPON_NOT_STARTED: "Kupon belum berlaku.",
  COUPON_EXPIRED: "Kupon sudah kedaluwarsa.",
  COUPON_MIN_PURCHASE: "Belanja belum mencapai minimum untuk kupon ini.",
  COUPON_EXHAUSTED: "Kuota kupon sudah habis.",
  COUPON_USER_LIMIT: "Kamu sudah mencapai batas pemakaian kupon ini.",
};
