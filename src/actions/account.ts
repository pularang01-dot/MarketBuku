"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { addressSchema } from "@/schemas";
import type { ActionState } from "@/types";

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser(); if (!user) return { ok: false, message: "Silakan masuk." };
  const name = String(fd.get("full_name") ?? "").trim(); const phone = String(fd.get("phone") ?? "").trim();
  if (name.length < 2) return { ok: false, errors: { full_name: ["Nama minimal 2 karakter"] } };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("profiles").update({ full_name: name, phone: phone || null }).eq("id", user.id);
  revalidatePath("/account");
  return error ? { ok: false, message: "Gagal menyimpan." } : { ok: true, message: "Profil diperbarui." };
}

export async function savePreferences(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser(); if (!user) return { ok: false, message: "Silakan masuk." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: user.id, education_level_slug: String(fd.get("level") ?? "") || null, grade_slug: String(fd.get("grade") ?? "") || null,
    subject_slugs: fd.getAll("subjects").map(String), updated_at: new Date().toISOString(),
  });
  revalidatePath("/");
  return error ? { ok: false, message: "Gagal menyimpan." } : { ok: true, message: "Preferensi disimpan." };
}

export async function addAddress(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser(); if (!user) return { ok: false, message: "Silakan masuk." };
  const p = addressSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("addresses").insert({ ...p.data, user_id: user.id, is_default: fd.get("is_default") === "on" });
  revalidatePath("/account/addresses");
  return error ? { ok: false, message: "Gagal menyimpan alamat." } : { ok: true, message: "Alamat ditambahkan." };
}

export async function deleteAddress(id: string) {
  const user = await getUser(); if (!user) return;
  const supabase = await createSupabaseServer();
  await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/addresses");
}
