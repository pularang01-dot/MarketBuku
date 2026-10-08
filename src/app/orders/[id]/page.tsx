import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, MapPin, RotateCcw, Truck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-state";
import { reorder } from "@/actions/orders";
import { getShippingProvider } from "@/lib/shipping";
import { Breadcrumb } from "@/components/breadcrumb";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Detail Pesanan", robots: { index: false } };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/orders/${id}`);
  const supabase = await createSupabaseServer();
  const { data: o } = await supabase.from("orders").select("*, order_items(*), order_events(*), payments(redirect_url,status,provider), payment_proofs(status,reject_reason,created_at), shipments(tracking_number,courier)").eq("id", id).maybeSingle(); // RLS scopes to owner
  if (!o) notFound();
  const pending = o.status === "PENDING_PAYMENT";
  const trackNo = o.shipments?.tracking_number as string | undefined;
  let tracking: { status: string; history: { at: string; note: string }[] } | null = null;
  if (trackNo && o.shipping_courier) { try { tracking = await getShippingProvider().getTracking(trackNo, o.shipping_courier); } catch { tracking = null; } }
  const pay = o.payments?.[0];
  const latestProof = [...(o.payment_proofs ?? [])].sort((a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at))[0] as { status: string; reject_reason: string | null } | undefined;
  const addr = o.shipping_address as Record<string, string>;
  const events = [...o.order_events].sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at)) as { id: string; to_status: OrderStatus; created_at: string; note: string | null }[];
  return (
    <div className="space-y-5">
      <div><Breadcrumb crumbs={[{ href: "/", label: "Beranda" }, { href: "/orders", label: "Pesanan Saya" }, { label: o.order_number }]} />
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl">Pesanan {o.order_number}</h1><StatusBadge status={o.status} /></div>
        <p className="mt-1 text-sm text-ink-soft">Dibuat {new Date(o.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}</p></div>

      {pending && pay?.redirect_url && <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-marigold-light p-4 text-marigold-dark"><p className="text-sm"><strong>Menunggu pembayaran.</strong> Selesaikan sebelum {new Date(o.expires_at).toLocaleString("id-ID")}.</p><Link href={pay.redirect_url} className="btn-primary">{pay.provider === "manual" ? "Bayar & Unggah Bukti" : "Bayar Sekarang"}</Link></div>}
      {pending && latestProof && <p role="status" className="card p-3 text-sm">Bukti pembayaran terakhir: <strong>{latestProof.status === "PENDING" ? "menunggu verifikasi admin" : latestProof.status === "APPROVED" ? "disetujui" : "ditolak"}</strong>{latestProof.reject_reason ? ` — ${latestProof.reject_reason}` : ""}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="card p-5"><h2 className="text-xl">Item Pesanan</h2>
            <ul className="mt-3 divide-y divide-line">{o.order_items.map((i: { id: string; title_snapshot: string; quantity: number; price_snapshot: number; format_snapshot: string }) => <li key={i.id} className="flex items-start justify-between gap-3 py-3"><span><span className="font-serif text-base font-semibold text-brand-dark">{i.title_snapshot}</span><br /><span className="text-xs text-ink-mute">{i.quantity} × {formatRupiah(i.price_snapshot)} · {i.format_snapshot === "PRINT" ? "Buku cetak" : "Digital"}</span></span><span className="font-semibold">{formatRupiah(i.price_snapshot * i.quantity)}</span></li>)}</ul></section>

          {o.has_physical && <section className="card p-5"><h2 className="flex items-center gap-2 text-xl"><Truck aria-hidden className="h-5 w-5 text-brand" />Pengiriman</h2>
            <p className="mt-2 text-sm leading-relaxed">{addr.recipient_name} · {addr.phone}<br />{addr.address_line}, {addr.district}, {addr.city}, {addr.province} {addr.postal_code}</p>
            {addr.latitude && <a className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}><MapPin aria-hidden className="h-4 w-4" />Lihat titik di peta</a>}
            {trackNo && <p className="mt-3 rounded-card bg-paper p-3 text-sm">Nomor resi: <strong className="font-mono">{trackNo}</strong>{o.shipping_courier ? ` (${o.shipping_courier})` : ""}</p>}
            {tracking && <div className="mt-3"><p className="text-sm font-semibold">Pelacakan: {tracking.status}</p><ul className="mt-1 space-y-1 text-sm text-ink-soft">{tracking.history.map((h, i) => <li key={i}>{h.at} — {h.note}</li>)}</ul></div>}</section>}

          <section className="card p-5"><h2 className="text-xl">Riwayat Status</h2>
            <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">{events.map((e, i) => <li key={e.id} className="relative"><span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${i === events.length - 1 ? "bg-brand" : "bg-line"}`} /><p className="text-sm font-semibold">{STATUS_LABEL[e.to_status]}</p><p className="text-xs text-ink-mute">{new Date(e.created_at).toLocaleString("id-ID")}</p></li>)}</ol></section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-40 lg:self-start">
          <section className="card p-5"><h2 className="text-xl">Rincian Biaya</h2>
            <dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatRupiah(o.subtotal)}</dd></div>
              {o.bundle_discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon paket</dt><dd className="text-leaf">−{formatRupiah(o.bundle_discount)}</dd></div>}
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon {o.coupon_code}</dt><dd className="text-leaf">−{formatRupiah(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-soft">Ongkos kirim</dt><dd>{formatRupiah(o.shipping_cost)}</dd></div></dl>
            <div className="mt-3 flex items-center justify-between rounded-card bg-brand-light p-3"><span className="font-semibold">Total</span><span className="text-xl font-bold text-brand-dark">{formatRupiah(o.total)}</span></div></section>
          <div className="flex flex-wrap gap-2"><Link href={`/orders/${o.id}/invoice`} className="btn-ghost flex-1"><FileText aria-hidden className="h-4 w-4" />Invoice</Link><form action={reorder.bind(null, o.id)} className="flex-1"><button className="btn-ghost w-full"><RotateCcw aria-hidden className="h-4 w-4" />Beli lagi</button></form></div>
          {["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].includes(o.status) && o.order_items.some((i: { format_snapshot: string }) => i.format_snapshot !== "PRINT") && <Link href="/library" className="btn-primary w-full">Buka perpustakaan digital</Link>}
        </aside>
      </div>
    </div>
  );
}