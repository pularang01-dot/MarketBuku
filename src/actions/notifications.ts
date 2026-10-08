"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
export async function markAllRead() {
  const user = await getUser(); if (!user) return;
  const supabase = await createSupabaseServer();
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  revalidatePath("/account/notifications");
}
