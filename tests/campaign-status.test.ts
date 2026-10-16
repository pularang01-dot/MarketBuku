import { describe, it, expect } from "vitest";
import { campaignStatus } from "../src/lib/pricing/status";
import { fromWibInput, toWibInput } from "../src/lib/wib";
import { describeBenefit, scopeText } from "../src/lib/pricing/describe";
import { couponMessage } from "../src/lib/pricing/messages";
import { displayPrice, discountPercent } from "../src/lib/book-price";

const NOW = new Date("2026-10-10T05:00:00Z");

describe("campaign status (start inclusive, end exclusive, server clock)", () => {
  it("inactive wins over everything", () => { expect(campaignStatus({ active: false, startsAt: null, endsAt: null }, NOW)).toBe("INACTIVE"); });
  it("scheduled, active, expired", () => {
    expect(campaignStatus({ active: true, startsAt: "2026-10-11T00:00:00Z", endsAt: null }, NOW)).toBe("SCHEDULED");
    expect(campaignStatus({ active: true, startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-10-20T00:00:00Z" }, NOW)).toBe("ACTIVE");
    expect(campaignStatus({ active: true, startsAt: null, endsAt: "2026-10-09T00:00:00Z" }, NOW)).toBe("EXPIRED");
  });
  it("boundaries", () => {
    expect(campaignStatus({ active: true, startsAt: "2026-10-10T05:00:00Z", endsAt: null }, NOW)).toBe("ACTIVE");   // starts exactly now
    expect(campaignStatus({ active: true, startsAt: null, endsAt: "2026-10-10T05:00:00Z" }, NOW)).toBe("EXPIRED"); // ends exactly now
  });
});

describe("WIB date handling", () => {
  it("08:00 WIB is 01:00 UTC", () => { expect(fromWibInput("2026-10-10T08:00")).toBe("2026-10-10T01:00:00.000Z"); });
  it("round-trips", () => { expect(toWibInput(fromWibInput("2026-12-31T23:30"))).toBe("2026-12-31T23:30"); });
  it("rejects malformed input", () => { expect(fromWibInput("10/10/2026")).toBeNull(); expect(fromWibInput("")).toBeNull(); expect(fromWibInput(undefined)).toBeNull(); });
});

describe("descriptions and messages", () => {
  it("benefit text", () => {
    expect(describeBenefit("PERCENT", 15, 20000)).toContain("15%");
    expect(describeBenefit("FIXED", 5000, null)).toContain("5.000");
    expect(describeBenefit(null, 0, null)).toContain("Banner");
    expect(scopeText("ALL", 0)).toBe("Semua buku");
    expect(scopeText("CATEGORY", 3)).toContain("(3)");
  });
  it("coupon messages never leak internals", () => {
    expect(couponMessage("COUPON_USER_LIMIT", { perUserLimit: 1 })).toContain("satu kali");
    expect(couponMessage("COUPON_USER_LIMIT", { perUserLimit: 3 })).toContain("3 kali");
    expect(couponMessage("COUPON_MIN_PURCHASE", { minPurchase: 150000 })).toContain("150.000");
  });
});

describe("display price helper", () => {
  it("promo price beats sale price beats list price", () => {
    expect(displayPrice({ price: 100000, sale_price: null })).toBe(100000);
    expect(displayPrice({ price: 100000, sale_price: 90000 })).toBe(90000);
    expect(displayPrice({ price: 100000, sale_price: 90000, promo: { netUnit: 80000, title: "x", percent: 20 } })).toBe(80000);
  });
  it("discount percent is relative to the list price", () => { expect(discountPercent({ price: 100000, sale_price: 75000 })).toBe(25); });
});