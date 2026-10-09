import { createSupabaseAdmin } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ContentTabs } from "@/components/content-tabs";
export default async function Settings() {
  const { data } = await createSupabaseAdmin().from("site_settings").select("key,value");
  const v = Object.fromEntries((data ?? []).map((r) => [r.key, String(r.value)]));
  return (<><AdminPageHeader eyebrow="Konten & Promosi" title="Pengaturan Toko" subtitle="Nama toko, kontak bantuan, dan pengumuman situs." /><ContentTabs active="/admin/settings" /><div className="max-w-2xl"><SettingsForm v={v} /></div></>);
}