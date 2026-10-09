import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
const safe = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

/**
 * Landing route for auth emails. Supports BOTH flows so it works with or without custom email templates:
 *  1. ?token_hash=...&type=signup|recovery|...  (custom templates; opens in ANY browser/device)
 *  2. ?code=...[&next=/path]                    (Supabase default templates, PKCE flow)
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const go = (path: string) => NextResponse.redirect(new URL(path, origin));
  const fail = () => go("/auth/selesai?tipe=error");
  const supabase = await createSupabaseServer();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
    return go(safe(searchParams.get("next")) ?? "/auth/selesai?tipe=daftar");
  }

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (!token_hash || !type || !TYPES.includes(type)) return fail();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) return fail();
  return go(type === "recovery" ? "/reset-password" : type === "email_change" ? "/account/profile" : "/auth/selesai?tipe=daftar");
}