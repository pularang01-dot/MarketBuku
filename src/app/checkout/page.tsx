import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/cart";
import { requireUser, getProfile } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  await requireUser("/checkout");
  const cart = await getCart();
  if (!cart.lines.length) redirect("/cart");
  if (cart.lines.some((l) => l.problem)) redirect("/cart");
  const supabase = await createSupabaseServer();
  const [{ data: addresses }, profile] = await Promise.all([supabase.from("addresses").select("*").order("is_default", { ascending: false }), getProfile()]);
  return (<><PageHeader title="Checkout Pemesanan" subtitle="Lengkapi alamat pengiriman, pilih layanan, lalu buat pesanan." crumbs={[{ href: "/cart", label: "Keranjang" }, { label: "Checkout" }]} /><CheckoutForm items={cart.lines.map((l) => ({ id: l.book.id, title: l.book.title, quantity: l.quantity, total: l.lineTotal, digital: l.book.format !== "PRINT" }))} summary={{ subtotal: cart.quote.subtotal, promoDiscount: cart.quote.promoDiscount, promoTitles: cart.quote.appliedPromos.map((p) => p.title), bundleDiscount: cart.quote.bundleDiscount, couponCode: cart.quote.coupon?.code ?? null, couponDiscount: cart.quote.coupon?.discount ?? 0, freeShipping: cart.quote.coupon?.type === "FREE_SHIPPING", baseTotal: cart.quote.total }} couponError={cart.couponCode && cart.quote.couponError ? cart.quote.couponError.message : null} hasPhysical={cart.hasPhysical} addresses={addresses ?? []} defaultName={profile?.full_name ?? ""} /></>);
}