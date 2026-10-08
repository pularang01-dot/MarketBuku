import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
export async function getSavedIds() {
  const user = await getUser();
  if (!user) return new Set<string>();
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("wishlist_items").select("book_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.book_id as string));
}
