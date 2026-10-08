import "server-only";
import { env } from "@/lib/env";
import { sha512, safeEqual } from "./signature";
import type { PaymentProvider, NormalizedStatus } from "./types";

/**
 * Midtrans Snap adapter. NOTE: written against Midtrans public docs; verify end-to-end in the
 * Midtrans SANDBOX with your own keys before going live (PAYMENT_SANDBOX=true).
 */
export class MidtransProvider implements PaymentProvider {
  readonly name = "midtrans";
  private snap = env.paymentSandbox ? "https://app.sandbox.midtrans.com/snap/v1" : "https://app.midtrans.com/snap/v1";
  private api = env.paymentSandbox ? "https://api.sandbox.midtrans.com/v2" : "https://api.midtrans.com/v2";
  private auth = "Basic " + Buffer.from(env.paymentSecret + ":").toString("base64");

  constructor() {
    if (!env.paymentSecret) throw new Error("PAYMENT_SECRET_KEY (Midtrans server key) is not configured.");
  }

  async createPayment(i: Parameters<PaymentProvider["createPayment"]>[0]) {
    const res = await fetch(`${this.snap}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: this.auth },
      body: JSON.stringify({
        transaction_details: { order_id: i.orderId, gross_amount: i.amount },
        customer_details: { first_name: i.customer.name, email: i.customer.email, phone: i.customer.phone },
        callbacks: { finish: i.returnUrl },
      }),
    });
    if (!res.ok) throw new Error(`Midtrans error ${res.status}`);
    const j = (await res.json()) as { token: string; redirect_url: string };
    return { providerTxnId: j.token, redirectUrl: j.redirect_url, raw: { token: j.token } };
  }

  async getPaymentStatus(_txn: string, orderId: string): Promise<NormalizedStatus> {
    const res = await fetch(`${this.api}/${orderId}/status`, { headers: { Authorization: this.auth, Accept: "application/json" } });
    if (!res.ok) return "PENDING";
    return mapStatus(await res.json());
  }

  async handleWebhook(rawBody: string) {
    const b = JSON.parse(rawBody) as Record<string, string>;
    const expected = sha512(`${b.order_id}${b.status_code}${b.gross_amount}${env.paymentSecret}`);
    if (!safeEqual(b.signature_key ?? "", expected)) throw new Error("INVALID_SIGNATURE");
    return {
      eventId: `${b.transaction_id}:${b.transaction_status}`,
      orderId: b.order_id, txnId: b.transaction_id,
      amount: Math.round(Number(b.gross_amount)), status: mapStatus(b), raw: b,
    };
  }

  async refundPayment(orderId: string, amount: number) {
    const res = await fetch(`${this.api}/${orderId}/refund`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: this.auth },
      body: JSON.stringify({ refund_key: `refund-${orderId}`, amount, reason: "Pembatalan/refund pesanan" }), // refund_key makes retries idempotent
    });
    const j = (await res.json().catch(() => ({}))) as { status_code?: string; status_message?: string };
    if (!res.ok || (j.status_code && !["200", "201"].includes(j.status_code))) throw new Error(`Midtrans refund gagal: ${j.status_message ?? res.status}`);
  }
}

function mapStatus(b: Record<string, string>): NormalizedStatus {
  const s = b.transaction_status;
  if (s === "settlement" || (s === "capture" && b.fraud_status !== "challenge")) return "PAID";
  if (s === "expire") return "EXPIRED";
  if (s === "deny" || s === "cancel" || s === "failure") return "FAILED";
  if (s === "refund" || s === "partial_refund") return "REFUNDED";
  return "PENDING";
}
