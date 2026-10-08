export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/** Make slug unique by appending -2, -3 ... given an existence check. */
export async function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>) {
  const root = slugify(base) || "item";
  let slug = root;
  let i = 2;
  while (await exists(slug)) slug = `${root}-${i++}`;
  return slug;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Strip characters that are special inside PostgREST ilike/or filters. */
export function sanitizeSearch(q: string) {
  return q.replace(/[%_,()\\*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function jsonLd(data: unknown) {
  // prevent </script> injection inside JSON-LD
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
