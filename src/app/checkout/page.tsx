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
  return (<><PageHeader title="Checkout Pemesanan" subtitle="Lengkapi alamat pengiriman, pilih layanan, lalu buat pesanan." crumbs={[{ href: "/cart", label: "Keranjang" }, { label: "Checkout" }]} /><CheckoutForm items={cart.lines.map((l) => ({ id: l.book.id, title: l.book.title, quantity: l.quantity, total: l.lineTotal, digital: l.book.format !== "PRINT" }))} subtotal={cart.subtotal} bundleDiscount={cart.bundleDiscount} hasPhysical={cart.hasPhysical} addresses={addresses ?? []} defaultName={profile?.full_name ?? ""} /></>);
}