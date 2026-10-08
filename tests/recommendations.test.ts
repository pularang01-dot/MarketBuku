import { describe, it, expect } from "vitest";
import { weightedScore, DEFAULT_WEIGHTS, similarity, popularity, rank, type BookFeatures } from "../src/lib/recommendations/scoring";

const f = (o: Partial<BookFeatures>): BookFeatures => ({ id: "x", gradeSlug: "kelas-5", levelSlug: "sd", subjectSlugs: ["matematika"], categorySlugs: ["buku-pelajaran"], authorId: "a", soldCount: 10, ratingAvg: 4, ...o });

describe("recommendation scoring", () => {
  it("default weights sum to 1", () => { expect(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1); });
  it("score is within 0..1 and normalised for custom weights", () => {
    const s = { similarity: 1, popularity: 1, userPreference: 1, purchaseBehavior: 1, wishlist: 1, trending: 1 };
    expect(weightedScore(s)).toBeCloseTo(1);
    expect(weightedScore(s, { similarity: 2, popularity: 2, userPreference: 2, purchaseBehavior: 2, wishlist: 2, trending: 2 })).toBeCloseTo(1);
    expect(weightedScore({ ...s, similarity: 5, popularity: -3 })).toBeLessThanOrEqual(1);
  });
  it("identical books are maximally similar; different ones are not", () => {
    expect(similarity(f({}), f({}))).toBeCloseTo(1);
    expect(similarity(f({}), f({ gradeSlug: "kelas-9", levelSlug: "smp", subjectSlugs: ["fisika"], categorySlugs: ["latihan-soal"], authorId: "b" }))).toBe(0);
  });
  it("popularity grows with sales and rating", () => { expect(popularity(f({ soldCount: 100 }), 100)).toBeGreaterThan(popularity(f({ soldCount: 10 }), 100)); });
  it("rank orders by score and respects limit", () => {
    const sig = (v: number) => ({ similarity: v, popularity: v, userPreference: v, purchaseBehavior: v, wishlist: v, trending: v });
    const r = rank([{ id: "a", signals: sig(0.2), reasons: [] }, { id: "b", signals: sig(0.9), reasons: [] }, { id: "c", signals: sig(0.5), reasons: [] }], DEFAULT_WEIGHTS, 2);
    expect(r.map((x) => x.id)).toEqual(["b", "c"]);
  });
});
