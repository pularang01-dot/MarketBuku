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

import { allowedTransitions } from "../src/lib/order-state";
describe("admin choices after payment", () => {
  it("physical order: can ship straight after payment, packing steps optional", () => {
    expect(allowedTransitions("PAID", true)).toEqual(expect.arrayContaining(["PROCESSING", "PACKED", "SHIPPED", "REFUNDED", "CANCELLED"]));
  });
  it("physical order can NOT be completed without shipping", () => {
    expect(allowedTransitions("PAID", true)).not.toContain("COMPLETED");
    expect(allowedTransitions("PACKED", true)).not.toContain("COMPLETED");
  });
  it("digital-only order: complete, never shipped or packed", () => {
    const o = allowedTransitions("PAID", false);
    expect(o).toContain("COMPLETED");
    expect(o).not.toContain("SHIPPED");
    expect(o).not.toContain("PACKED");
    expect(o).not.toContain("PROCESSING");
  });
  it("after shipping only delivery is offered; then completion", () => {
    expect(allowedTransitions("SHIPPED", true)).toEqual(["DELIVERED"]);
    expect(allowedTransitions("DELIVERED", true)).toEqual(expect.arrayContaining(["COMPLETED", "REFUNDED"]));
  });
});