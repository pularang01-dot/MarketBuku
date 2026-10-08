import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";

export const getUser = cache(async () => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ? { ...data, email: user.email as string } : null;
});

export async function requireUser(next = "/") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Server-side role check. UI hiding is never relied upon. */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/dashboard");
  if (!["ADMIN", "SUPER_ADMIN"].includes(profile.role)) redirect("/");
  return profile;
}

export async function audit(actorId: string, action: string, entity: string, entityId?: string, metadata?: unknown) {
  const { createSupabaseAdmin } = await import("@/lib/supabase/server");
  await createSupabaseAdmin().from("audit_logs").insert({ actor_id: actorId, action, entity, entity_id: entityId, metadata });
}
