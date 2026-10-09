import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Kirim Ulang Konfirmasi Email", robots: { index: false } };
export default function Page() { return <Suspense><AuthForm mode="resend" /></Suspense>; }