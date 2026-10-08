import { describe, it, expect } from "vitest";
import { canTransition, ADMIN_SETTABLE } from "../src/lib/order-state";

describe("order state machine", () => {
  it("allows the happy path", () => {
    const path = ["PENDING_PAYMENT", "PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i], path[i + 1])).toBe(true);
  });
  it("blocks skipping and backwards moves", () => {
    expect(canTransition("PENDING_PAYMENT", "SHIPPED")).toBe(false);
    expect(canTransition("SHIPPED", "PROCESSING")).toBe(false);
  });
  it("terminal states have no exits", () => {
    expect(canTransition("CANCELLED", "PAID")).toBe(false);
    expect(canTransition("REFUNDED", "COMPLETED")).toBe(false);
  });
  it("admin cannot manually set PAID", () => { expect(ADMIN_SETTABLE).not.toContain("PAID"); });
});
