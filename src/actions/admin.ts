"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, audit } from "@/lib/auth/session";
import { bookSchema, stockSchema } from "@/schemas";
import { slugify, uniqueSlug } from "@/lib/utils";
import { validateUpload, IMAGE_RULE, PDF_RULE, randomName } from "@/lib/upload";
import { canTransition, ADMIN_SETTABLE, type OrderStatus } from "@/lib/order-state";
import { getPaymentProvider } from "@/lib/payments";
import { sendEmail } from "@/lib/email";
import type { ActionState } from "@/types";

const opt = (v: unknown) => (v === "" || v == null ? undefined : v);

export async function saveBook(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = (fd.get("id") as string) || null;
  const raw = Object.fromEntries(fd);
  for (const k of ["publication_year", "pages", "sale_price", "dimensions", "isbn", "author_id", "publisher_id", "education_level_id", "grade_id"]) raw[k] = opt(raw[k]) as never;
  raw.featured = fd.get("featured") === "on" ? "true" : "";
  const p = bookSchema.safeParse(raw);
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors, message: "Periksa kembali isian formulir." };
  const db = createSupabaseAdmin();
  const d = p.data;

  let cover_url: string | undefined;
  const cover = fd.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const v = await validateUpload(cover, IMAGE_RULE);
    if (!v.ok) return { ok: false, errors: { cover: [v.error] } };
    const path = randomName(v.ext);
    const { error } = await db.storage.from("covers").upload(path, cover, { contentType: cover.type });
    if (error) return { ok: false, message: "Upload sampul gagal." };
    cover_url = db.storage.from("covers").getPublicUrl(path).data.publicUrl;
  }

  const row = {
    title: d.title, isbn: d.isbn || null, description: d.description,
    author_id: d.author_id || null, publisher_id: d.publisher_id || null,
    publication_year: d.publication_year ?? null, pages: d.pages ?? null, language: d.language, format: d.format,
    weight_gram: d.weight_gram, dimensions: d.dimensions ?? null, price: d.price, sale_price: d.sale_price ?? null,
    education_level_id: d.education_level_id || null, grade_id: d.grade_id || null,
    keywords: (d.keywords ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    status: d.status, featured: d.featured, ...(cover_url ? { cover_url } : {}),
  };

  let bookId = id;
  if (id) {
    const { data: before } = await db.from("books").select("price, sale_price").eq("id", id).single();
    const { error } = await db.from("books").update(row).eq("id", id);
    if (error) return { ok: false, message: error.code === "23505" ? "ISBN sudah dipakai buku lain." : "Gagal menyimpan." };
    if (before && (before.price !== row.price || before.sale_price !== row.sale_price)) await audit(admin.id, "book.price_change", "books", id, { before, after: { price: row.price, sale_price: row.sale_price } });
    await audit(admin.id, "book.update", "books", id);
  } else {
    const slug = await uniqueSlug(d.title, async (s) => !!(await db.from("books").select("id").eq("slug", s).maybeSingle()).data);
    const { data, error } = await db.from("books").insert({ ...row, slug }).select("id").single();
    if (error) return { ok: false, message: error.code === "23505" ? "ISBN sudah terdaftar." : "Gagal membuat buku." };
    bookId = data.id;
    if (d.stock > 0) await db.rpc("adjust_stock", { p_book: bookId, p_delta: d.stock, p_type: "restock", p_actor: admin.id, p_note: "stok awal" });
    await audit(admin.id, "book.create", "books", bookId!);
  }

  // taxonomy links
  const subjects = fd.getAll("subjects").map(String).filter(Boolean);
  const categories = fd.getAll("categories").map(String).filter(Boolean);
  await db.from("book_subjects").delete().eq("book_id", bookId!);
  await db.from("book_categories").delete().eq("book_id", bookId!);
  if (subjects.length) await db.from("book_subjects").insert(subjects.map((s) => ({ book_id: bookId!, subject_id: s })));
  if (categories.length) await db.from("book_categories").insert(categories.map((c) => ({ book_id: bookId!, category_id: c })));

  // digital file (private bucket)
  const file = fd.get("digital_file");
  if (file instanceof File && file.size > 0) {
    const v = await validateUpload(file, PDF_RULE);
    if (!v.ok) return { ok: false, errors: { digital_file: [v.error] } };
    const path = `${bookId}/${randomName("pdf")}`;
    const { error } = await db.storage.from("digital").upload(path, file, { contentType: "application/pdf" });
    if (error) return { ok: false, message: "Upload file digital gagal." };
    await db.from("digital_products").upsert({ book_id: bookId!, storage_path: path, file_size: file.size });
  }

  revalidatePath("/books"); revalidatePath("/admin/books");
  redirect("/admin/books");
}

