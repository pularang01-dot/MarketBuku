import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/catalog";
import { savePreferences } from "@/actions/account";
import { PrefForm } from "@/components/pref-form";
export const metadata = { title: "Preferensi Belajar" };
export default async function Prefs() {
  const user = await getUser(); const supabase = await createSupabaseServer();
  const [{ data: pref }, tax] = await Promise.all([supabase.from("user_preferences").select("*").eq("user_id", user!.id).maybeSingle(), getTaxonomy()]);
  return (<><h1 className="mb-1 text-3xl font-bold">Preferensi Belajar</h1><p className="mb-4 text-sm text-ink-soft">Dipakai untuk rekomendasi di beranda.</p><PrefForm action={savePreferences} tax={tax} pref={pref} /></>);
}
