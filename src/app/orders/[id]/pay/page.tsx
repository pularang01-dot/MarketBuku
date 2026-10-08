import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Landmark, CheckCircle2, ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CopyButton } from "@/components/copy-button";
import { PaymentProofForm } from "@/components/payment-proof-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Pembayaran", robots: { index: false } };
const PROOF: Record<string, { label: string; tone: string }> = { PENDING: { label: "Menunggu verifikasi admin", tone: "bg-marigold-light text-marigold-dark" }, APPROVED: { label: "Disetujui", tone: "bg-leaf-light text-leaf" }, REJECTED: { label: "Ditolak", tone: "bg-danger-light text-danger" } };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/orders/${id}/pay`);
  const supabase = await createSupabaseServer();
  const [{ data: o }, { data: banks }, { data: proofs }] = await Promise.all([
    supabase.from("orders").select("id, order_number, total, status, expires_at").eq("id", id).maybeSingle(), // RLS: owner only
    supabase.from("bank_accounts").select("*").eq("active", true).order("sort").order("created_at"),
    supabase.from("payment_proofs").select("id, status, reject_reason, amount, created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!o) notFound();
  if (o.status !== "PENDING_PAYMENT") redirect(`/orders/${id}`);
  const hasPending = proofs?.some((p) => p.status === "PENDING");
  const ms = new Date(o.expires_at).getTime() - Date.now();
  const left = ms > 0 ? `${Math.floor(ms / 3_600_000)} jam ${Math.floor((ms % 3_600_000) / 60_000)} menit` : "sudah lewat";

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div><Breadcrumb crumbs={[{ href: "/", label: "Beranda" }, { href: "/orders", label: "Pesanan Saya" }, { label: o.order_number }]} />
        <span className="badge bg-brand-light text-brand"><Landmark aria-hidden className="mr-1 h-3.5 w-3.5" />TRANSFER BANK MANUAL</span>
        <h1 className="mt-2 text-3xl">Pembayaran Pesanan #{o.order_number}</h1></div>

      <div className="flex items-start gap-3 rounded-card bg-marigold-light p-4 text-marigold-dark"><Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm"><strong>Bayar sebelum {new Date(o.expires_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}.</strong> Tersisa <strong>{left}</strong>. Setelah batas waktu, pesanan dibatalkan otomatis dan stok dilepas kembali.</p></div>

      <section className="card space-y-5 p-5 sm:p-6">
        <div className="rounded-card bg-brand-light p-5"><p className="text-sm text-ink-soft">Total pembayaran tepat</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3"><p className="font-serif text-4xl font-semibold text-brand-dark">{formatRupiah(o.total)}</p><CopyButton text={String(o.total)} label="Salin nominal" /></div>
          <p className="mt-3 text-xs text-ink-soft">Transfer sesuai nominal di atas agar pencocokan mutasi rekening berjalan lancar.</p></div>

        <div><h2 className="text-lg">Rekening Resmi Toko</h2>
          {!banks?.length ? <p role="alert" className="mt-3 rounded-card bg-danger-light p-3 text-sm text-danger">Rekening toko belum diatur. Hubungi admin sebelum melakukan transfer.</p> :
            <ul className="mt-3 space-y-3">{banks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-paper p-4">
                <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-ctl border border-line bg-white text-xs font-bold text-brand">{b.bank_name.slice(0, 3).toUpperCase()}</span>
                  <div><p className="text-sm font-semibold">{b.bank_name}</p><p className="font-mono text-xl font-semibold tracking-wide text-brand-dark">{b.account_number}</p><p className="text-xs text-ink-soft">a.n. {b.account_holder}</p></div></div>
                <CopyButton text={b.account_number.replace(/\D/g, "")} label="Salin no. rekening" /></li>))}</ul>}</div>

        <div><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-mute"><ListChecks aria-hidden className="h-4 w-4" />Petunjuk pembayaran</p>
          <ol className="grid gap-3 sm:grid-cols-3">{[["Transfer tepat", "Kirim jumlah sesuai nominal ke salah satu rekening di atas."], ["Simpan struk", "Simpan bukti transfer atau tangkapan layar dari m-banking/ATM."], ["Unggah bukti", "Isi data dan unggah bukti di bawah; admin akan memverifikasi."]].map(([t, d], i) => (
            <li key={t} className="rounded-card bg-paper p-4"><span className="grid h-7 w-7 place-items-center rounded-pill bg-brand text-sm font-bold text-white">{i + 1}</span><p className="mt-2 font-semibold">{t}</p><p className="mt-0.5 text-xs text-ink-soft">{d}</p></li>))}</ol></div>
      </section>

      {hasPending ? <p role="status" className="card flex items-start gap-3 border-l-4 border-l-marigold p-4 text-sm"><CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-marigold-dark" />Bukti kamu sedang diperiksa admin. Kamu akan menerima notifikasi setelah diverifikasi.</p> : <PaymentProofForm orderId={o.id} total={o.total} />}

      {!!proofs?.length && <section className="card p-5 sm:p-6"><h2 className="text-lg">Status & Riwayat Verifikasi</h2>
        <ul className="mt-3 space-y-2 text-sm">{proofs.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-paper p-3"><span>{new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · <strong>{formatRupiah(p.amount)}</strong>{p.reject_reason && <span className="block text-xs text-danger">Alasan penolakan: {p.reject_reason}</span>}</span><span className={`badge ${PROOF[p.status].tone}`}>{PROOF[p.status].label}</span></li>)}</ul></section>}
      <Link href={`/orders/${o.id}`} className="btn-ghost">Kembali ke detail pesanan</Link>
    </div>
  );
}