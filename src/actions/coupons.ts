"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, audit } from "@/lib/auth/session";
import { fromWibInput } from "@/lib/wib";
import { isValidCouponFormat, normalizeCouponCode } from "@/lib/pricing/engine";
import { getQuote } from "@/lib/pricing/service";
import type { Quote } from "@/lib/pricing/types";
import type { ActionState } from "@/types";

const SCOPES = ["ALL", "CATEGORY", "SUBJECT", "LEVEL", "GRADE", "BOOK"] as const;
const TABLE: Record<string, string> = { CATEGORY: "categories", SUBJECT: "subjects", LEVEL: "education_levels", GRADE: "grades", BOOK: "books" };
const uuid = z.string().uuid();
const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : v);

const schema = z.object({
  id: uuid.optional(),
  code: z.string().max(60),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().int().min(0).default(0),
  min_purchase: z.coerce.number().int().min(0).default(0),
  max_discount: z.coerce.number().int().min(1).optional(),
  usage_limit: z.coerce.number().int().min(1).optional(),
  per_user_limit: z.coerce.number().int().min(1).max(1000).default(1),
  scope_type: z.enum(SCOPES),
});

async function idsExist(table: string, ids: string[]) {
  if (!ids.length) return true;
  const { count } = await createSupabaseAdmin().from(table).select("id", { count: "exact", head: true }).in("id", ids);
  return count === ids.length;
}

export async function saveCoupon(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = schema.safeParse({
    id: num(fd.get("id")), code: fd.get("code") ?? "", type: fd.get("type"), value: num(fd.get("value")), min_purchase: num(fd.get("min_purchase")),
    max_discount: num(fd.get("max_discount")), usage_limit: num(fd.get("usage_limit")), per_user_limit: num(fd.get("per_user_limit")), scope_type: fd.get("scope_type") ?? "ALL",
  });
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const d = p.data;
  const errors: Record<string, string[]> = {};

  const code = normalizeCouponCode(d.code);
  if (!isValidCouponFormat(code)) errors.code = ["Kode 3–30 karakter: huruf, angka, tanda - atau _"];
  if (d.type === "PERCENT" && (d.value < 1 || d.value > 100)) errors.value = ["Persentase harus 1–100"];
  if (d.type === "FIXED" && d.value < 1) errors.value = ["Nominal harus lebih dari 0"];
  if (d.type !== "PERCENT" && d.max_discount) errors.max_discount = ["Batas maksimum hanya untuk kupon persen"];

  const startsAt = fromWibInput(fd.get("starts_at") as string), endsAt = fromWibInput(fd.get("ends_at") as string);
  if ((fd.get("starts_at") && !startsAt) || (fd.get("ends_at") && !endsAt)) errors.ends_at = ["Format tanggal tidak valid"];
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) errors.ends_at = ["Waktu berakhir harus setelah waktu mulai"];

  const scopeIds = fd.getAll("scope_ids").map(String).filter((x) => uuid.safeParse(x).success);
  const excludeIds = fd.getAll("exclude_book_ids").map(String).filter((x) => uuid.safeParse(x).success);
  if (d.scope_type !== "ALL" && !scopeIds.length) errors.scope_ids = ["Pilih minimal satu cakupan"];
  if (d.scope_type !== "ALL" && !(await idsExist(TABLE[d.scope_type], scopeIds))) errors.scope_ids = ["Sebagian cakupan tidak ditemukan"];
  if (!(await idsExist("books", excludeIds))) errors.exclude_book_ids = ["Sebagian buku pengecualian tidak ditemukan"];
  if (Object.keys(errors).length) return { ok: false, message: "Periksa kembali isian formulir.", errors };

  const db = createSupabaseAdmin();
  const row = {
    type: d.type, value: d.type === "FREE_SHIPPING" ? 0 : d.value, min_purchase: d.min_purchase,
    max_discount: d.type === "PERCENT" ? d.max_discount ?? null : null, usage_limit: d.usage_limit ?? null, per_user_limit: d.per_user_limit,
    scope_type: d.scope_type, scope_ids: d.scope_type === "ALL" ? [] : scopeIds, exclude_book_ids: excludeIds,
    starts_at: startsAt, ends_at: endsAt,
    stackable_with_promo: fd.get("stackable_with_promo") === "on", is_public: fd.get("is_public") === "on", active: fd.get("active") === "on",
    updated_at: new Date().toISOString(),
  };

  if (d.id) {
    const { data: cur } = await db.from("coupons").select("code, used_count").eq("id", d.id).single();
    if (!cur) return { ok: false, message: "Kupon tidak ditemukan." };
    if (cur.code !== code && cur.used_count > 0) return { ok: false, errors: { code: ["Kode tidak dapat diubah karena kupon sudah dipakai"] } };
    if (d.usage_limit && d.usage_limit < cur.used_count) return { ok: false, errors: { usage_limit: [`Kuota tidak boleh di bawah pemakaian saat ini (${cur.used_count})`] } };
    const { error } = await db.from("coupons").update({ ...row, code }).eq("id", d.id);
    if (error) return { ok: false, message: error.code === "23505" ? "Kode sudah dipakai kupon lain." : "Gagal menyimpan kupon." };
  } else {
    const { error } = await db.from("coupons").insert({ ...row, code });
    if (error) return { ok: false, message: error.code === "23505" ? "Kode sudah ada." : "Gagal menyimpan kupon." };
  }
  await audit(admin.id, d.id ? "coupon.update" : "coupon.create", "coupons", code, row);
  revalidatePath("/admin/coupons"); revalidatePath("/promo");
  return { ok: true, message: d.id ? "Kupon diperbarui. Pesanan lama tidak berubah." : "Kupon dibuat." };
}

export async function toggleCoupon(id: string, active: boolean) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return;
  await createSupabaseAdmin().from("coupons").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  await audit(admin.id, "coupon.toggle", "coupons", id, { active });
  revalidatePath("/admin/coupons"); revalidatePath("/promo");
}

/** Admin "what-if": runs the real pricing engine on a hypothetical cart. Writes nothing. */
export async function simulatePricing(items: { bookId: string; quantity: number }[], couponCode: string, shippingCost: number): Promise<{ ok: boolean; message?: string; quote?: Quote }> {
  const admin = await requireAdmin();
  const clean = items.filter((i) => uuid.safeParse(i.bookId).success && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity < 100).slice(0, 30);
  if (!clean.length) return { ok: false, message: "Pilih minimal satu buku." };
  const quote = await getQuote({ items: clean, shippingCost: Math.max(0, Math.trunc(shippingCost) || 0), couponCode: couponCode || null, userId: admin.id });
  return { ok: true, quote };
}