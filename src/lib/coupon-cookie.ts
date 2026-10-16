import "server-only";
import { cookies } from "next/headers";
import { isValidCouponFormat, normalizeCouponCode } from "@/lib/pricing/engine";

const NAME = "tbe_coupon";
/** The applied coupon CODE only. Amounts are always recomputed by the server; the cookie is never trusted for money. */
export async function readCouponCode(): Promise<string | null> {
  const raw = (await cookies()).get(NAME)?.value;
  if (!raw) return null;
  const code = normalizeCouponCode(raw);
  return isValidCouponFormat(code) ? code : null;
}
export async function writeCouponCode(code: string) {
  (await cookies()).set(NAME, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function clearCouponCode() { (await cookies()).delete(NAME); }