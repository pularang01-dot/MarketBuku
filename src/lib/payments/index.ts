import "server-only";
import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./mock";
import { MidtransProvider } from "./midtrans";
import { ManualPaymentProvider } from "./manual";

export function getPaymentProvider(): PaymentProvider {
  switch (env.paymentProvider) {
    case "midtrans": return new MidtransProvider();
    case "manual": return new ManualPaymentProvider();
    case "mock": return new MockPaymentProvider();
    default: throw new Error(`Unknown PAYMENT_PROVIDER "${env.paymentProvider}"`);
  }
}