export async function adjustStock(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = stockSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const db = createSupabaseAdmin();
  const { error } = await db.rpc("adjust_stock", { p_book: p.data.book_id, p_delta: p.data.delta, p_type: p.data.type, p_actor: admin.id, p_note: p.data.note ?? null });
  if (error) return { ok: false, message: /STOCK_BELOW_RESERVED/.test(error.message) ? "Stok tidak boleh di bawah jumlah yang sedang direservasi." : "Gagal mengubah stok." };
  await audit(admin.id, "inventory.adjust", "inventory", p.data.book_id, p.data);
  revalidatePath("/admin/inventory");
  return { ok: true, message: "Stok diperbarui." };
}

export async function updateOrderStatus(orderId: string, to: OrderStatus, tracking?: string) {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(orderId).success || !ADMIN_SETTABLE.includes(to)) return { ok: false, message: "Status tidak valid." };
  const db = createSupabaseAdmin();
  const { data: o } = await db.from("orders").select("status, user_id, order_number, total").eq("id", orderId).single();
  if (!o) return { ok: false, message: "Order tidak ditemukan." };
  const from = o.status as OrderStatus;
  if (!canTransition(from, to)) return { ok: false, message: `Tidak bisa dari ${from} ke ${to}.` };
  if (to === "SHIPPED" && !tracking?.trim()) return { ok: false, message: "Nomor resi wajib diisi." };

  if (to === "CANCELLED" || to === "REFUNDED") {
    if (from === "PENDING_PAYMENT") {
      const { data: ok } = await db.rpc("cancel_pending_order", { p_order: orderId, p_actor: admin.id, p_note: "dibatalkan admin" });
      if (!ok) return { ok: false, message: "Gagal membatalkan." };
    } else {
      // money first: refund at the gateway, then reverse inventory/entitlements atomically in SQL
      const { data: pay } = await db.from("payments").select("provider, status").eq("order_id", orderId).eq("status", "PAID").maybeSingle();
      if (pay) {
        try { await getPaymentProvider().refundPayment(orderId, o.total); }
        catch (e) { console.error("[refund]", e); return { ok: false, message: e instanceof Error ? e.message : "Refund ke penyedia pembayaran gagal." }; }
      }
      const { data: ok, error } = await db.rpc("reverse_paid_order", { p_order: orderId, p_actor: admin.id, p_new: to, p_note: to === "REFUNDED" ? "refund oleh admin" : "dibatalkan admin & dana dikembalikan" });
      if (error || !ok) return { ok: false, message: "Refund tercatat di gateway, tetapi pembaruan sistem gagal. Periksa manual." };
    }
  } else {
    const { error } = await db.from("orders").update({ status: to }).eq("id", orderId).eq("status", from); // optimistic guard
    if (error) return { ok: false, message: "Gagal memperbarui." };
    if (to === "SHIPPED") await db.from("shipments").upsert({ order_id: orderId, tracking_number: tracking!.trim().slice(0, 60), shipped_at: new Date().toISOString() });
    if (to === "DELIVERED") await db.from("shipments").update({ delivered_at: new Date().toISOString() }).eq("order_id", orderId);
    await db.from("order_events").insert({ order_id: orderId, from_status: from, to_status: to, actor_id: admin.id });
    await db.from("notifications").insert({ user_id: o.user_id, type: to === "SHIPPED" ? "shipping" : "order", title: `Pesanan ${o.order_number}: ${to}`, link: `/orders/${orderId}` });
    const { data: u } = await db.auth.admin.getUserById(o.user_id);
    if (u.user?.email) {
      if (to === "SHIPPED") await sendEmail(u.user.email, "order_shipped", { order: o.order_number, tracking: tracking!.trim() });
      if (to === "COMPLETED") await sendEmail(u.user.email, "order_completed", { order: o.order_number });
    }
  }
  await audit(admin.id, "order.status", "orders", orderId, { from, to });
  revalidatePath("/admin/orders");
  return { ok: true, message: "Status diperbarui." };
}

