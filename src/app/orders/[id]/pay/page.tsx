import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Landmark, ListChecks, ShieldAlert, HelpCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { sweepExpiredOrders } from "@/lib/expiry";
import { canUploadProof, paymentPhase, timeline, type ProofLike } from "@/lib/payment-state";
import { CopyButton } from "@/components/copy-button";
import { PaymentProofForm } from "@/components/payment-proof-form";
import { PaymentBadge, PaymentTimeline } from "@/components/payment-timeline";
import { StatusBadge } from "@/components/status-badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Selesaikan Pembayaran", robots: { index: false } };
const PROOF: Record<string, { label: string; tone: string }> = { PENDING: { label: "Menunggu verifikasi admin", tone: "bg-brand-light text-brand" }, APPROVED: { label: "Disetujui", tone: "bg-leaf-light text-leaf" }, REJECTED: { label: "Ditolak", tone: "bg-danger-light text-danger" } };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/orders/${id}/pay`);
  await sweepExpiredOrders(); // makes the deadline real even without pg_cron
  const supabase = await createSupabaseServer();
  const [{ data: o }, { data: banks }, { data: proofs }] = await Promise.all([
    supabase.from("orders").select("id, order_number, total, subtotal, discount, bundle_discount, shipping_cost, status, created_at, expires_at, has_physical, order_items(id, title_snapshot, quantity, price_snapshot)").eq("id", id).maybeSingle(), // RLS: owner only; totals come from the stored order
    supabase.from("bank_accounts").select("*").eq("active", true).order("sort").order("created_at"),
    supabase.from("payment_proofs").select("id, status, reject_reason, amount, created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!o) notFound();
  if (o.status !== "PENDING_PAYMENT") redirect(`/orders/${id}`);

  const list = (proofs ?? []) as (ProofLike & { id: string; amount: number })[];
  const phase = paymentPhase(o.status, list);
  const steps = timeline(o, list);
  const mayUpload = canUploadProof(o.status, list);
  const hasBanks = !!banks?.length;
  const ms = new Date(o.expires_at).getTime() - Date.now();
  const left = ms > 0 ? `${Math.floor(ms / 3_600_000)} jam ${Math.floor((ms % 3_600_000) / 60_000)} menit` : "sudah lewat";
  const rejected = phase === "PROOF_REJECTED" ? list.find((p) => p.status === "REJECTED") : undefined;

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <div>
        <Breadcrumb crumbs={[{ href: "/", label: "Beranda" }, { href: "/orders", label: "Pesanan Saya" }, { label: o.order_number }]} />
        <span className="badge bg-brand-light text-brand"><Landmark aria-hidden className="mr-1 h-3.5 w-3.5" />TRANSFER BANK MANUAL</span>
        <h1 className="mt-2 text-3xl">Selesaikan Pembayaran</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">Pesanan <strong className="font-mono text-ink">#{o.order_number}</strong> · {new Date(o.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm"><span className="flex items-center gap-2"><span className="text-ink-mute">Status pesanan</span><StatusBadge status={o.status} /></span><span className="flex items-center gap-2"><span className="text-ink-mute">Status pembayaran</span><PaymentBadge phase={phase} /></span></div>
      </div>

      <div className="flex items-start gap-3 rounded-card bg-marigold-light p-4 text-marigold-dark"><Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm"><strong>Batas pembayaran {new Date(o.expires_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}.</strong> Tersisa <strong>{left}</strong>. Pesanan yang belum dibayar akan dibatalkan otomatis dan stoknya dilepas kembali. Pesanan dengan bukti yang sedang diperiksa admin tidak dibatalkan otomatis.</p></div>

      {rejected && <div role="alert" className="flex items-start gap-3 rounded-card bg-danger-light p-4 text-danger"><ShieldAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm"><strong>Bukti pembayaranmu ditolak.</strong> Alasan: {rejected.reject_reason ?? "-"}. Silakan transfer sesuai nominal (bila perlu) dan unggah bukti yang benar di bawah.</p></div>}

      <section className="card space-y-5 p-5 sm:p-6">
        <div className="rounded-card bg-brand-light p-5"><p className="text-sm text-ink-soft">Total yang harus ditransfer</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3"><p className="font-serif text-4xl font-semibold text-brand-dark">{formatRupiah(o.total)}</p><CopyButton text={String(o.total)} label="Salin nominal" /></div>
          <p className="mt-3 text-xs text-ink-soft">Transfer tepat sesuai nominal ini agar admin dapat mencocokkannya dengan mutasi rekening.</p></div>

        <div><h2 className="text-lg">Rekening Tujuan</h2>
          {!hasBanks ? <p role="alert" className="mt-3 rounded-card bg-danger-light p-3 text-sm text-danger">Rekening pembayaran belum tersedia. Mohon tunggu atau hubungi toko sebelum melakukan transfer; jangan transfer ke rekening yang tidak tercantum di halaman ini.</p> :
            <ul className="mt-3 space-y-3">{banks.map((b) => (
              <li key={b.id} className="rounded-card bg-paper p-4">
                <p className="text-sm font-semibold">{b.bank_name}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-xl font-semibold tracking-wide text-brand-dark">{b.account_number}</p><CopyButton text={b.account_number.replace(/\D/g, "")} label="Salin no. rekening" /></div>
                <p className="mt-1 text-sm text-ink-soft">Atas nama <strong className="text-ink">{b.account_holder}</strong></p></li>))}</ul>}</div>

        <div><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-mute"><ListChecks aria-hidden className="h-4 w-4" />Cara membayar</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
            <li>Buka aplikasi bank atau kanal perbankanmu.</li>
            <li>Transfer ke rekening yang tercantum di halaman ini.</li>
            <li>Pastikan nominal sama dengan total pesanan.</li>
            <li>Simpan bukti transaksi (foto atau tangkapan layar).</li>
            <li>Unggah bukti melalui form di bawah.</li>
            <li>Tunggu pemeriksaan admin.</li>
            <li>Pesanan diproses setelah pembayaran dikonfirmasi.</li></ol>
          <p className="mt-3 rounded-ctl bg-paper p-3 text-xs text-ink-soft"><strong>Penting:</strong> mengunggah bukti bukan berarti dana sudah diterima. Status pembayaran baru berubah menjadi Lunas setelah admin memverifikasi dana masuk.</p></div>
      </section>

      {phase === "AWAITING_VERIFICATION" && <p role="status" className="card flex items-start gap-3 border-l-4 border-l-brand p-4 text-sm"><Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />Bukti pembayaran berhasil dikirim dan sedang menunggu verifikasi. Pesanan akan diproses setelah dana dikonfirmasi oleh tim kami.</p>}
      {mayUpload && hasBanks && <PaymentProofForm orderId={o.id} total={o.total} />}

      {!!list.length && <section className="card p-5 sm:p-6"><h2 className="text-lg">Riwayat Bukti Pembayaran</h2>
        <ul className="mt-3 space-y-2 text-sm">{list.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-paper p-3"><span>{new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · <strong>{formatRupiah(p.amount)}</strong>{p.reject_reason && <span className="block text-xs text-danger">Alasan penolakan: {p.reject_reason}</span>}</span><span className={`badge ${PROOF[p.status].tone}`}>{PROOF[p.status].label}</span></li>)}</ul></section>}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5"><h2 className="text-lg">Tahapan Pesanan</h2><div className="mt-3"><PaymentTimeline steps={steps} /></div></section>
        <section className="card p-5"><h2 className="text-lg">Ringkasan Pesanan</h2>
          <ul className="mt-3 space-y-2 text-sm">{o.order_items.map((i: { id: string; title_snapshot: string; quantity: number; price_snapshot: number }) => <li key={i.id} className="flex justify-between gap-3"><span className="min-w-0">{i.title_snapshot} <span className="text-ink-mute">× {i.quantity}</span></span><span className="shrink-0">{formatRupiah(i.price_snapshot * i.quantity)}</span></li>)}</ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm"><div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatRupiah(o.subtotal)}</dd></div>{o.bundle_discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon paket</dt><dd>−{formatRupiah(o.bundle_discount)}</dd></div>}{o.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon</dt><dd>−{formatRupiah(o.discount)}</dd></div>}<div className="flex justify-between"><dt className="text-ink-soft">Ongkos kirim</dt><dd>{formatRupiah(o.shipping_cost)}</dd></div><div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatRupiah(o.total)}</dd></div></dl></section>
      </div>

      <section className="card p-5"><h2 className="flex items-center gap-2 text-lg"><HelpCircle aria-hidden className="h-5 w-5 text-brand" />Pertanyaan Umum</h2>
        <div className="mt-3 space-y-2 text-sm">
          <details className="rounded-card bg-paper p-3"><summary className="cursor-pointer font-medium">Berapa lama verifikasi?</summary><p className="mt-2 text-ink-soft">Waktu verifikasi bergantung pada pemeriksaan admin. Kamu akan menerima notifikasi di akunmu setelah bukti diperiksa.</p></details>
          <details className="rounded-card bg-paper p-3"><summary className="cursor-pointer font-medium">Nominal transfer saya berbeda, apa yang terjadi?</summary><p className="mt-2 text-ink-soft">Admin mencocokkan bukti dengan mutasi rekening. Jika nominal tidak sesuai, bukti dapat ditolak dan kamu diminta mengunggah bukti yang benar.</p></details>
          <details className="rounded-card bg-paper p-3"><summary className="cursor-pointer font-medium">Bukti saya ditolak, bagaimana?</summary><p className="mt-2 text-ink-soft">Alasan penolakan tampil di halaman ini. Kamu dapat mengunggah bukti baru selama pesanan belum dibatalkan.</p></details>
        </div></section>
      <Link href={`/orders/${o.id}`} className="btn-ghost">Lihat detail pesanan</Link>
    </div>
  );
}