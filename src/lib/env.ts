import "server-only";

export const env = {
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "manual",
  paymentSecret: process.env.PAYMENT_SECRET_KEY ?? "",
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  paymentSandbox: (process.env.PAYMENT_SANDBOX ?? "true") === "true",
  shippingProvider: process.env.SHIPPING_PROVIDER ?? "dev",
  emailProvider: process.env.EMAIL_PROVIDER ?? "console",
  isProd: process.env.NODE_ENV === "production",
};