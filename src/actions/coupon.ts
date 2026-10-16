"use server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth/session";
import { readCartItems } from "@/lib/cart";
import { clearCouponCode, writeCouponCode } from "@/lib/coupon-cookie";
import { getQuote } from "@/lib/pricing/service";
import { isValidCouponFormat, normalizeCouponCode } from "@/lib/pricing/engine";
import { couponMessage } from "@/lib/pricing/messages";
import { rateLimit } from "@/lib/rate-limit";

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/** Validates the coupon against the CURRENT cart on the server. Only a valid code is remembered (as a code, never as an amount). */
export async function applyCoupon(raw: string): Promise<{ ok: boolean; message: string }> {
  const user = await getUser();
  if (!user) return { ok: false, message: couponMessage("COUPON_LOGIN_REQUIRED") };
  if (!(await rateLimit(`coupon:${user.id}`, 12, 60_000))) return { ok: false, message: "Terlalu banyak percobaan. Tunggu sebentar." };

  const code = normalizeCouponCode(String(raw ?? "").slice(0, 60));
  if (!code) return { ok: false, message: "Masukkan kode kupon." };
  if (!isValidCouponFormat(code)) return { ok: false, message: couponMessage("COUPON_INVALID_FORMAT") };

  const items = await readCartItems();
  if (!items.length) return { ok: false, message: "Keranjang masih kosong." };
  const quote = await getQuote({ items, shippingCost: 0, couponCode: code, userId: user.id });
  if (quote.couponError) return { ok: false, message: quote.couponError.message };
  if (!quote.coupon) return { ok: false, message: couponMessage("COUPON_NOT_FOUND") };

  await writeCouponCode(quote.coupon.code);
  revalidatePath("/cart"); revalidatePath("/checkout");
  return { ok: true, message: quote.coupon.type === "FREE_SHIPPING" ? `Kupon ${quote.coupon.code} diterapkan: gratis ongkir.` : `Kupon ${quote.coupon.code} diterapkan: hemat ${rupiah(quote.coupon.discount)}.` };
}

export async function removeCoupon() {
  await clearCouponCode();
  revalidatePath("/cart"); revalidatePath("/checkout");
  return { ok: true, message: "Kupon dihapus." };
}