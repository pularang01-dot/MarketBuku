import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BOOK_SELECT, type BookRow } from "@/types";
import { DEFAULT_WEIGHTS, explain, popularity, rank, similarity, userPreference, type BookFeatures, type Profile, type Signals } from "./scoring";

type Feat = BookFeatures & { row: BookRow };

async function loadFeatures(): Promise<Feat[]> {
  const supabase = await createSupabaseServer();
  const [{ data: books }, { data: bs }, { data: bc }, { data: subs }, { data: cats }] = await Promise.all([
    supabase.from("books").select(BOOK_SELECT + ", author_id").eq("status", "PUBLISHED").limit(500),
    supabase.from("book_subjects").select("book_id, subject_id"),
    supabase.from("book_categories").select("book_id, category_id"),
    supabase.from("subjects").select("id, slug"),
    supabase.from("categories").select("id, slug"),
  ]);
  const subSlug = new Map((subs ?? []).map((s) => [s.id, s.slug]));
  const catSlug = new Map((cats ?? []).map((c) => [c.id, c.slug]));
  const subjectsBy = new Map<string, string[]>(), catsBy = new Map<string, string[]>();
  (bs ?? []).forEach((r) => subjectsBy.set(r.book_id, [...(subjectsBy.get(r.book_id) ?? []), subSlug.get(r.subject_id)!]));
  (bc ?? []).forEach((r) => catsBy.set(r.book_id, [...(catsBy.get(r.book_id) ?? []), catSlug.get(r.category_id)!]));
  return ((books ?? []) as unknown as (BookRow & { author_id: string | null })[]).map((b) => ({
    id: b.id, row: b, authorId: b.author_id, gradeSlug: b.grade?.slug, levelSlug: b.level?.slug,
    subjectSlugs: subjectsBy.get(b.id) ?? [], categorySlugs: catsBy.get(b.id) ?? [], soldCount: b.sold_count, ratingAvg: Number(b.rating_avg),
  }));
}

export interface Recommendation { book: BookRow; score: number; reasons: string[] }

async function trendingMap(): Promise<Map<string, number>> {
  const supabase = await createSupabaseServer();
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data } = await supabase.from("user_events").select("book_id").in("type", ["view_book", "add_to_cart", "wishlist"]).gte("created_at", since).limit(2000);
  const m = new Map<string, number>();
  (data ?? []).forEach((e) => e.book_id && m.set(e.book_id, (m.get(e.book_id) ?? 0) + 1));
  const max = Math.max(1, ...m.values());
  return new Map([...m].map(([k, v]) => [k, v / max]));
}

/** Similar books for a detail page. */
export async function similarBooks(bookId: string, limit = 4): Promise<Recommendation[]> {
  const feats = await loadFeatures();
  const seed = feats.find((f) => f.id === bookId);
  if (!seed) return [];
  const maxSold = Math.max(1, ...feats.map((f) => f.soldCount));
  const trend = await trendingMap();
  const items = feats.filter((f) => f.id !== bookId).map((f) => {
    const signals: Signals = { similarity: similarity(seed, f), popularity: popularity(f, maxSold), userPreference: 0, purchaseBehavior: 0, wishlist: 0, trending: trend.get(f.id) ?? 0 };
    return { id: f.id, signals, reasons: explain(f, signals, undefined, seed.row.title) };
  });
  const byId = new Map(feats.map((f) => [f.id, f.row]));
  return rank(items, DEFAULT_WEIGHTS, limit).map((r) => ({ book: byId.get(r.id)!, score: r.score, reasons: r.reasons }));
}

