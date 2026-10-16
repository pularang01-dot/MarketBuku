import { createSupabaseAdmin } from "@/lib/supabase/server";
import { PromotionForm } from "@/components/promotion-form";
import { ConfirmButton } from "@/components/row-actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ContentTabs } from "@/components/content-tabs";
import { scopeOptions } from "@/lib/admin-options";
import { campaignStatus, STATUS_LABEL, STATUS_TONE, type CampaignStatus } from "@/lib/pricing/status";
import { describeBenefit, scopeText } from "@/lib/pricing/describe";
import { togglePromotion, deletePromotion } from "@/actions/promotions";
import { formatRupiah } from "@/lib/utils";
import { formatWib } from "@/lib/wib";

export const metadata = { title: "Promosi Otomatis" };

export default async function AdminPromotions({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const db = createSupabaseAdmin();
  const [{ data }, { data: stats }, { options }] = await Promise.all([
    db.from("promotions").select("*").order("created_at", { ascending: false }),
    db.rpc("promo_stats"),
    scopeOptions(),
  ]);
  type PromoStat = { pid: string; orders_count: number; units: number; discount_total: number };
  const st = new Map<string, PromoStat>(((stats ?? []) as PromoStat[]).map((s): [string, PromoStat] => [s.pid, s]));
  const now = new Date();
  const q = (sp.q ?? "").toLowerCase().trim();
  const rows = (data ?? [])
    .map((p) => ({ p, status: campaignStatus({ active: p.active, startsAt: p.starts_at, endsAt: p.ends_at }, now) }))
    .filter((r) => (!q || r.p.title.toLowerCase().includes(q)) && (!sp.status || r.status === (sp.status as CampaignStatus)));

  return (
    <>
      <AdminPageHeader eyebrow="Konten & Promosi" title="Promosi Otomatis" subtitle="Diskon yang berlaku otomatis di katalog, keranjang, dan checkout. Waktu dalam WIB; mulai inklusif, berakhir eksklusif." />
      <ContentTabs active="/admin/promotions" />
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div><label htmlFor="q" className="label !mb-1 text-xs">Cari</label><input id="q" name="q" defaultValue={sp.q} placeholder="Nama promosi" className="input !w-56" /></div>
        <div><label htmlFor="status" className="label !mb-1 text-xs">Status</label><select id="status" name="status" defaultValue={sp.status ?? ""} className="input !w-44"><option value="">Semua</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <button className="btn-primary">Terapkan</button>
      </form>

      <div className="mb-8 space-y-3">
        {rows.map(({ p, status }) => { const s = st.get(p.id); const used = (s?.orders_count ?? 0) > 0 || (s?.units ?? 0) > 0;
          return (
            <details key={p.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2"><strong className="font-serif text-lg text-brand-dark">{p.title}</strong><span className={`badge ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>{!p.stackable_with_coupon && <span className="badge bg-marigold-light text-marigold-dark">Tidak digabung kupon</span>}</span>
                <span className="text-sm text-ink-soft">{describeBenefit(p.benefit_type, p.benefit_value, p.max_discount)}</span>
              </summary>
              <div className="mt-3 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
                <p>Cakupan: <strong className="text-ink">{scopeText(p.scope_type, (p.scope_ids ?? []).length)}</strong>{p.min_purchase > 0 && <> · min. belanja {formatRupiah(p.min_purchase)}</>}</p>
                <p>Periode: {formatWib(p.starts_at)} → {p.ends_at ? formatWib(p.ends_at) : "tanpa batas"}</p>
                <p>Prioritas: {p.priority}</p>
                <p>Dipakai: <strong className="text-ink">{s?.orders_count ?? 0}</strong> pesanan · {s?.units ?? 0} buku · total diskon <strong className="text-ink">{formatRupiah(Number(s?.discount_total ?? 0))}</strong></p>
              </div>
              <div className="mt-4 space-y-3"><PromotionForm promo={p} options={options} />
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <form action={togglePromotion.bind(null, p.id, !p.active)}><button className="text-brand underline">{p.active ? "Nonaktifkan" : "Aktifkan"}</button></form>
                  {!used && <ConfirmButton label="Hapus" confirmText="Hapus promosi yang belum pernah dipakai ini?" action={deletePromotion.bind(null, p.id)} />}
                  {used && <span className="text-xs text-ink-mute">Sudah dipakai pesanan — tidak bisa dihapus, hanya dinonaktifkan.</span>}
                </div></div>
            </details>); })}
        {!rows.length && <p className="card p-6 text-center text-sm text-ink-mute">Tidak ada promosi yang cocok.</p>}
      </div>
      <h2 className="mb-2 text-xl">Promosi baru</h2><PromotionForm options={options} />
    </>
  );
}