import "server-only";
import type { AuthError } from "@supabase/supabase-js";

export type AuthContext = "register" | "reset" | "resend";

/**
 * Turns a Supabase auth error into a clear Indonesian message and logs the real cause on the server
 * (see your terminal / Vercel logs). In development the raw code is appended to ease debugging.
 */
export function describeAuthError(e: AuthError, ctx: AuthContext): string {
  const code = (e as { code?: string }).code ?? "";
  const msg = e.message ?? "";
  const status = e.status ?? 0;
  console.error(`[auth:${ctx}] status=${status} code=${code} message=${msg}`);

  let text: string;
  if (code === "over_email_send_rate_limit" || /email rate limit/i.test(msg)) text = "Batas pengiriman email tercapai. Tunggu beberapa menit lalu coba lagi.";
  else if (code === "over_request_rate_limit" || /for security purposes|after \d+ seconds/i.test(msg)) text = "Permintaan terlalu cepat. Tunggu satu menit lalu coba lagi.";
  else if (code === "weak_password" || (/password/i.test(msg) && /(weak|short|at least|characters)/i.test(msg))) text = "Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.";
  else if (code === "user_already_exists" || code === "email_exists" || /already (been )?registered/i.test(msg)) text = "Email sudah terdaftar. Silakan masuk atau atur ulang kata sandi.";
  else if (code === "email_address_invalid" || (/invalid/i.test(msg) && /email/i.test(msg))) text = "Alamat email tidak dapat digunakan. Pakai alamat email aktif yang lain.";
  else if (code === "signup_disabled") text = "Pendaftaran akun baru sedang dinonaktifkan.";
  else if (/sending .*email|smtp|unexpected_failure/i.test(`${msg} ${code}`) || status >= 500) text = "Email gagal dikirim karena pengaturan pengiriman email (SMTP) belum benar. Hubungi admin toko.";
  else text = ctx === "register" ? "Pendaftaran gagal. Silakan coba lagi beberapa saat lagi." : "Email gagal dikirim. Silakan coba lagi beberapa saat lagi.";

  if (process.env.NODE_ENV !== "production") text += ` [debug: ${status || "-"} ${code || msg}]`;
  return text;
}