/** Personalised (logged in) or popular/trending (guest). Uses only data that actually exists. */
export async function forYou(userId: string | null, limit = 8): Promise<{ items: Recommendation[]; personalised: boolean }> {
  const supabase = await createSupabaseServer();
  const feats = await loadFeatures();
  const maxSold = Math.max(1, ...feats.map((f) => f.soldCount));
  const trend = await trendingMap();
  const byId = new Map(feats.map((f) => [f.id, f]));
  let profile: Profile | null = null;
  if (userId) {
    const [{ data: pref }, { data: wl }, { data: purchases }, { data: views }] = await Promise.all([
      supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("wishlist_items").select("book_id").eq("user_id", userId),
      supabase.from("order_items").select("book_id, orders!inner(user_id)").eq("orders.user_id", userId),
      supabase.from("user_events").select("book_id").eq("user_id", userId).eq("type", "view_book").order("created_at", { ascending: false }).limit(20),
    ]);
    profile = {
      gradeSlug: pref?.grade_slug, levelSlug: pref?.education_level_slug, subjectSlugs: pref?.subject_slugs ?? [],
      wishlistIds: (wl ?? []).map((x) => x.book_id), purchasedIds: (purchases ?? []).map((x) => x.book_id), viewedIds: (views ?? []).map((x) => x.book_id).filter(Boolean) as string[],
    };
  }
  const hasSignal = !!profile && (profile.gradeSlug || profile.subjectSlugs.length || profile.wishlistIds.length || profile.purchasedIds.length || profile.viewedIds.length);
  const centroid = (ids: string[]) => ids.map((i) => byId.get(i)).filter(Boolean) as Feat[];
  const items = feats.filter((f) => !profile?.purchasedIds.includes(f.id)).map((f) => {
    const wlSim = profile ? Math.max(0, ...centroid(profile.wishlistIds).map((w) => similarity(w, f))) : 0;
    const buySim = profile ? Math.max(0, ...centroid(profile.purchasedIds).map((w) => similarity(w, f))) : 0;
    const viewSim = profile ? Math.max(0, ...centroid(profile.viewedIds).map((w) => similarity(w, f))) : 0;
    const signals: Signals = { similarity: viewSim, popularity: popularity(f, maxSold), userPreference: profile ? userPreference(f, profile) : 0, purchaseBehavior: buySim, wishlist: wlSim, trending: trend.get(f.id) ?? 0 };
    return { id: f.id, signals, reasons: explain(f, signals, profile ?? undefined) };
  });
  return { items: rank(items, DEFAULT_WEIGHTS, limit).map((r) => ({ book: byId.get(r.id)!.row, score: r.score, reasons: r.reasons })), personalised: !!hasSignal };
}

/** Book finder: score real catalogue entries against wizard answers. */
export interface FinderAnswers { level?: string; grade?: string; subject?: string; goal?: string }
export async function finder(a: FinderAnswers, limit = 6): Promise<Recommendation[]> {
  const feats = await loadFeatures();
  const goalCat: Record<string, string> = { latihan: "latihan-soal", ujian: "persiapan-ujian", mengajar: "referensi-guru", literasi: "literasi-bacaan", belajar: "buku-pelajaran", referensi: "referensi-guru" };
  const maxSold = Math.max(1, ...feats.map((f) => f.soldCount));
  return feats.map((f) => {
    const reasons: string[] = []; let pts = 0, max = 0;
    if (a.level) { max += 2; if (f.levelSlug === a.level) { pts += 2; reasons.push("Sesuai jenjang"); } }
    if (a.grade) { max += 3; if (f.gradeSlug === a.grade) { pts += 3; reasons.push("Tepat untuk kelas yang dipilih"); } }
    if (a.subject) { max += 3; if (f.subjectSlugs.includes(a.subject)) { pts += 3; reasons.push("Membahas mata pelajaran yang dicari"); } }
    if (a.goal && goalCat[a.goal]) { max += 2; if (f.categorySlugs.includes(goalCat[a.goal])) { pts += 2; reasons.push("Sesuai tujuan belajarmu"); } }
    const pop = popularity(f, maxSold);
    const score = max ? (pts / max) * 0.92 + pop * 0.08 : pop;
    return { book: f.row, score, reasons: reasons.length ? reasons : ["Populer di katalog"] };
  }).filter((r) => r.score > 0.2).sort((x, y) => y.score - x.score).slice(0, limit);
}
