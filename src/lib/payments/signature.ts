import { createHmac, createHash, timingSafeEqual } from "crypto";

export function hmacSha256(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("hex");
}
export function sha512(data: string) {
  return createHash("sha512").update(data).digest("hex");
}
export function safeEqual(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}
