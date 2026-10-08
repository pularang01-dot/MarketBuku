export interface BookRow {
  id: string; title: string; slug: string; isbn: string | null; description: string;
  price: number; sale_price: number | null; cover_url: string | null; gallery: string[];
  format: "PRINT" | "EBOOK" | "MODULE"; pages: number | null; publication_year: number | null;
  language: string; weight_gram: number; dimensions: string | null; rating_avg: number; rating_count: number;
  sold_count: number; featured: boolean; status: string; keywords: string[]; topics: string[]; audience: string | null;
  created_at: string; grade_id: string | null; education_level_id: string | null;
  author?: { name: string; slug: string } | null;
  publisher?: { name: string; slug: string } | null;
  grade?: { name: string; slug: string } | null;
  level?: { name: string; slug: string } | null;
  inventory?: { stock: number; reserved: number } | { stock: number; reserved: number }[] | null;
}
export type ActionState = { ok: boolean; message?: string; errors?: Record<string, string[]> } | null;

export const BOOK_SELECT =
  "*, author:authors(name,slug), publisher:publishers(name,slug), grade:grades(name,slug), level:education_levels(name,slug), inventory(stock,reserved)";
