/** Pricing domain types. Pure data — no framework imports so the engine can be unit-tested anywhere. */
export type ScopeType = "ALL" | "CATEGORY" | "SUBJECT" | "LEVEL" | "GRADE" | "BOOK";
export type Format = "PRINT" | "EBOOK" | "MODULE";

export interface PricingBook {
  id: string; title: string; format: Format;
  price: number; salePrice: number | null;
  categoryIds: string[]; subjectIds: string[]; levelId: string | null; gradeId: string | null;
}

/** Automatic promotion (campaign). Benefit is computed from the LIST price; maxDiscount is per unit. */
export interface Promotion {
  id: string; title: string;
  benefitType: "PERCENT" | "FIXED" | null; benefitValue: number; maxDiscount: number | null;
  minPurchase: number; scopeType: ScopeType; scopeIds: string[];
  priority: number; stackableWithCoupon: boolean;
  startsAt: string | null; endsAt: string | null; active: boolean; createdAt: string;
}

export interface BundleDef { id: string; price: number; items: { bookId: string; quantity: number }[] }

export type CouponType = "PERCENT" | "FIXED" | "FREE_SHIPPING";
export interface Coupon {
  id: string; code: string; type: CouponType; value: number;
  minPurchase: number; maxDiscount: number | null;
  scopeType: ScopeType; scopeIds: string[]; excludeBookIds: string[];
  startsAt: string | null; endsAt: string | null;
  usageLimit: number | null; usedCount: number; perUserLimit: number;
  active: boolean; stackableWithPromo: boolean;
}

export type CouponErrorCode =
  | "COUPON_LOGIN_REQUIRED" | "COUPON_INVALID_FORMAT" | "COUPON_NOT_FOUND" | "COUPON_INACTIVE" | "COUPON_NOT_STARTED"
  | "COUPON_EXPIRED" | "COUPON_EXHAUSTED" | "COUPON_USER_LIMIT" | "COUPON_NOT_APPLICABLE" | "COUPON_NO_PHYSICAL"
  | "COUPON_STACKING" | "COUPON_MIN_PURCHASE";

export interface QuoteContext {
  books: Map<string, PricingBook>;
  promotions: Promotion[];
  bundles: BundleDef[];
  /** null when no code was given OR the code does not exist (see couponCodeGiven). */
  coupon: Coupon | null;
  couponCodeGiven: boolean;
  /** Redemptions of this coupon by this user that count toward the per-user limit (RESERVED + REDEEMED). */
  userUsedCount: number;
  loggedIn: boolean;
  now: Date;
}

export interface QuoteInput { items: { bookId: string; quantity: number }[]; shippingCost: number }

export interface QuoteLine {
  bookId: string; title: string; format: Format; quantity: number;
  listPrice: number; sellingUnit: number;
  promoId: string | null; promoTitle: string | null; promoUnitDiscount: number;
  netUnit: number; promoDiscountTotal: number; lineSubtotal: number; lineNet: number;
}

export interface Quote {
  lines: QuoteLine[];
  missingBookIds: string[];
  subtotal: number;          // Σ selling price × qty (sale_price when set, else list price)
  promoDiscount: number;     // automatic promotions
  netSubtotal: number;       // subtotal − promoDiscount
  bundleDiscount: number; bundleId: string | null;
  appliedPromos: { id: string; title: string; discount: number }[];
  coupon: { id: string; code: string; type: CouponType; discount: number; shippingDiscount: number; eligibleBase: number } | null;
  couponError: { code: CouponErrorCode; message: string } | null;
  hasPhysical: boolean;
  shippingCost: number; shippingDiscount: number;
  total: number;
  evaluatedAt: string;
}