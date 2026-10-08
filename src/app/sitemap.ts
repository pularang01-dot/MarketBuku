import type { MetadataRoute } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createSupabaseAdmin();
  const [books, articles, bundles] = await Promise.all([
    db.from("books").select("slug, updated_at").eq("status", "PUBLISHED"),
    db.from("articles").select("slug, updated_at").eq("status", "PUBLISHED"),
    db.from("bundles").select("slug").eq("status", "PUBLISHED"),
  ]);
  const fixed = ["", "/books", "/promo", "/bundles", "/book-finder", "/articles"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "daily" as const }));
  return [
    ...fixed,
    ...(books.data ?? []).map((b) => ({ url: `${SITE_URL}/books/${b.slug}`, lastModified: b.updated_at })),
    ...(articles.data ?? []).map((a) => ({ url: `${SITE_URL}/articles/${a.slug}`, lastModified: a.updated_at })),
    ...(bundles.data ?? []).map((b) => ({ url: `${SITE_URL}/bundles/${b.slug}` })),
  ];
}
