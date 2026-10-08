export interface CreatePaymentInput {
  orderId: string; orderNumber: string; amount: number;
  customer: { name: string; email: string; phone?: string };
  items: { id: string; name: string; price: number; quantity: number }[];
  returnUrl: string;
}
export interface CreatePaymentResult { providerTxnId: string; redirectUrl: string; raw?: unknown }
export type NormalizedStatus = "PAID" | "PENDING" | "FAILED" | "EXPIRED" | "REFUNDED";
export interface WebhookResult {
  /** Unique id used for idempotency (provider event/txn id + status). */
  eventId: string; orderId: string; txnId: string; amount: number; status: NormalizedStatus; raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(providerTxnId: string, orderId: string): Promise<NormalizedStatus>;
  /** Must verify signature and throw on failure. Never trust the browser redirect. */
  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>;
  refundPayment(orderId: string, amount: number): Promise<void>;
}
