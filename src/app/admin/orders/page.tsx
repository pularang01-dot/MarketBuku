import Link from "next/link";
import { MapPin } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { OrderStatusForm } from "@/components/order-status-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { TabNav } from "@/components/tab-nav";
import { StatusBadge } from "@/components/status-badge";
import { formatRupiah } from "@/lib/utils";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-state";
const SIZE = 20;
const PAY: Record<string, [string, string]> = { PENDING: ["Menunggu", "bg-marigold-light text-marigold-dark"], PAID: ["Lunas", "bg-leaf-light text-leaf"], FAILED: ["Gagal", "bg-danger-light text-danger"], EXPIRED: ["Kedaluwarsa", "bg-surface-muted text-ink-soft"], REFUNDED: ["Dikembalikan", "bg-danger-light text-danger"] };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams; const page = Math.max(1, +(sp.page ?? 1) || 1);
  let q = createSupabaseAdmin().from("orders").select("id,order_number,status,total,created_at,shipping_address,payments(status)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.status && sp.status in STATUS_LABEL) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("order_number", `%${sp.q.replace(/[%_,()]/g, "")}%`);
  const { data, count } = await q.range((page - 1) * SIZE, page * SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / SIZE));
  const qs = (p: number) => { const u = new URLSearchParams(); if (sp.q) u.set("q", sp.q); if (sp.status) u.set("status", sp.status); u.set("page", String(p)); return `?${u}`; };
  return (
    <>
      <AdminPageHeader eyebrow="Penjualan" title="Pesanan" subtitle="Ubah status pesanan, masukkan resi pengiriman, dan tangani pembatalan atau refund." />
      <TabNav label="Bagian katalog" active="/admin/orders" tabs={[{ href: "/admin/books", label: "Daftar Buku" }, { href: "/admin/inventory", label: "Inventori & Stok" }, { href: "/admin/orders", label: "Pesanan", count: count ?? 0 }]} />
      <form className="card mb-4 flex flex-wrap gap-3 p-3"><input name="q" defaultValue={sp.q} placeholder="No. pesanan" className="input max-w-xs" aria-label="Cari nomor pesanan" /><select name="status" defaultValue={sp.status ?? ""} className="input max-w-xs" aria-label="Status"><option value="">Semua status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button className="btn-primary">Filter</button></form>
      <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Pesanan</th><th>Penerima</th><th>Total</th><th>Bayar</th><th>Status</th><th className="pr-4">Aksi</th></tr></thead><tbody>
        {data?.map((o) => { const a = o.shipping_address as { recipient_name: string; latitude?: number; longitude?: number }; const ps = PAY[o.payments?.[0]?.status ?? ""] ?? ["—", "bg-surface-muted text-ink-soft"];
          return <tr key={o.id} className="border-t border-line align-top"><td className="px-4 py-3"><Link className="font-mono text-xs font-bold text-brand underline" href={`/orders/${o.id}`}>#{o.order_number}</Link><br /><span className="text-xs text-ink-mute">{new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span></td>
            <td className="py-3">{a.recipient_name}{a.latitude ? <><br /><a className="inline-flex items-center gap-1 text-xs text-brand underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}><MapPin aria-hidden className="h-3 w-3" />Peta</a></> : null}</td>
            <td className="py-3 font-semibold">{formatRupiah(o.total)}</td><td className="py-3"><span className={`badge ${ps[1]}`}>{ps[0]}</span></td><td className="py-3"><StatusBadge status={o.status} /></td><td className="py-3 pr-4"><OrderStatusForm id={o.id} status={o.status as OrderStatus} /></td></tr>; })}
        {!data?.length && <tr><td colSpan={6} className="p-8 text-center text-ink-mute">Tidak ada pesanan.</td></tr>}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-ink-soft">Menampilkan <strong>{data?.length ?? 0}</strong> dari <strong>{count ?? 0}</strong> pesanan · halaman {page} dari {pages}</p><div className="flex gap-2">{page > 1 && <Link className="btn-ghost !min-h-[38px]" href={qs(page - 1)}>Sebelumnya</Link>}{page < pages && <Link className="btn-ghost !min-h-[38px]" href={qs(page + 1)}>Berikutnya</Link>}</div></div>
    </>
  );
}