"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, audit } from "@/lib/auth/session";
import { uniqueSlug } from "@/lib/utils";
import { validateUpload, IMAGE_RULE, randomName } from "@/lib/upload";
import type { ActionState } from "@/types";

const blank = (fd: FormData) => Object.fromEntries(Array.from(fd).map(([k, v]) => [k, v === "" ? undefined : v]));
const TAXO = ["categories", "subjects", "grades", "authors", "publishers"];

/* ---------- promotions ---------- */
export async function savePromotion(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(3).max(120), description: z.string().max(500).optional(), starts_at: z.string().optional(), ends_at: z.string().optional(), active: z.string().optional() }).safeParse(blank(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const db = createSupabaseAdmin();
  const row = { title: p.data.title, description: p.data.description ?? null, starts_at: p.data.starts_at ? new Date(p.data.starts_at).toISOString() : null, ends_at: p.data.ends_at ? new Date(p.data.ends_at).toISOString() : null, active: p.data.active === "on" };
  if (p.data.id) await db.from("promotions").update(row).eq("id", p.data.id);
  else { const slug = await uniqueSlug(p.data.title, async (s) => !!(await db.from("promotions").select("id").eq("slug", s).maybeSingle()).data); await db.from("promotions").insert({ ...row, slug }); }
  await audit(admin.id, p.data.id ? "promotion.update" : "promotion.create", "promotions", p.data.id ?? p.data.title);
  revalidatePath("/admin/promotions"); revalidatePath("/promo");
  return { ok: true, message: "Promo tersimpan." };
}
export async function deletePromotion(id: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await createSupabaseAdmin().from("promotions").delete().eq("id", id);
  await audit(admin.id, "promotion.delete", "promotions", id);
  revalidatePath("/admin/promotions"); revalidatePath("/promo");
}

/* ---------- bundles ---------- */
export async function saveBundle(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(3).max(120), description: z.string().max(500).optional(), price: z.coerce.number().int().min(0), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) }).safeParse(blank(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const ids = fd.getAll("books").map(String).filter((x) => z.string().uuid().safeParse(x).success);
  if (ids.length < 2) return { ok: false, message: "Pilih minimal 2 buku untuk sebuah paket." };
  const db = createSupabaseAdmin();
  const { data: bks } = await db.from("books").select("id, price, sale_price").in("id", ids);
  const normal = (bks ?? []).reduce((s, b) => s + (b.sale_price ?? b.price), 0);
  if (p.data.price > normal) return { ok: false, errors: { price: [`Harga paket (${p.data.price}) melebihi total harga buku (${normal}). Paket harus lebih hemat.`] } };
  let id = p.data.id;
  const row = { title: p.data.title, description: p.data.description ?? null, price: p.data.price, status: p.data.status };
  if (id) await db.from("bundles").update(row).eq("id", id);
  else {
    const slug = await uniqueSlug(p.data.title, async (s) => !!(await db.from("bundles").select("id").eq("slug", s).maybeSingle()).data);
    const { data, error } = await db.from("bundles").insert({ ...row, slug }).select("id").single();
    if (error) return { ok: false, message: "Gagal membuat paket." };
    id = data.id;
  }
  await db.from("bundle_items").delete().eq("bundle_id", id!);
  await db.from("bundle_items").insert(ids.map((b) => ({ bundle_id: id!, book_id: b, quantity: 1 })));
  await audit(admin.id, p.data.id ? "bundle.update" : "bundle.create", "bundles", id!);
  revalidatePath("/admin/bundles"); revalidatePath("/bundles");
  return { ok: true, message: "Paket tersimpan." };
}
export async function deleteBundle(id: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await createSupabaseAdmin().from("bundles").delete().eq("id", id);
  await audit(admin.id, "bundle.delete", "bundles", id);
  revalidatePath("/admin/bundles"); revalidatePath("/bundles");
}

/* ---------- settings ---------- */
const SETTING_KEYS = ["store_name", "support_email", "support_whatsapp", "announcement", "low_stock_default"] as const;
export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = createSupabaseAdmin();
  const rows = SETTING_KEYS.map((k) => ({ key: k, value: String(fd.get(k) ?? "").slice(0, 300) }));
  const { error } = await db.from("site_settings").upsert(rows);
  if (error) return { ok: false, message: "Gagal menyimpan." };
  await audit(admin.id, "settings.update", "site_settings", undefined, Object.fromEntries(rows.map((r) => [r.key, r.value])));
  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan disimpan." };
}

/* ---------- coupons ---------- */
export async function toggleCoupon(id: string, active: boolean) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await createSupabaseAdmin().from("coupons").update({ active }).eq("id", id);
  await audit(admin.id, "coupon.toggle", "coupons", id, { active });
  revalidatePath("/admin/coupons");
}

