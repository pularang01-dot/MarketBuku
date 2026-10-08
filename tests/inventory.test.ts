import { describe, it, expect } from "vitest";
import { available, canReserve, reserve, commitSale, release, isLow } from "../src/lib/inventory";

describe("inventory", () => {
  it("available = stock - reserved", () => { expect(available({ stock: 10, reserved: 3 })).toBe(7); });
  it("cannot oversell", () => {
    expect(canReserve({ stock: 5, reserved: 4 }, 2)).toBe(false);
    expect(() => reserve({ stock: 5, reserved: 4 }, 2)).toThrow("INSUFFICIENT_STOCK");
  });
  it("reserve -> commit keeps invariants", () => {
    const r = reserve({ stock: 10, reserved: 0 }, 3);
    expect(r).toEqual({ stock: 10, reserved: 3 });
    expect(commitSale(r, 3)).toEqual({ stock: 7, reserved: 0 });
  });
  it("release never goes negative", () => { expect(release({ stock: 5, reserved: 1 }, 5).reserved).toBe(0); });
  it("flags low stock", () => { expect(isLow({ stock: 4, reserved: 0 }, 5)).toBe(true); expect(isLow({ stock: 0, reserved: 0 }, 5)).toBe(false); });
});
