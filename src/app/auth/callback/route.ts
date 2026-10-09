import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Fallback for the PKCE `?code=` flow (e.g. OAuth or default Supabase email templates). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (!code) return NextResponse.redirect(new URL("/auth/selesai?tipe=error", url.origin));
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/selesai?tipe=error", url.origin));
  return NextResponse.redirect(new URL(safe === "/" ? "/auth/selesai?tipe=daftar" : safe, url.origin));
}