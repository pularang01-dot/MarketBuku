import { describe, it, expect } from "vitest";
import { canUploadProof, paymentPhase, timeline, type ProofLike } from "../src/lib/payment-state";

const P = (status: ProofLike["status"], created_at = "2026-10-10T10:00:00Z"): ProofLike => ({ status, created_at });

describe("payment phase (separate from order status)", () => {
  it("no proof yet", () => { expect(paymentPhase("PENDING_PAYMENT", [])).toBe("AWAITING_PAYMENT"); });
  it("proof uploaded is NOT paid", () => { expect(paymentPhase("PENDING_PAYMENT", [P("PENDING")])).toBe("AWAITING_VERIFICATION"); });
  it("rejected proof", () => { expect(paymentPhase("PENDING_PAYMENT", [P("REJECTED")])).toBe("PROOF_REJECTED"); });
  it("a newer pending proof wins over an older rejected one", () => {
    expect(paymentPhase("PENDING_PAYMENT", [P("REJECTED", "2026-10-10T09:00:00Z"), P("PENDING", "2026-10-10T11:00:00Z")])).toBe("AWAITING_VERIFICATION");
  });
  it("paid only comes from the order status, never from proofs", () => {
    expect(paymentPhase("PENDING_PAYMENT", [P("APPROVED")])).toBe("AWAITING_PAYMENT");
    expect(paymentPhase("PAID", [])).toBe("PAID");
    expect(paymentPhase("SHIPPED", [])).toBe("PAID");
  });
  it("terminal states", () => {
    expect(paymentPhase("CANCELLED", [P("PENDING")])).toBe("CANCELLED");
    expect(paymentPhase("REFUNDED", [])).toBe("REFUNDED");
  });
});

describe("upload rules", () => {
  it("allowed while awaiting payment, or after a rejection", () => {
    expect(canUploadProof("PENDING_PAYMENT", [])).toBe(true);
    expect(canUploadProof("PENDING_PAYMENT", [P("REJECTED")])).toBe(true);
  });
  it("blocked while one is pending, or when the order is not awaiting payment", () => {
    expect(canUploadProof("PENDING_PAYMENT", [P("PENDING")])).toBe(false);
    expect(canUploadProof("PAID", [])).toBe(false);
    expect(canUploadProof("CANCELLED", [])).toBe(false);
  });
});

describe("timeline never marks future steps as done", () => {
  const base = { created_at: "2026-10-10T08:00:00Z", has_physical: true };
  const marks = (status: string, proofs: ProofLike[] = []) => timeline({ ...base, status }, proofs).map((s) => `${s.key}:${s.state}`);
  it("fresh order", () => { expect(marks("PENDING_PAYMENT")).toEqual(["created:done", "awaiting:current", "proof:upcoming", "verified:upcoming", "processing:upcoming", "shipped:upcoming", "completed:upcoming"]); });
  it("proof submitted, waiting for the admin", () => { expect(marks("PENDING_PAYMENT", [P("PENDING")])).toEqual(["created:done", "awaiting:done", "proof:done", "verified:current", "processing:upcoming", "shipped:upcoming", "completed:upcoming"]); });
  it("paid but not shipped", () => { expect(marks("PAID", [P("APPROVED")]).slice(0, 5)).toEqual(["created:done", "awaiting:done", "proof:done", "verified:done", "processing:current"]); });
  it("digital-only orders have no shipping step", () => { expect(timeline({ ...base, has_physical: false, status: "PAID" }).some((s) => s.key === "shipped")).toBe(false); });
  it("cancelled shows only what happened", () => { expect(timeline({ ...base, status: "CANCELLED" })).toHaveLength(2); });
});