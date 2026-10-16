import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { catalogPromo } from "./engine";
import { mapPromotion } from "./service";
import type { PricingBook } from "./types";

interface BookLike { id: string; price: number; sale_price: number | null; education_level_id?: string | null; grade_id?: string | null; promo?: { id: string; title: string; unitDiscount: number; netUnit: number; percent: number } | null }

/**
 * Attaches the best automatic promotion (without minimum purchase) to each book, using the SAME engine as the cart,
 * so the catalog price equals the cart price. One batched read per page; never cached across requests.
 */
export async function attachPromos<T extends BookLike>(books: T[]): Promise<T[]> {
  if (!books.length) return books;
  const supabase = await createSupabaseServer(); // promotions/taxonomy are publicly readable via RLS
  const { data: rows } = await supabase.from("promotions").select("*").eq("active", true).not("benefit_type", "is", null).eq("min_purchase", 0);
  const promos = (rows ?? []).map(mapPromotion);
  if (!promos.length) return books;
  const ids = books.map((b) => b.id);
  const needsRel = promos.some((p) => p.scopeType === "CATEGORY" || p.scopeType === "SUBJECT");
  const [cats, subs] = needsRel
    ? await Promise.all([supabase.from("book_categories").select("book_id,category_id").in("book_id", ids), supabase.from("book_subjects").select("book_id,subject_id").in("book_id", ids)])
    : [{ data: [] as { book_id: string; category_id: string }[] }, { data: [] as { book_id: string; subject_id: string }[] }];
  const catBy = new Map<string, string[]>(), subBy = new Map<string, string[]>();
  (cats.data ?? []).forEach((r) => catBy.set(r.book_id, [...(catBy.get(r.book_id) ?? []), r.category_id]));
  (subs.data ?? []).forEach((r) => subBy.set(r.book_id, [...(subBy.get(r.book_id) ?? []), r.subject_id]));
  const now = new Date();
  return books.map((b) => {
    const pb: PricingBook = { id: b.id, title: "", format: "PRINT", price: b.price, salePrice: b.sale_price, categoryIds: catBy.get(b.id) ?? [], subjectIds: subBy.get(b.id) ?? [], levelId: b.education_level_id ?? null, gradeId: b.grade_id ?? null };
    const hit = catalogPromo(pb, promos, now);
    return hit ? { ...b, promo: { id: hit.promoId, title: hit.title, unitDiscount: hit.unitDiscount, netUnit: hit.netUnit, percent: hit.percent } } : b;
  });
}