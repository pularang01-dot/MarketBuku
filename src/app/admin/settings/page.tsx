import { createSupabaseAdmin } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
export default async function Settings() {
  const { data } = await createSupabaseAdmin().from("site_settings").select("key,value");
  const v = Object.fromEntries((data ?? []).map((r) => [r.key, String(r.value)]));
  return (<><h1 className="mb-4 text-3xl font-bold">Pengaturan</h1><SettingsForm v={v} /></>);
}
