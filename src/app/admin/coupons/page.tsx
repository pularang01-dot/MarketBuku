import { createSupabaseAdmin } from "@/lib/supabase/server";
import { CouponForm } from "@/components/coupon-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ContentTabs } from "@/components/content-tabs";
import { scopeOptions } from "@/lib/admin-options";
import { campaignStatus, STATUS_LABEL, STATUS_TONE, type CampaignStatus } from "@/lib/pricing/status";
import { describeBenefit, scopeText } from "@/lib/pricing/describe";
import { toggleCoupon } from "@/actions/coupons";
import { formatRupiah } from "@/lib/utils";
import { formatWib } from "@/lib/wib";

export const metadata = { title: "Kupon" };

export default async function Coupons({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const db = createSupabaseAdmin();
  const [{ data }, { data: stats }, { options, books }] = await Promise.all([db.from("coupons").select("*").order("created_at", { ascending: false }), db.rpc("coupon_stats"), scopeOptions()]);
  type CouponStat = { cid: string; reserved: number; redeemed: number; released: number; discount_total: number };
  const st = new Map<string, CouponStat>(((stats ?? []) as CouponStat[]).map((s): [string, CouponStat] => [s.cid, s]));
  const now = new Date();
  const q = (sp.q ?? "").toUpperCase().trim();
  const rows = (data ?? [])
    .map((c) => ({ c, status: campaignStatus({ active: c.active, startsAt: c.starts_at, endsAt: c.ends_at }, now) }))
    .filter((r) => (!q || r.c.code.includes(q)) && (!sp.status || r.status === (sp.status as CampaignStatus)));

  return (
    <>
      <AdminPageHeader eyebrow="Konten & Promosi" title="Kupon & Diskon" subtitle="Kupon divalidasi di server pada keranjang dan saat pesanan dibuat. Kuota dikunci saat pesanan dibuat dan dilepas bila pesanan batal sebelum dibayar." />
      <ContentTabs active="/admin/coupons" />
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div><label htmlFor="q" className="label !mb-1 text-xs">Cari kode</label><input id="q" name="q" defaultValue={sp.q} className="input !w-48" /></div>
        <div><label htmlFor="status" className="label !mb-1 text-xs">Status</label><select id="status" name="status" defaultValue={sp.status ?? ""} className="input !w-44"><option value="">Semua</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <button className="btn-primary">Terapkan</button>
      </form>

      <div className="mb-8 space-y-3">
        {rows.map(({ c, status }) => { const s = st.get(c.id);
          return (
            <details key={c.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2"><strong className="font-mono text-lg text-brand-dark">{c.code}</strong><span className={`badge ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>{c.is_public && <span className="badge bg-brand-light text-brand">Publik</span>}{!c.stackable_with_promo && <span className="badge bg-marigold-light text-marigold-dark">Tidak digabung promosi</span>}</span>
                <span className="text-sm text-ink-soft">{describeBenefit(c.type === "FREE_SHIPPING" ? "FREE_SHIPPING" : c.type, c.value, c.max_discount)}</span>
              </summary>
              <div className="mt-3 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
                <p>Cakupan: <strong className="text-ink">{scopeText(c.scope_type, (c.scope_ids ?? []).length)}</strong>{(c.exclude_book_ids ?? []).length > 0 && <> · {(c.exclude_book_ids ?? []).length} buku dikecualikan</>}{c.min_purchase > 0 && <> · min. {formatRupiah(c.min_purchase)}</>}</p>
                <p>Periode: {formatWib(c.starts_at)} → {c.ends_at ? formatWib(c.ends_at) : "tanpa batas"}</p>
                <p>Kuota: <strong className="text-ink">{c.used_count}/{c.usage_limit ?? "∞"}</strong> terpakai · {c.per_user_limit}× per akun</p>
                <p>Riwayat: {s?.reserved ?? 0} dicadangkan (belum bayar) · {s?.redeemed ?? 0} berhasil · {s?.released ?? 0} dilepas · total diskon <strong className="text-ink">{formatRupiah(Number(s?.discount_total ?? 0))}</strong></p>
              </div>
              <div className="mt-4 space-y-3"><CouponForm coupon={c} options={options} books={books} />
                <form action={toggleCoupon.bind(null, c.id, !c.active)}><button className="text-sm text-brand underline">{c.active ? "Nonaktifkan" : "Aktifkan"}</button></form>
                <p className="text-xs text-ink-mute">Kupon tidak dihapus agar riwayat pemakaian tetap utuh. Nonaktifkan bila tidak dipakai lagi.</p></div>
            </details>); })}
        {!rows.length && <p className="card p-6 text-center text-sm text-ink-mute">Tidak ada kupon yang cocok.</p>}
      </div>
      <h2 className="mb-2 text-xl">Kupon baru</h2><CouponForm options={options} books={books} />
    </>
  );
}