/* ---------- taxonomy ---------- */
export async function renameTaxonomy(table: string, id: string, name: string) {
  const admin = await requireAdmin();
  if (!TAXO.includes(table) || !z.string().uuid().safeParse(id).success || name.trim().length < 2) return { ok: false, message: "Data tidak valid." };
  const { error } = await createSupabaseAdmin().from(table).update({ name: name.trim() }).eq("id", id);
  if (error) return { ok: false, message: "Gagal mengubah." };
  await audit(admin.id, `${table}.rename`, table, id);
  revalidatePath(`/admin/${table}`);
  return { ok: true };
}
export async function deleteTaxonomy(table: string, id: string) {
  const admin = await requireAdmin();
  if (!TAXO.includes(table) || !z.string().uuid().safeParse(id).success) return { ok: false, message: "Data tidak valid." };
  const { error } = await createSupabaseAdmin().from(table).delete().eq("id", id);
  if (error) return { ok: false, message: error.code === "23503" ? "Masih dipakai oleh buku/data lain, tidak bisa dihapus." : "Gagal menghapus." };
  await audit(admin.id, `${table}.delete`, table, id);
  revalidatePath(`/admin/${table}`);
  return { ok: true };
}

/* ---------- articles ---------- */
export async function updateArticle(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const s = z.object({ id: z.string().uuid(), title: z.string().trim().min(5).max(160), excerpt: z.string().trim().max(300).optional(), content: z.string().trim().min(30), category: z.string().trim().max(40).optional(), status: z.enum(["DRAFT", "PUBLISHED"]), seo_title: z.string().max(70).optional(), seo_description: z.string().max(170).optional() }).safeParse(blank(fd));
  if (!s.success) return { ok: false, errors: s.error.flatten().fieldErrors };
  const db = createSupabaseAdmin();
  const related = fd.getAll("related").map(String).filter((x) => z.string().uuid().safeParse(x).success).slice(0, 6);
  const { data: cur } = await db.from("articles").select("published_at").eq("id", s.data.id).single();
  const { id, ...rest } = s.data;
  const { error } = await db.from("articles").update({ ...rest, related_book_ids: related, published_at: rest.status === "PUBLISHED" ? cur?.published_at ?? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, message: "Gagal menyimpan." };
  const cover = fd.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const v = await validateUpload(cover, IMAGE_RULE);
    if (!v.ok) return { ok: false, errors: { cover: [v.error] } };
    const path = randomName(v.ext);
    const up = await db.storage.from("articles").upload(path, cover, { contentType: cover.type });
    if (!up.error) await db.from("articles").update({ cover_url: db.storage.from("articles").getPublicUrl(path).data.publicUrl }).eq("id", id);
  }
  await audit(admin.id, "article.update", "articles", id);
  revalidatePath("/articles"); revalidatePath("/admin/articles");
  return { ok: true, message: "Artikel diperbarui." };
}
export async function deleteArticle(id: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await createSupabaseAdmin().from("articles").delete().eq("id", id);
  await audit(admin.id, "article.delete", "articles", id);
  revalidatePath("/admin/articles"); revalidatePath("/articles");
}

/* ---------- books: gallery + archive ---------- */
export async function addGalleryImages(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("book_id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Buku tidak valid." };
  const db = createSupabaseAdmin();
  const { data: b } = await db.from("books").select("gallery").eq("id", id).single();
  const gallery: string[] = [...(b?.gallery ?? [])];
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (gallery.length + files.length > 8) return { ok: false, message: "Maksimal 8 gambar galeri." };
  for (const f of files) {
    const v = await validateUpload(f, IMAGE_RULE);
    if (!v.ok) return { ok: false, message: v.error };
    const path = `gallery/${id}/${randomName(v.ext)}`;
    const up = await db.storage.from("covers").upload(path, f, { contentType: f.type });
    if (up.error) return { ok: false, message: "Upload gagal." };
    gallery.push(db.storage.from("covers").getPublicUrl(path).data.publicUrl);
  }
  await db.from("books").update({ gallery }).eq("id", id);
  await audit(admin.id, "book.gallery_add", "books", id);
  revalidatePath(`/admin/books/${id}`);
  return { ok: true, message: `${files.length} gambar ditambahkan.` };
}
export async function removeGalleryImage(bookId: string, url: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(bookId).success) return;
  const db = createSupabaseAdmin();
  const { data: b } = await db.from("books").select("gallery").eq("id", bookId).single();
  await db.from("books").update({ gallery: (b?.gallery ?? []).filter((g: string) => g !== url) }).eq("id", bookId);
  await audit(admin.id, "book.gallery_remove", "books", bookId);
  revalidatePath(`/admin/books/${bookId}`);
}
export async function archiveBook(id: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await createSupabaseAdmin().from("books").update({ status: "ARCHIVED", featured: false }).eq("id", id); // never hard-delete: order history references books
  await audit(admin.id, "book.archive", "books", id);
  revalidatePath("/admin/books"); revalidatePath("/books");
}