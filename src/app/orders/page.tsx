import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PaymentBadge } from "@/components/payment-timeline";
import { paymentPhase, type ProofLike } from "@/lib/payment-state";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Pesanan Saya", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("orders").select("id, order_number, status, total, created_at, payment_proofs(status, created_at)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <PageHeader title="Pesanan Saya" subtitle="Pantau status pembayaran dan pengiriman pesananmu." crumbs={[{ href: "/", label: "Beranda" }, { label: "Pesanan Saya" }]} />
      {!data?.length ? <div className="card grid place-items-center gap-3 p-10 text-center"><span className="grid h-14 w-14 place-items-center rounded-pill bg-brand-light text-brand"><PackageOpen aria-hidden className="h-7 w-7" /></span><p className="text-ink-soft">Belum ada pesanan.</p><Link className="btn-primary" href="/books">Mulai belanja</Link></div> :
        <ul className="space-y-3">{data.map((o) => (
          <li key={o.id}><Link href={`/orders/${o.id}`} className="card flex items-center justify-between gap-3 p-4 transition hover:border-brand hover:shadow-float">
            <span><strong className="font-serif text-lg text-brand-dark">{o.order_number}</strong><br /><span className="text-sm text-ink-mute">{new Date(o.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</span></span>
            <span className="flex items-center gap-3 text-right"><span className="flex flex-col items-end gap-1"><StatusBadge status={o.status} />{o.status === "PENDING_PAYMENT" && <PaymentBadge phase={paymentPhase(o.status, (o.payment_proofs ?? []) as ProofLike[])} />}<strong className="text-brand">{formatRupiah(o.total)}</strong></span><ChevronRight aria-hidden className="h-5 w-5 text-ink-mute" /></span></Link></li>))}</ul>}
    </>
  );
}