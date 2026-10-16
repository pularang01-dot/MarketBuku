"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, audit } from "@/lib/auth/session";
import { uniqueSlug } from "@/lib/utils";
import { fromWibInput } from "@/lib/wib";
import type { ActionState } from "@/types";

const SCOPES = ["ALL", "CATEGORY", "SUBJECT", "LEVEL", "GRADE", "BOOK"] as const;
const TABLE: Record<string, string> = { CATEGORY: "categories", SUBJECT: "subjects", LEVEL: "education_levels", GRADE: "grades", BOOK: "books" };
const uuid = z.string().uuid();

async function scopeExists(type: string, ids: string[]) {
  if (type === "ALL") return ids.length === 0;
  if (!ids.length) return false;
  const { count } = await createSupabaseAdmin().from(TABLE[type]).select("id", { count: "exact", head: true }).in("id", ids);
  return count === ids.length;
}

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : v);

const schema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(120),
  description: z.string().trim().max(500).optional(),
  benefit_type: z.enum(["NONE", "PERCENT", "FIXED"]),
  benefit_value: z.coerce.number().int().min(0).max(100_000_000).default(0),
  max_discount: z.coerce.number().int().min(1).optional(),
  min_purchase: z.coerce.number().int().min(0).default(0),
  scope_type: z.enum(SCOPES),
  priority: z.coerce.number().int().min(-100).max(100).default(0),
});

/** Create or update an automatic promotion. Rows without a benefit remain plain banners. */
export async function savePromotion(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = schema.safeParse({
    id: num(fd.get("id")), title: fd.get("title"), description: num(fd.get("description")), benefit_type: fd.get("benefit_type") ?? "NONE",
    benefit_value: num(fd.get("benefit_value")), max_discount: num(fd.get("max_discount")), min_purchase: num(fd.get("min_purchase")),
    scope_type: fd.get("scope_type") ?? "ALL", priority: num(fd.get("priority")),
  });
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const d = p.data;
  const errors: Record<string, string[]> = {};
  if (d.benefit_type !== "NONE" && d.benefit_value < 1) errors.benefit_value = ["Nilai diskon harus lebih dari 0"];
  if (d.benefit_type === "PERCENT" && d.benefit_value > 100) errors.benefit_value = ["Persentase maksimal 100"];
  if (d.benefit_type !== "PERCENT" && d.max_discount) errors.max_discount = ["Batas maksimum hanya untuk diskon persen"];

  const startsAt = fromWibInput(fd.get("starts_at") as string), endsAt = fromWibInput(fd.get("ends_at") as string);
  if ((fd.get("starts_at") && !startsAt) || (fd.get("ends_at") && !endsAt)) errors.ends_at = ["Format tanggal tidak valid"];
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) errors.ends_at = ["Waktu berakhir harus setelah waktu mulai"];

  const scopeIds = fd.getAll("scope_ids").map(String).filter((x) => uuid.safeParse(x).success);
  if (d.scope_type !== "ALL" && !scopeIds.length) errors.scope_ids = ["Pilih minimal satu cakupan"];
  if (!Object.keys(errors).length && !(await scopeExists(d.scope_type, d.scope_type === "ALL" ? [] : scopeIds))) errors.scope_ids = ["Sebagian cakupan tidak ditemukan"];
  if (Object.keys(errors).length) return { ok: false, message: "Periksa kembali isian formulir.", errors };

  const db = createSupabaseAdmin();
  const row = {
    title: d.title, description: d.description ?? null,
    benefit_type: d.benefit_type === "NONE" ? null : d.benefit_type, benefit_value: d.benefit_type === "NONE" ? 0 : d.benefit_value,
    max_discount: d.benefit_type === "PERCENT" ? d.max_discount ?? null : null, min_purchase: d.min_purchase,
    scope_type: d.scope_type, scope_ids: d.scope_type === "ALL" ? [] : scopeIds, priority: d.priority,
    stackable_with_coupon: fd.get("stackable_with_coupon") === "on", active: fd.get("active") === "on",
    starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString(),
  };
  if (d.id) {
    const { error } = await db.from("promotions").update(row).eq("id", d.id);
    if (error) return { ok: false, message: "Gagal menyimpan promosi." };
  } else {
    const slug = await uniqueSlug(d.title, async (s) => !!(await db.from("promotions").select("id").eq("slug", s).maybeSingle()).data);
    const { error } = await db.from("promotions").insert({ ...row, slug });
    if (error) return { ok: false, message: "Gagal menyimpan promosi." };
  }
  await audit(admin.id, d.id ? "promotion.update" : "promotion.create", "promotions", d.id ?? d.title, row);
  revalidatePath("/admin/promotions"); revalidatePath("/promo"); revalidatePath("/", "layout");
  return { ok: true, message: d.id ? "Promosi diperbarui. Berlaku untuk perhitungan berikutnya; pesanan lama tidak berubah." : "Promosi dibuat." };
}

export async function togglePromotion(id: string, active: boolean) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return;
  await createSupabaseAdmin().from("promotions").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  await audit(admin.id, "promotion.toggle", "promotions", id, { active });
  revalidatePath("/admin/promotions"); revalidatePath("/promo"); revalidatePath("/", "layout");
}

/** Only unused promotions can be deleted; used ones must be deactivated so order history stays explainable. */
export async function deletePromotion(id: string) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return { ok: false, message: "Data tidak valid." };
  const db = createSupabaseAdmin();
  const { count } = await db.from("order_items").select("id", { count: "exact", head: true }).eq("promo_id", id);
  if ((count ?? 0) > 0) return { ok: false, message: "Promosi ini sudah dipakai pesanan. Nonaktifkan saja agar riwayat tetap utuh." };
  await db.from("promotions").delete().eq("id", id);
  await audit(admin.id, "promotion.delete", "promotions", id);
  revalidatePath("/admin/promotions"); revalidatePath("/promo");
  return { ok: true, message: "Promosi dihapus." };
}