"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, register, forgotPassword, resetPassword } from "@/actions/auth";
import { Field, Msg, Submit } from "./form-bits";

const cfg = {
  login: { action: login, title: "Masuk", cta: "Masuk" },
  register: { action: register, title: "Daftar", cta: "Buat Akun" },
  forgot: { action: forgotPassword, title: "Lupa kata sandi", cta: "Kirim tautan reset" },
  reset: { action: resetPassword, title: "Kata sandi baru", cta: "Simpan" },
} as const;

export function AuthForm({ mode }: { mode: keyof typeof cfg }) {
  const c = cfg[mode];
  const [state, action] = useActionState(c.action, null);
  const next = useSearchParams().get("next") ?? "/";
  return (
    <form action={action} className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">{c.title}</h1>
      {mode === "login" && <input type="hidden" name="next" value={next} />}
      {mode === "register" && <Field name="full_name" label="Nama lengkap" state={state} autoComplete="name" required />}
      {mode !== "reset" && <Field name="email" label="Email" type="email" state={state} autoComplete="email" required />}
      {mode !== "forgot" && <Field name="password" label={mode === "reset" ? "Kata sandi baru" : "Kata sandi"} type="password" state={state} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />}
      <Msg state={state} /><Submit>{c.cta}</Submit>
      <p className="text-sm text-ink-soft">
        {mode === "login" && <><Link className="underline" href="/forgot-password">Lupa kata sandi?</Link> · <Link className="underline" href="/register">Daftar</Link></>}
        {mode === "register" && <>Sudah punya akun? <Link className="underline" href="/login">Masuk</Link></>}
      </p>
    </form>
  );
}
