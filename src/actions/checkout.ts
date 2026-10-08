"use server";
import { redirect } from "next/navigation";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { checkoutSchema } from "@/schemas";
import { getShippingProvider } from "@/lib/shipping";
import { getPaymentProvider } from "@/lib/payments";
import { COUPON_MESSAGES } from "@/lib/pricing";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/types";

export async function getShippingRates(city: string, postal: string) {
  const cart = await getCart();
  if (!cart.hasPhysical) return [];
  return getShippingProvider().getRates({ destinationCity: city, destinationPostalCode: postal, weightGram: cart.weightGram });
}

export async function placeOrder(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  if (!(await rateLimit(`checkout:${user.id}`, 6, 60_000))) return { ok: false, message: "Terlalu banyak percobaan. Tunggu sebentar." };

  const parsed = checkoutSchema.safeParse({
    address: {
      recipient_name: fd.get("recipient_name"), phone: fd.get("phone"), province: fd.get("province"), city: fd.get("city"),
      district: fd.get("district"), postal_code: fd.get("postal_code"), address_line: fd.get("address_line"),
      latitude: fd.get("latitude"), longitude: fd.get("longitude"),
    },
    shipping: fd.get("shipping") ?? "NONE:NONE",
    coupon: fd.get("coupon") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten((i) => i.path.slice(-1)[0] as string).fieldErrors;
    return { ok: false, message: "Periksa kembali data pengiriman.", errors: flat as Record<string, string[]> };
  }

  // Re-read everything server-side. Nothing from the browser is trusted for money or stock.
  const cart = await getCart();
  if (!cart.lines.length) return { ok: false, message: "Keranjang kosong." };
  const bad = cart.lines.find((l) => l.problem);
  if (bad) return { ok: false, message: `"${bad.book.title}": ${bad.problem}. Perbarui keranjang.` };

  let shippingCost = 0, courier: string | null = null, service: string | null = null;
  if (cart.hasPhysical) {
    const [c, s] = parsed.data.shipping.split(":");
    const rates = await getShippingProvider().getRates({ destinationCity: parsed.data.address.city, destinationPostalCode: parsed.data.address.postal_code, weightGram: cart.weightGram });
    const rate = rates.find((r) => r.courier === c && r.service === s);
    if (!rate) return { ok: false, message: "Layanan pengiriman tidak tersedia. Pilih ulang." };
    shippingCost = rate.cost; courier = rate.courier; service = rate.service;
  }

  const db = createSupabaseAdmin();
  const { data: orderId, error } = await db.rpc("create_order", {
    p_user: user.id,
    p_items: cart.lines.map((l) => ({ book_id: l.book.id, quantity: l.quantity })),
    p_address: parsed.data.address,
    p_shipping_cost: shippingCost, p_courier: courier, p_service: service,
    p_coupon: parsed.data.coupon || null,
  });
  if (error) {
    const code = /(COUPON_[A-Z_]+|INSUFFICIENT_STOCK|BOOK_UNAVAILABLE|EMPTY_CART)/.exec(error.message)?.[1] ?? "";
    if (code.startsWith("COUPON_")) return { ok: false, message: COUPON_MESSAGES[code] ?? "Kupon tidak dapat dipakai.", errors: { coupon: [COUPON_MESSAGES[code] ?? "Kupon tidak valid"] } };
    if (code === "INSUFFICIENT_STOCK") return { ok: false, message: "Stok salah satu buku baru saja berubah. Perbarui keranjang." };
    console.error("[checkout] create_order", error);
    return { ok: false, message: "Pesanan gagal dibuat. Coba lagi." };
  }

  const { data: order } = await db.from("orders").select("id, order_number, total").eq("id", orderId).single();
  try {
    const provider = getPaymentProvider();
    const pay = await provider.createPayment({
      orderId: order!.id, orderNumber: order!.order_number, amount: order!.total,
      customer: { name: parsed.data.address.recipient_name, email: user.email ?? "", phone: parsed.data.address.phone },
      items: cart.lines.map((l) => ({ id: l.book.id, name: l.book.title.slice(0, 50), price: l.unit, quantity: l.quantity })),
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order!.id}`,
    });
    await db.from("payments").insert({ order_id: order!.id, provider: provider.name, provider_txn_id: pay.providerTxnId, amount: order!.total, redirect_url: pay.redirectUrl, raw: pay.raw as object });
    if (user.email) await sendEmail(user.email, "order_created", { order: order!.order_number });
    redirect(pay.redirectUrl);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (typeof e === "object" && e && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
    // compensation: release reserved stock + coupon so nothing is left half-done
    await db.rpc("cancel_pending_order", { p_order: order!.id, p_actor: user.id, p_note: "payment initialisation failed" });
    console.error("[checkout] payment", e);
    return { ok: false, message: "Gagal menyiapkan pembayaran. Pesanan dibatalkan, silakan coba lagi." };
  }
}