export async function moderateReview(id: string, status: "APPROVED" | "HIDDEN" | "DELETE") {
  const admin = await requireAdmin();
  const db = createSupabaseAdmin();
  if (status === "DELETE") await db.from("reviews").delete().eq("id", id);
  else await db.from("reviews").update({ status }).eq("id", id);
  await audit(admin.id, `review.${status.toLowerCase()}`, "reviews", id);
  revalidatePath("/admin/reviews");
}

export async function saveCoupon(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const s = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/), type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
    value: z.coerce.number().int().min(0), min_purchase: z.coerce.number().int().min(0).default(0),
    usage_limit: z.coerce.number().int().min(1).optional(), per_user_limit: z.coerce.number().int().min(1).default(1),
    ends_at: z.string().optional(),
  }).refine((d) => d.type !== "PERCENT" || d.value <= 100, { message: "Persen maksimal 100", path: ["value"] }).safeParse(Object.fromEntries(Array.from(fd).map(([k, v]) => [k, v === "" ? undefined : v])));
  if (!s.success) return { ok: false, errors: s.error.flatten().fieldErrors };
  const { error } = await createSupabaseAdmin().from("coupons").insert({ ...s.data, ends_at: s.data.ends_at ? new Date(s.data.ends_at).toISOString() : null });
  if (error) return { ok: false, message: error.code === "23505" ? "Kode sudah ada." : "Gagal menyimpan." };
  await audit(admin.id, "coupon.create", "coupons", s.data.code);
  revalidatePath("/admin/coupons");
  return { ok: true, message: "Kupon dibuat." };
}

const TAXO = ["categories", "subjects", "grades", "authors", "publishers"] as const;
export async function addTaxonomy(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const table = String(fd.get("table"));
  const name = String(fd.get("name") ?? "").trim();
  if (!(TAXO as readonly string[]).includes(table) || name.length < 2) return { ok: false, message: "Data tidak valid." };
  const db = createSupabaseAdmin();
  const slug = await uniqueSlug(name, async (s) => !!(await db.from(table).select("id").eq("slug", s).maybeSingle()).data);
  const { error } = await db.from(table).insert({ name, slug });
  if (error) return { ok: false, message: "Gagal menyimpan." };
  await audit(admin.id, `${table}.create`, table, slug);
  revalidatePath(`/admin/${table}`);
  return { ok: true, message: "Tersimpan." };
}

export async function saveArticle(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const s = z.object({ title: z.string().trim().min(5).max(160), excerpt: z.string().trim().max(300).optional(), content: z.string().trim().min(30), category: z.string().trim().max(40).optional(), status: z.enum(["DRAFT", "PUBLISHED"]), seo_title: z.string().max(70).optional(), seo_description: z.string().max(170).optional() }).safeParse(Object.fromEntries(fd));
  if (!s.success) return { ok: false, errors: s.error.flatten().fieldErrors };
  const db = createSupabaseAdmin();
  const slug = await uniqueSlug(s.data.title, async (x) => !!(await db.from("articles").select("id").eq("slug", x).maybeSingle()).data);
  const { error } = await db.from("articles").insert({ ...s.data, slug, author_name: admin.full_name, published_at: s.data.status === "PUBLISHED" ? new Date().toISOString() : null });
  if (error) return { ok: false, message: "Gagal menyimpan artikel." };
  await audit(admin.id, "article.create", "articles", slug);
  revalidatePath("/articles"); revalidatePath("/admin/articles");
  return { ok: true, message: "Artikel tersimpan." };
}
