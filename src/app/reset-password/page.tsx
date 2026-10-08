import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Reset Kata Sandi", robots: { index: false } };
export default function Page() { return <Suspense><AuthForm mode="reset" /></Suspense>; }
