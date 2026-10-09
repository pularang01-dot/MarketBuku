import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleDollarSign, ClipboardCheck, Library, PackageCheck, Users } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin-page-header";
import { StatusBadge } from "@/components/status-badge";

export default async function Dashboard() {
  const db = createSupabaseAdmin();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const paid = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"];
  const [orders, customers, books, low, items, recent, pend] = await Promise.all([
    db.from("orders").select("total, created_at, status").in("status", paid),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "USER"),
    db.from("books").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
    db.from("inventory").select("book_id, stock, reserved, low_stock_threshold, books(title)").order("stock").limit(50),
    db.from("order_items").select("title_snapshot, quantity, price_snapshot, orders!inner(status, created_at)").in("orders.status", paid).gte("orders.created_at", since),
    db.from("orders").select("id, order_number, total, status, created_at, shipping_address").order("created_at", { ascending: false }).limit(6),
    db.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
  ]);
  const revenue = (orders.data ?? []).reduce((s, o) => s + o.total, 0);
  const lowList = (low.data ?? []).filter((i) => i.stock - i.reserved <= i.low_stock_threshold);
  const byTitle = new Map<string, { qty: number; rev: number }>();
  (items.data ?? []).forEach((i) => { const c = byTitle.get(i.title_snapshot) ?? { qty: 0, rev: 0 }; c.qty += i.quantity; c.rev += i.quantity * i.price_snapshot; byTitle.set(i.title_snapshot, c); });
  const top = [...byTitle].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  const daily = new Map<string, number>();
  (orders.data ?? []).filter((o) => o.created_at >= since).forEach((o) => { const d = o.created_at.slice(0, 10); daily.set(d, (daily.get(d) ?? 0) + o.total); });
  const days = [...daily].sort(); const max = Math.max(1, ...days.map(([, v]) => v));
  const kpi = [[CircleDollarSign, "Total pendapatan", formatRupiah(revenue), "30 hari terakhir tidak termasuk pesanan batal"], [PackageCheck, "Pesanan dibayar", `${orders.data?.length ?? 0} pesanan`, "Status dibayar sampai selesai"], [Users, "Pelanggan terdaftar", `${customers.count ?? 0} akun`, "Pengguna dengan peran USER"], [Library, "Buku terbit aktif", `${books.count ?? 0} judul`, "Status terbit di katalog"]] as const;
  const needs = pend.count ?? 0;
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow={new Date().toLocaleDateString("id-ID", { dateStyle: "full" })} title="Ringkasan Dasbor" subtitle="Pantau pesanan, verifikasi pembayaran transfer, dan ketersediaan stok dalam satu tampilan." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpi.map(([Icon, label, value, note]) => <div key={label} className="card p-4"><div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">{label}</p><span className="grid h-8 w-8 place-items-center rounded-ctl bg-brand-light text-brand"><Icon aria-hidden className="h-4 w-4" /></span></div><p className="mt-3 font-serif text-2xl font-semibold text-brand-dark">{value}</p><p className="mt-1 text-xs text-ink-mute">{note}</p></div>)}
        <Link href="/admin/payments" className={`rounded-card p-4 transition hover:shadow-float ${needs ? "bg-marigold-light text-marigold-dark" : "card"}`}><div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-wide">Perlu verifikasi</p><ClipboardCheck aria-hidden className="h-5 w-5" /></div><p className="mt-3 font-serif text-2xl font-semibold">{needs} bukti</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold">Verifikasi sekarang<ArrowRight aria-hidden className="h-4 w-4" /></p></Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5"><h2 className="text-xl">Tren Pendapatan 30 Hari</h2><p className="text-xs text-ink-mute">Total pendapatan per hari (pesanan berstatus dibayar atau lebih).</p>
          {!days.length ? <p className="mt-8 text-sm text-ink-mute">Belum ada transaksi.</p> :
            <div className="mt-6 flex h-52 items-end gap-1.5 border-b border-line" role="img" aria-label="Grafik pendapatan harian">{days.map(([d, v]) => <div key={d} title={`${d}: ${formatRupiah(v)}`} className="group relative flex-1 rounded-t bg-brand transition hover:bg-brand-dark" style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}><span className="sr-only">{d}: {formatRupiah(v)}</span></div>)}</div>}
          {days.length > 0 && <div className="mt-1 flex justify-between text-[11px] text-ink-mute"><span>{days[0][0]}</span><span>{days[days.length - 1][0]}</span></div>}</section>
        <div className="space-y-6">
          <section className="card p-5"><div className="flex items-center justify-between"><h2 className="text-xl">Buku Terlaris</h2><span className="badge bg-brand-light text-brand">30 hari</span></div>
            <ol className="mt-3 space-y-2">{top.map(([t, v], i) => <li key={t} className="flex items-center gap-3 text-sm"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-brand-light text-xs font-bold text-brand">{i + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{t}</span><span className="shrink-0 text-ink-soft">{v.qty} eks</span></li>)}{!top.length && <li className="text-sm text-ink-mute">Belum ada data.</li>}</ol></section>
          <section className="card p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl"><AlertTriangle aria-hidden className="h-5 w-5 text-marigold-dark" />Stok Menipis</h2><Link href="/admin/inventory" className="text-xs font-semibold text-brand hover:underline">Kelola</Link></div>
            <ul className="mt-3 space-y-2">{lowList.slice(0, 5).map((i) => <li key={i.book_id} className="flex items-center justify-between gap-2 rounded-card bg-paper p-3 text-sm"><span className="min-w-0 truncate">{(i.books as unknown as { title: string })?.title}</span><span className="badge shrink-0 bg-marigold-light text-marigold-dark">Sisa {i.stock - i.reserved}</span></li>)}{!lowList.length && <li className="text-sm text-ink-mute">Semua stok aman.</li>}</ul></section>
        </div>
      </div>

      <section className="card overflow-hidden"><div className="flex items-center justify-between p-5"><div><h2 className="text-xl">Pesanan Terbaru</h2><p className="text-xs text-ink-mute">Enam pesanan terakhir yang masuk.</p></div><Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">Semua pesanan</Link></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-5 py-3">No. pesanan</th><th>Waktu</th><th>Penerima</th><th>Total</th><th>Status</th><th className="pr-5 text-right">Aksi</th></tr></thead>
          <tbody>{recent.data?.map((o) => <tr key={o.id} className="border-t border-line"><td className="px-5 py-3 font-mono text-xs">{o.order_number}</td><td>{new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td><td>{(o.shipping_address as { recipient_name: string }).recipient_name}</td><td className="font-semibold">{formatRupiah(o.total)}</td><td><StatusBadge status={o.status} /></td><td className="pr-5 text-right"><Link href="/admin/orders" className="btn-ghost !min-h-[34px] !px-3 text-xs">{o.status === "PENDING_PAYMENT" ? "Periksa" : "Detail"}</Link></td></tr>)}</tbody></table></div></section>
    </div>
  );
}