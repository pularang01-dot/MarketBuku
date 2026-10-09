import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reset Kata Sandi", robots: { index: false } };

export default async function Page() {
  const user = await getUser(); // the reset link signs the user in temporarily; without it there is nothing to reset
  if (!user) return (
    <div className="card mx-auto mt-6 max-w-md space-y-3 p-8 text-center"><h1 className="text-2xl">Tautan reset tidak valid</h1><p className="text-sm text-ink-soft">Tautan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru untuk mengatur ulang kata sandi.</p><Link href="/forgot-password" className="btn-primary">Minta Tautan Baru</Link></div>);
  return <Suspense><AuthForm mode="reset" /></Suspense>;
}