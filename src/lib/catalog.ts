import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BOOK_SELECT, type BookRow } from "@/types";
import { sanitizeSearch } from "@/lib/utils";

import { PAGE_SIZE } from "@/lib/catalog-const";
export { PAGE_SIZE };
export type CatalogParams = {
  q?: string; level?: string; grade?: string; subject?: string; category?: string; author?: string;
  format?: string; min?: string; max?: string; rating?: string; available?: string; sort?: string; page?: string;
}

async function idsFromJoin(table: "book_subjects" | "book_categories", col: "subject_id" | "category_id", ref: "subjects" | "categories", slug: string) {
  const supabase = await createSupabaseServer();
  const { data: t } = await supabase.from(ref).select("id").eq("slug", slug).maybeSingle();
  if (!t) return [] as string[];
  const { data } = await supabase.from(table).select("book_id").eq(col, t.id);
  return (data ?? []).map((r) => r.book_id as string);
}

export async function queryBooks(p: CatalogParams) {
  const supabase = await createSupabaseServer();
  const page = Math.max(1, parseInt(p.page ?? "1") || 1);
  let q = supabase.from("books").select(BOOK_SELECT, { count: "exact" }).eq("status", "PUBLISHED");

  const term = p.q ? sanitizeSearch(p.q) : "";
  if (term) q = q.ilike("search_text", `%${term.toLowerCase()}%`);

  if (p.level) { const { data } = await supabase.from("education_levels").select("id").eq("slug", p.level).maybeSingle(); q = q.eq("education_level_id", data?.id ?? "00000000-0000-0000-0000-000000000000"); }
  if (p.grade) { const { data } = await supabase.from("grades").select("id").eq("slug", p.grade).maybeSingle(); q = q.eq("grade_id", data?.id ?? "00000000-0000-0000-0000-000000000000"); }
  if (p.author) { const { data } = await supabase.from("authors").select("id").eq("slug", p.author).maybeSingle(); q = q.eq("author_id", data?.id ?? "00000000-0000-0000-0000-000000000000"); }
  if (p.subject) q = q.in("id", await idsFromJoin("book_subjects", "subject_id", "subjects", p.subject));
  if (p.category) q = q.in("id", await idsFromJoin("book_categories", "category_id", "categories", p.category));
  if (p.format && ["PRINT", "EBOOK", "MODULE"].includes(p.format)) q = q.eq("format", p.format);
  if (p.min && +p.min >= 0) q = q.gte("price", +p.min);
  if (p.max && +p.max > 0) q = q.lte("price", +p.max);
  if (p.rating && +p.rating > 0) q = q.gte("rating_avg", +p.rating);

  switch (p.sort) {
    case "newest": q = q.order("created_at", { ascending: false }); break;
    case "price_asc": q = q.order("price", { ascending: true }); break;
    case "price_desc": q = q.order("price", { ascending: false }); break;
    case "rating": q = q.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }); break;
    default: q = q.order("sold_count", { ascending: false }).order("created_at", { ascending: false });
  }
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  let books = (data ?? []) as unknown as BookRow[];
  if (p.available === "1") books = books.filter((b) => b.format !== "PRINT" || ((Array.isArray(b.inventory) ? b.inventory[0] : b.inventory)?.stock ?? 0) > 0);
  return { books, total: count ?? 0, page, pages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)), error: !!error };
}

export async function getBookBySlug(slug: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("books").select(BOOK_SELECT).eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  return data as unknown as BookRow | null;
}

export async function getTaxonomy() {
  const supabase = await createSupabaseServer();
  const [levels, grades, subjects, categories] = await Promise.all([
    supabase.from("education_levels").select("name,slug").order("sort"),
    supabase.from("grades").select("name,slug").order("sort"),
    supabase.from("subjects").select("name,slug").order("name"),
    supabase.from("categories").select("name,slug").order("name"),
  ]);
  return { levels: levels.data ?? [], grades: grades.data ?? [], subjects: subjects.data ?? [], categories: categories.data ?? [] };
}

export async function suggest(term: string) {
  const t = sanitizeSearch(term);
  if (t.length < 2) return [];
  const supabase = await createSupabaseServer();
  const [b, a, s] = await Promise.all([
    supabase.from("books").select("title,slug").eq("status", "PUBLISHED").ilike("title", `%${t}%`).limit(5),
    supabase.from("authors").select("name,slug").ilike("name", `%${t}%`).limit(3),
    supabase.from("subjects").select("name,slug").ilike("name", `%${t}%`).limit(3),
  ]);
  return [
    ...(b.data ?? []).map((x) => ({ label: x.title, href: `/books/${x.slug}`, kind: "Buku" })),
    ...(a.data ?? []).map((x) => ({ label: x.name, href: `/authors/${x.slug}`, kind: "Penulis" })),
    ...(s.data ?? []).map((x) => ({ label: x.name, href: `/subjects/${x.slug}`, kind: "Mapel" })),
  ];
}