"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loginSchema, registerSchema, forgotSchema, resetSchema } from "@/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { mergeGuestCart } from "./cart";
import { sendEmail } from "@/lib/email";
import type { ActionState } from "@/types";

const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
const safeNext = (n: FormDataEntryValue | null) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit(`login:${await ip()}`, 10, 60_000))) return { ok: false, message: "Terlalu banyak percobaan. Coba lagi sebentar." };
  const p = loginSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  if (error) return { ok: false, message: "Email atau kata sandi salah." };
  await mergeGuestCart();
  redirect(safeNext(fd.get("next")));
}

export async function register(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit(`register:${await ip()}`, 5, 60_000))) return { ok: false, message: "Terlalu banyak percobaan." };
  const p = registerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: p.data.email, password: p.data.password,
    options: { data: { full_name: p.data.full_name }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login` },
  });
  if (error) return { ok: false, message: "Pendaftaran gagal. Email mungkin sudah terdaftar." };
  await sendEmail(p.data.email, "registration", { name: p.data.full_name });
  if (!data.session) return { ok: true, message: "Cek email kamu untuk konfirmasi akun, lalu masuk." };
  await mergeGuestCart();
  redirect("/account/preferences");
}

export async function forgotPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit(`forgot:${await ip()}`, 3, 60_000))) return { ok: false, message: "Terlalu banyak percobaan." };
  const p = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  await supabase.auth.resetPasswordForEmail(p.data.email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password` });
  return { ok: true, message: "Jika email terdaftar, tautan reset sudah dikirim." }; // same answer either way
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = resetSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: p.data.password });
  if (error) return { ok: false, message: "Tautan reset kedaluwarsa. Minta tautan baru." };
  redirect("/account");
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
