import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const RUN = process.env.RUN_INTEGRATION === "1" && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
export const admin = (): SupabaseClient => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
export const anon = (): SupabaseClient => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

export async function makeUser(db: SupabaseClient, tag: string) {
  const email = `it-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;
  const password = "Passw0rd!test";
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `IT ${tag}` } });
  if (error) throw error;
  const client = anon();
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user!.id, email, client };
}

export async function makeBook(db: SupabaseClient, stock: number, price = 50000, format: "PRINT" | "EBOOK" = "PRINT") {
  const slug = `it-book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await db.from("books").insert({ title: `IT ${slug}`, slug, description: "Buku uji integrasi untuk pengujian otomatis.", price, format, status: "PUBLISHED" }).select("id").single();
  if (error) throw error;
  if (format === "PRINT") await db.rpc("adjust_stock", { p_book: data.id, p_delta: stock, p_type: "restock", p_actor: null, p_note: "it" });
  return data.id as string;
}

export const ADDR = { recipient_name: "Uji", phone: "081234567890", province: "Jawa Timur", city: "Surabaya", district: "Gubeng", postal_code: "60281", address_line: "Jl. Uji Coba No. 1" };
export const order = (db: SupabaseClient, user: string, items: { book_id: string; quantity: number }[], coupon: string | null = null) =>
  db.rpc("create_order", { p_user: user, p_items: items, p_address: ADDR, p_shipping_cost: 9000, p_courier: "DEV", p_service: "REG", p_coupon: coupon });
