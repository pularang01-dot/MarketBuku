import { createSupabaseAdmin } from "@/lib/supabase/server";
import { PromoForm } from "@/components/promo-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ContentTabs } from "@/components/content-tabs";
import { ConfirmButton } from "@/components/row-actions";
import { deletePromotion } from "@/actions/admin-content";
export default async function AdminPromotions() {
  const { data } = await createSupabaseAdmin().from("promotions").select("*").order("created_at", { ascending: false });
  return (<><AdminPageHeader eyebrow="Konten & Promosi" title="Promo" subtitle="Banner dan penawaran yang tampil di halaman Promo." /><ContentTabs active="/admin/promotions" /><div className="mb-6 space-y-3">{data?.map((p) => <details key={p.id} className="card p-3"><summary className="flex cursor-pointer items-center justify-between"><span>{p.title} {p.active ? "" : "(nonaktif)"}</span></summary><div className="mt-3 space-y-2"><PromoForm promo={p} /><ConfirmButton label="Hapus promo" confirmText="Hapus promo ini?" action={deletePromotion.bind(null, p.id)} /></div></details>)}{!data?.length && <p className="text-ink-mute">Belum ada promo.</p>}</div>
    <h2 className="mb-2 text-xl">Promo baru</h2><PromoForm /></>);
}