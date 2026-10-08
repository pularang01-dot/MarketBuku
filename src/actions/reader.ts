"use server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";

const page = z.coerce.number().int().min(1).max(5000);
const uuid = z.string().uuid();

async function ownsBook(bookId: string, userId: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("digital_entitlements").select("id").eq("user_id", userId).eq("book_id", bookId).maybeSingle();
  return !!data;
}

export async function saveProgress(bookId: string, p: number) {
  const user = await getUser(); const pg = page.safeParse(p);
  if (!user || !uuid.safeParse(bookId).success || !pg.success || !(await ownsBook(bookId, user.id))) return { ok: false };
  const supabase = await createSupabaseServer();
  await supabase.from("reading_progress").upsert({ user_id: user.id, book_id: bookId, page: pg.data, updated_at: new Date().toISOString() });
  return { ok: true };
}

export async function addBookmark(bookId: string, p: number, label: string) {
  const user = await getUser(); const pg = page.safeParse(p);
  if (!user || !uuid.safeParse(bookId).success || !pg.success || !(await ownsBook(bookId, user.id))) return { ok: false };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("reading_bookmarks").insert({ user_id: user.id, book_id: bookId, page: pg.data, label: label.trim().slice(0, 80) || null }).select("id, page, label").single();
  return error ? { ok: false } : { ok: true, bookmark: data };
}

export async function removeBookmark(id: string) {
  const user = await getUser();
  if (!user || !uuid.safeParse(id).success) return { ok: false };
  const supabase = await createSupabaseServer();
  await supabase.from("reading_bookmarks").delete().eq("id", id).eq("user_id", user.id);
  return { ok: true };
}
