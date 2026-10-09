"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { login, register, forgotPassword, resetPassword, resendConfirmation } from "@/actions/auth";
import { Field, Msg, Submit } from "./form-bits";

const cfg = {
  login: { action: login, title: "Masuk", sub: "Masuk untuk melanjutkan belanja dan memantau pesananmu.", cta: "Masuk" },
  register: { action: register, title: "Buat Akun", sub: "Daftar gratis untuk menyimpan wishlist, memesan, dan membaca e-book.", cta: "Buat Akun" },
  forgot: { action: forgotPassword, title: "Lupa Kata Sandi", sub: "Masukkan email akunmu; kami kirim tautan untuk mengatur ulang kata sandi.", cta: "Kirim Tautan Reset" },
  reset: { action: resetPassword, title: "Kata Sandi Baru", sub: "Pilih kata sandi baru minimal 8 karakter.", cta: "Simpan Kata Sandi" },
  resend: { action: resendConfirmation, title: "Kirim Ulang Konfirmasi", sub: "Masukkan email yang kamu pakai mendaftar.", cta: "Kirim Ulang Tautan" },
} as const;

export function AuthForm({ mode }: { mode: keyof typeof cfg }) {
  const c = cfg[mode];
  const [state, action] = useActionState(c.action, null);
  const next = useSearchParams().get("next") ?? "/";

  if (mode === "register" && state?.ok && state.message === "CONFIRM_EMAIL") {
    return (
      <div className="card mx-auto mt-6 grid max-w-md place-items-center gap-3 p-8 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-pill bg-brand-light text-brand"><MailCheck aria-hidden className="h-8 w-8" /></span>
        <h1 className="text-2xl">Cek emailmu</h1>
        <p className="text-sm text-ink-soft">Kami mengirim tautan konfirmasi ke emailmu. Klik tombol <strong>Konfirmasi Email</strong> di dalamnya untuk mengaktifkan akun.</p>
        <p className="text-xs text-ink-mute">Belum menerima? Periksa folder spam, atau <Link href="/auth/kirim-ulang" className="font-semibold text-brand underline">kirim ulang tautan</Link>.</p>
        <Link href="/login" className="btn-ghost mt-2">Ke Halaman Masuk</Link>
      </div>
    );
  }
  return (
    <form action={action} className="card mx-auto mt-6 max-w-md space-y-4 p-6 sm:p-8">
      <div><h1 className="text-2xl">{c.title}</h1><p className="mt-1 text-sm text-ink-soft">{c.sub}</p></div>
      {mode === "login" && <input type="hidden" name="next" value={next} />}
      {mode === "register" && <Field name="full_name" label="Nama lengkap" state={state} autoComplete="name" required />}
      {mode !== "reset" && <Field name="email" label="Email" type="email" state={state} autoComplete="email" required />}
      {(mode === "login" || mode === "register" || mode === "reset") && <Field name="password" label={mode === "reset" ? "Kata sandi baru" : "Kata sandi"} type="password" state={state} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />}
      <Msg state={state} />
      {mode === "login" && state?.message?.includes("belum dikonfirmasi") && <Link href="/auth/kirim-ulang" className="block text-sm font-semibold text-brand underline">Kirim ulang email konfirmasi</Link>}
      <Submit className="btn-primary w-full">{c.cta}</Submit>
      <p className="text-center text-sm text-ink-soft">
        {mode === "login" && <><Link className="font-medium text-brand hover:underline" href="/forgot-password">Lupa kata sandi?</Link> · <Link className="font-medium text-brand hover:underline" href="/register">Daftar</Link></>}
        {mode === "register" && <>Sudah punya akun? <Link className="font-medium text-brand hover:underline" href="/login">Masuk</Link></>}
        {(mode === "forgot" || mode === "resend") && <Link className="font-medium text-brand hover:underline" href="/login">Kembali ke halaman masuk</Link>}
      </p>
    </form>
  );
}