"use server";
import { suggest } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function suggestAction(term: string) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await rateLimit(`suggest:${ip}`, 60, 60_000))) return [];
  return suggest(term);
}
