import "server-only";
import type { PaymentProvider } from "./types";

/**
 * Manual bank-transfer provider. The customer transfers to a shop bank account and uploads proof;
 * an admin verifies it (see actions/payment.ts). Verification ends in the SAME SQL function
 * (mark_order_paid) that gateway webhooks use, so automatic gateways can be added later without
 * changing orders, stock, or entitlements logic.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";
  async createPayment(i: Parameters<PaymentProvider["createPayment"]>[0]) {
    return { providerTxnId: `MANUAL-${i.orderId}`, redirectUrl: `/orders/${i.orderId}/pay` };
  }
  async getPaymentStatus() { return "PENDING" as const; }
  async handleWebhook(): Promise<never> { throw new Error("NOT_SUPPORTED"); }
  /** Refund is a manual bank transfer back to the customer, done by the admin outside the app. */
  async refundPayment() { /* no-op */ }
}