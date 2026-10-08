import "server-only";
import { env } from "@/lib/env";
import { hmacSha256, safeEqual } from "./signature";
import type { PaymentProvider } from "./types";

/**
 * DEVELOPMENT-ONLY payment provider.
 * It sends a signed webhook through the SAME verified path as a real gateway, via /pay/mock/[orderId].
 * Refuses to run in production.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  constructor() {
    if (env.isProd) throw new Error("MockPaymentProvider is development-only and cannot be used in production. Set PAYMENT_PROVIDER=midtrans.");
    if (!env.webhookSecret) throw new Error("PAYMENT_WEBHOOK_SECRET is required for the mock provider.");
  }
  async createPayment(i: Parameters<PaymentProvider["createPayment"]>[0]) {
    return { providerTxnId: `MOCK-${i.orderId}`, redirectUrl: `/pay/mock/${i.orderId}` };
  }
  async getPaymentStatus() { return "PENDING" as const; }
  async handleWebhook(rawBody: string, headers: Headers) {
    const sig = headers.get("x-mock-signature") ?? "";
    if (!safeEqual(sig, hmacSha256(env.webhookSecret, rawBody))) throw new Error("INVALID_SIGNATURE");
    const b = JSON.parse(rawBody) as { order_id: string; txn_id: string; amount: number; status: "PAID" | "FAILED" };
    return { eventId: `${b.txn_id}:${b.status}`, orderId: b.order_id, txnId: b.txn_id, amount: b.amount, status: b.status, raw: b };
  }
  async refundPayment() { /* no-op in mock */ }
}
