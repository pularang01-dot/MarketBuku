"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { addToCart } from "./cart";

/** Re-add the (still published) books of a past order to the cart. Prices come from the live catalogue, not the old order. */
export async function reorder(orderId: string) {
  if (!z.string().uuid().safeParse(orderId).success) return;
  const user = await getUser();
  if (!user) redirect("/login?next=/orders");
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("order_items").select("book_id, quantity, orders!inner(user_id)").eq("order_id", orderId).eq("orders.user_id", user.id);
  for (const i of data ?? []) await addToCart(i.book_id, i.quantity);
  redirect("/cart");
}
