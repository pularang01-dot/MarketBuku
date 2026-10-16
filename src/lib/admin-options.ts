import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { Opt, ScopeOptions } from "@/components/scope-picker";

/** Options for scope pickers (categories, subjects, levels, grades, books). */
export async function scopeOptions(): Promise<{ options: ScopeOptions; books: Opt[] }> {
  const db = createSupabaseAdmin();
  const [c, s, l, g, b] = await Promise.all([
    db.from("categories").select("id,name").order("name"), db.from("subjects").select("id,name").order("name"),
    db.from("education_levels").select("id,name").order("sort"), db.from("grades").select("id,name").order("sort"),
    db.from("books").select("id,title").neq("status", "ARCHIVED").order("title").limit(500),
  ]);
  const books = (b.data ?? []).map((x) => ({ id: x.id, name: x.title }));
  return { options: { CATEGORY: c.data ?? [], SUBJECT: s.data ?? [], LEVEL: l.data ?? [], GRADE: g.data ?? [], BOOK: books }, books };
}