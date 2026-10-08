import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { OrderStatusForm } from "@/components/order-status-form";
import { formatRupiah } from "@/lib/utils";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-state";
const SIZE = 20;
export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams; const page = Math.max(1, +(sp.page ?? 1) || 1);
  let q = createSupabaseAdmin().from("orders").select("id,order_number,status,total,created_at,shipping_address,payments(status)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.status && sp.status in STATUS_LABEL) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("order_number", `%${sp.q.replace(/[%_,()]/g, "")}%`);
  const { data, count } = await q.range((page - 1) * SIZE, page * SIZE - 1);
  return (<><h1 className="mb-4 text-3xl font-bold">Pesanan</h1>
    <form className="mb-3 flex flex-wrap gap-2"><input name="q" defaultValue={sp.q} placeholder="No. pesanan" className="input max-w-xs" aria-label="Cari nomor pesanan" /><select name="status" defaultValue={sp.status ?? ""} className="input max-w-xs" aria-label="Status"><option value="">Semua status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button className="btn-primary">Filter</button></form>
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light"><tr><th className="p-3">Pesanan</th><th>Penerima</th><th>Total</th><th>Bayar</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{data?.map((o) => <tr key={o.id} className="border-t align-top"><td className="p-3"><Link className="text-brand underline" href={`/orders/${o.id}`}>{o.order_number}</Link><br /><span className="text-xs text-ink-mute">{new Date(o.created_at).toLocaleDateString("id-ID")}</span></td><td>{(o.shipping_address as { recipient_name: string }).recipient_name}{(o.shipping_address as { latitude?: number }).latitude ? <><br /><a className="text-xs text-brand underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${(o.shipping_address as { latitude: number }).latitude},${(o.shipping_address as { longitude: number }).longitude}`}>Peta</a></> : null}</td><td>{formatRupiah(o.total)}</td><td>{o.payments?.[0]?.status ?? "-"}</td><td>{STATUS_LABEL[o.status as OrderStatus]}</td><td className="py-2"><OrderStatusForm id={o.id} status={o.status as OrderStatus} /></td></tr>)}{!data?.length && <tr><td colSpan={6} className="p-6 text-center text-ink-mute">Tidak ada pesanan.</td></tr>}</tbody></table></div>
    <p className="mt-2 text-sm text-ink-mute">{count ?? 0} pesanan · halaman {page}</p>
    <div className="mt-2 flex gap-2">{page > 1 && <Link className="btn-ghost" href={`?page=${page - 1}`}>Sebelumnya</Link>}{(count ?? 0) > page * SIZE && <Link className="btn-ghost" href={`?page=${page + 1}`}>Berikutnya</Link>}</div></>);
}