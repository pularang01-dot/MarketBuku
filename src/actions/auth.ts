"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loginSchema, registerSchema, forgotSchema, resetSchema } from "@/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { describeAuthError } from "@/lib/auth/errors";
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
  if (error) {
    if (/not confirmed/i.test(error.message)) return { ok: false, message: "Email belum dikonfirmasi. Buka email konfirmasi dari kami, atau kirim ulang tautannya." };
    return { ok: false, message: "Email atau kata sandi salah." };
  }
  await mergeGuestCart();
  redirect(safeNext(fd.get("next")));
}

export async function register(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit(`register:${await ip()}`, 5, 60_000))) return { ok: false, message: "Terlalu banyak percobaan." };
  const p = registerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const site = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: p.data.email, password: p.data.password,
    options: { data: { full_name: p.data.full_name }, emailRedirectTo: `${site}/auth/confirm` },
  });
  if (error) return { ok: false, message: describeAuthError(error, "register") };
  await sendEmail(p.data.email, "registration", { name: p.data.full_name });
  if (!data.session) return { ok: true, message: "CONFIRM_EMAIL" }; // UI shows the "Cek emailmu" panel
  await mergeGuestCart();
  redirect("/account/preferences");
}

export async function resendConfirmation(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit(`resend:${await ip()}`, 3, 60_000))) return { ok: false, message: "Terlalu banyak permintaan. Tunggu satu menit." };
  const p = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resend({ type: "signup", email: p.data.email, options: { emailRedirectTo: `${await getSiteUrl()}/auth/confirm` } });
  if (error) return { ok: false, message: describeAuthError(error, "resend") };
  return { ok: true, message: "Jika email terdaftar dan belum dikonfirmasi, tautan baru sudah dikirim. Periksa juga folder spam." }; // same answer either way
}

export async function forgotPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit(`forgot:${await ip()}`, 3, 60_000))) return { ok: false, message: "Terlalu banyak percobaan." };
  const p = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(p.data.email, { redirectTo: `${await getSiteUrl()}/auth/confirm?next=/reset-password` });
  if (error) return { ok: false, message: describeAuthError(error, "reset") }; // an unknown email does NOT raise an error, so this does not leak which emails exist
  return { ok: true, message: "Jika email terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Periksa juga folder spam." }; // same answer either way
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = resetSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: p.data.password });
  if (error) return { ok: false, message: "Tautan reset kedaluwarsa. Minta tautan baru." };
  redirect("/account?sandi=diubah");
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}