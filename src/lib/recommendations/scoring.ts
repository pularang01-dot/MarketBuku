export interface RecWeights {
  similarity: number; popularity: number; userPreference: number;
  purchaseBehavior: number; wishlist: number; trending: number;
}
export const DEFAULT_WEIGHTS: RecWeights = {
  similarity: 0.25, popularity: 0.2, userPreference: 0.2, purchaseBehavior: 0.15, wishlist: 0.1, trending: 0.1,
};

export interface Signals {
  similarity: number; popularity: number; userPreference: number;
  purchaseBehavior: number; wishlist: number; trending: number;
}
export interface Scored { id: string; score: number; reasons: string[] }

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function weightedScore(s: Signals, w: RecWeights = DEFAULT_WEIGHTS) {
  const total = w.similarity + w.popularity + w.userPreference + w.purchaseBehavior + w.wishlist + w.trending;
  if (total <= 0) return 0;
  const raw =
    clamp01(s.similarity) * w.similarity + clamp01(s.popularity) * w.popularity +
    clamp01(s.userPreference) * w.userPreference + clamp01(s.purchaseBehavior) * w.purchaseBehavior +
    clamp01(s.wishlist) * w.wishlist + clamp01(s.trending) * w.trending;
  return raw / total; // normalised to 0..1 even if weights don't sum to 1
}

export interface BookFeatures {
  id: string; gradeSlug?: string | null; levelSlug?: string | null;
  subjectSlugs: string[]; categorySlugs: string[]; authorId?: string | null;
  soldCount: number; ratingAvg: number;
}

const jaccard = (a: string[], b: string[]) => {
  if (!a.length && !b.length) return 0;
  const A = new Set(a), B = new Set(b);
  let inter = 0; A.forEach((x) => B.has(x) && inter++);
  return inter / (A.size + B.size - inter);
};

/** Content similarity between two books (0..1): subject, category, grade, level, author. */
export function similarity(a: BookFeatures, b: BookFeatures) {
  return clamp01(
    0.35 * jaccard(a.subjectSlugs, b.subjectSlugs) +
    0.2 * jaccard(a.categorySlugs, b.categorySlugs) +
    0.25 * (a.gradeSlug && a.gradeSlug === b.gradeSlug ? 1 : 0) +
    0.1 * (a.levelSlug && a.levelSlug === b.levelSlug ? 1 : 0) +
    0.1 * (a.authorId && a.authorId === b.authorId ? 1 : 0),
  );
}

export const popularity = (b: BookFeatures, maxSold: number) =>
  clamp01(0.7 * (maxSold > 0 ? b.soldCount / maxSold : 0) + 0.3 * (b.ratingAvg / 5));

export interface Profile {
  gradeSlug?: string | null; levelSlug?: string | null; subjectSlugs: string[];
  wishlistIds: string[]; purchasedIds: string[]; viewedIds: string[];
}

export function userPreference(b: BookFeatures, p: Profile) {
  return clamp01(
    0.4 * (p.gradeSlug && p.gradeSlug === b.gradeSlug ? 1 : 0) +
    0.2 * (p.levelSlug && p.levelSlug === b.levelSlug ? 1 : 0) +
    0.4 * jaccard(p.subjectSlugs, b.subjectSlugs),
  );
}

export function explain(b: BookFeatures, s: Signals, p?: Profile, seedTitle?: string): string[] {
  const r: string[] = [];
  if (seedTitle && s.similarity >= 0.4) r.push(`Mirip dengan "${seedTitle}"`);
  if (p?.gradeSlug && b.gradeSlug === p.gradeSlug) r.push("Cocok untuk jenjang yang kamu pilih");
  if (p && jaccard(p.subjectSlugs, b.subjectSlugs) > 0) r.push("Sesuai mata pelajaran favoritmu");
  if (s.wishlist > 0.3) r.push("Sejalan dengan buku di wishlist-mu");
  if (s.purchaseBehavior > 0.3) r.push("Melengkapi buku yang pernah kamu beli");
  if (s.popularity >= 0.6) r.push("Populer dan berating baik");
  if (s.trending > 0.5) r.push("Sedang banyak dilihat");
  return r.length ? r : ["Populer di katalog"];
}

export function rank(items: { id: string; signals: Signals; reasons: string[] }[], w = DEFAULT_WEIGHTS, limit = 8): Scored[] {
  return items
    .map((i) => ({ id: i.id, score: weightedScore(i.signals, w), reasons: i.reasons }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
