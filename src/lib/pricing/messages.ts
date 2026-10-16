import type { CouponErrorCode } from "./types";

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/** Buyer-facing coupon messages. They never reveal other users' data or internal state. */
export function couponMessage(code: CouponErrorCode, d: { minPurchase?: number; perUserLimit?: number } = {}): string {
  switch (code) {
    case "COUPON_LOGIN_REQUIRED": return "Masuk ke akunmu untuk memakai kupon.";
    case "COUPON_INVALID_FORMAT": return "Format kode kupon tidak valid.";
    case "COUPON_NOT_FOUND": return "Kode kupon tidak ditemukan.";
    case "COUPON_INACTIVE": return "Kupon ini sedang tidak aktif.";
    case "COUPON_NOT_STARTED": return "Kupon belum mulai berlaku.";
    case "COUPON_EXPIRED": return "Masa berlaku kupon telah berakhir.";
    case "COUPON_EXHAUSTED": return "Kuota kupon telah habis.";
    case "COUPON_USER_LIMIT": return (d.perUserLimit ?? 1) === 1 ? "Kupon ini hanya dapat digunakan satu kali per akun." : `Kupon ini hanya dapat digunakan ${d.perUserLimit} kali per akun.`;
    case "COUPON_NOT_APPLICABLE": return "Kupon ini tidak berlaku untuk produk di keranjang.";
    case "COUPON_NO_PHYSICAL": return "Kupon gratis ongkir hanya berlaku untuk pesanan yang berisi buku cetak.";
    case "COUPON_STACKING": return "Kupon tidak dapat digabung dengan promosi yang sedang aktif.";
    case "COUPON_MIN_PURCHASE": return `Minimal belanja ${rp(d.minPurchase ?? 0)} belum terpenuhi.`;
  }
}

export const isCouponErrorCode = (c: string): c is CouponErrorCode => c.startsWith("COUPON_");