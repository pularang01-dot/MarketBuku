import { describe, it, expect } from "vitest";
import { bestBundleDiscount } from "../src/lib/bundles";

const bundle = { id: "b1", price: 145000, items: [{ bookId: "a", quantity: 1, unit: 74000 }, { bookId: "b", quantity: 1, unit: 79000 }] };

describe("bundle discount", () => {
  it("applies when all items are in the cart", () => { expect(bestBundleDiscount(new Map([["a", 1], ["b", 1]]), [bundle]).discount).toBe(8000); });
  it("does not apply when an item is missing", () => { expect(bestBundleDiscount(new Map([["a", 1]]), [bundle]).discount).toBe(0); });
  it("applies once per complete set", () => { expect(bestBundleDiscount(new Map([["a", 3], ["b", 2]]), [bundle]).discount).toBe(16000); });
  it("never negative when bundle costs more than parts", () => { expect(bestBundleDiscount(new Map([["a", 1], ["b", 1]]), [{ ...bundle, price: 999999 }]).discount).toBe(0); });
  it("picks the single best bundle", () => {
    const cheap = { id: "b2", price: 100000, items: bundle.items };
    expect(bestBundleDiscount(new Map([["a", 1], ["b", 1]]), [bundle, cheap])).toEqual({ discount: 53000, bundleId: "b2" });
  });
});
