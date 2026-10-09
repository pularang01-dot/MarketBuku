import "server-only";
import { headers } from "next/headers";

/**
 * The public origin used in links we hand to Supabase (email confirmation / password reset).
 * Uses NEXT_PUBLIC_SITE_URL when it is a real domain; otherwise the origin of the current request,
 * so the link always points back to the site the user is actually on (localhost in dev, your domain in production).
 */
export async function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}