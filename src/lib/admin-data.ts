import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
export async function formOptions() {
  const db = createSupabaseAdmin();
  const [a, p, l, g, s, c] = await Promise.all(["authors", "publishers", "education_levels", "grades", "subjects", "categories"].map((t) => db.from(t).select("id,name").order("name")));
  return { authors: a.data ?? [], publishers: p.data ?? [], levels: l.data ?? [], grades: g.data ?? [], subjects: s.data ?? [], categories: c.data ?? [] };
}
