import Link from "next/link";
import Image from "next/image";
import { ExternalLink, FileText, AlertTriangle } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ProofActions, MarkPaidButton } from "@/components/proof-actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { TabNav } from "@/components/tab-nav";
import { BankForm } from "@/components/bank-form";
import { ConfirmButton } from "@/components/row-actions";
import { toggleBankAccount, deleteBankAccount } from "@/actions/payment";
import { formatRupiah } from "@/lib/utils";
import { sweepExpiredOrders } from "@/lib/expiry";

export const metadata = { title: "Verifikasi Pembayaran" };
const TABS = ["verify", "waiting", "history", "banks"] as const;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  await sweepExpiredOrders();
  const q = (sp.q ?? "").replace(/[%_,()\\*]/g, "").trim().slice(0, 40);
  const dateOk = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "");
  const from = dateOk(sp.from), to = dateOk(sp.to);
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "verify";
  const db = createSupabaseAdmin();
  const [pendingC, waitingRows, banksC] = await Promise.all([
    db.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    db.from("orders").select("id, order_number, total, expires_at, created_at, payments!inner(provider)").eq("status", "PENDING_PAYMENT").eq("payments.provider", "manual").order("created_at"),
    db.from("bank_accounts").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  const pendingProofOrders = await db.from("payment_proofs").select("order_id").eq("status", "PENDING");
  const proofSet = new Set((pendingProofOrders.data ?? []).map((p) => p.order_id));
  const noProof = (waitingRows.data ?? []).filter((o) => !proofSet.has(o.id));
  const tabs = [{ href: "/admin/payments?tab=verify", label: "Menunggu Verifikasi", count: pendingC.count ?? 0 }, { href: "/admin/payments?tab=waiting", label: "Menunggu Pembayaran", count: noProof.length }, { href: "/admin/payments?tab=history", label: "Riwayat Verifikasi" }, { href: "/admin/payments?tab=banks", label: "Rekening Bank Toko", count: banksC.count ?? 0 }];

  let body: React.ReactNode = null;
  if (tab === "verify") {
    let pq = db.from("payment_proofs").select("id, file_path, sender_name, sender_bank, amount, transfer_date, note, created_at, orders!inner(id, order_number, total, expires_at, shipping_address)").eq("status", "PENDING").order("created_at");
    if (q) pq = pq.ilike("orders.order_number", `%${q}%`);
    if (from) pq = pq.gte("created_at", from);
    if (to) pq = pq.lte("created_at", `${to}T23:59:59`);
    const { data: proofs } = await pq;
    const list = await Promise.all((proofs ?? []).map(async (p) => ({ ...p, url: (await db.storage.from("payment-proofs").createSignedUrl(p.file_path, 600)).data?.signedUrl ?? null })));
    body = !list.length ? <p className="card p-8 text-center text-sm text-ink-mute">Tidak ada bukti yang menunggu verifikasi.</p> : (
      <div className="space-y-5">{list.map((p) => { const o = p.orders as unknown as { id: string; order_number: string; total: number; expires_at: string; shipping_address: { recipient_name: string } }; const isPdf = p.file_path.endsWith(".pdf"); const diff = p.amount - o.total;
        return (
          <article key={p.id} className="card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 bg-brand-light/60 px-5 py-3"><p className="flex flex-wrap items-center gap-2"><Link href={`/orders/${o.id}`} className="font-mono text-sm font-bold text-brand-dark underline">#{o.order_number}</Link><span className="text-sm text-ink-soft">{o.shipping_address.recipient_name}</span>{diff !== 0 && <span className="badge bg-marigold-light text-marigold-dark">Selisih nominal</span>}</p><p className="text-sm text-ink-soft">Total tagihan <strong className="ml-1 font-serif text-xl text-brand-dark">{formatRupiah(o.total)}</strong></p></header>
            {diff !== 0 && <p role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-card bg-danger-light p-3 text-sm text-danger"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Peringatan verifikasi:</strong> nominal klaim pengirim ({formatRupiah(p.amount)}) berselisih <strong>{formatRupiah(Math.abs(diff))} {diff < 0 ? "lebih rendah" : "lebih tinggi"}</strong> dari total tagihan. Cek mutasi sebelum menyetujui.</span></p>}
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_220px_1fr]">
              <section className="space-y-3 rounded-card bg-paper p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wide text-ink-mute">Identitas pengirim</p>
                <dl className="space-y-1.5"><div className="flex justify-between gap-2"><dt className="text-ink-soft">Nama rekening</dt><dd className="text-right font-medium">{p.sender_name}</dd></div><div className="flex justify-between gap-2"><dt className="text-ink-soft">Bank asal</dt><dd className="text-right">{p.sender_bank ?? "—"}</dd></div><div className="flex justify-between gap-2"><dt className="text-ink-soft">Tanggal transfer</dt><dd className="text-right">{p.transfer_date ?? "—"}</dd></div><div className="flex justify-between gap-2"><dt className="text-ink-soft">Nominal diklaim</dt><dd className="text-right font-bold text-leaf">{formatRupiah(p.amount)}</dd></div></dl>
                {p.note && <p className="rounded-ctl bg-white p-2 text-xs italic text-ink-soft">&ldquo;{p.note}&rdquo;</p>}
                <p className="text-[11px] text-ink-mute">Diunggah {new Date(p.created_at).toLocaleString("id-ID")} · pesanan kedaluwarsa {new Date(o.expires_at).toLocaleString("id-ID")}</p></section>
              <section className="space-y-2"><p className="text-xs font-bold uppercase tracking-wide text-ink-mute">Bukti transfer</p>
                <div className="relative aspect-[3/4] overflow-hidden rounded-card border border-line bg-surface-muted">{p.url && !isPdf ? <Image src={p.url} alt={`Bukti transfer ${o.order_number}`} fill unoptimized sizes="220px" className="object-cover" /> : <div className="grid h-full place-items-center text-ink-mute"><FileText aria-hidden className="h-10 w-10" /><span className="text-xs">Berkas PDF</span></div>}</div>
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="btn-ghost w-full !min-h-[38px] text-xs"><ExternalLink aria-hidden className="h-3.5 w-3.5" />Buka tab penuh</a> : <p className="text-xs text-danger">File tidak dapat dibuka</p>}</section>
              <section className="rounded-card border border-line p-4"><ProofActions proofId={p.id} total={o.total} claimed={p.amount} /></section>
            </div>
          </article>); })}</div>);
  } else if (tab === "waiting") {
    body = <section className="card divide-y divide-line text-sm">{noProof.map((o) => <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><span><span className="font-mono text-xs font-bold">#{o.order_number}</span><br /><span className="text-ink-soft">{formatRupiah(o.total)} · batas bayar {new Date(o.expires_at).toLocaleString("id-ID")}</span></span><MarkPaidButton orderId={o.id} total={o.total} /></div>)}{!noProof.length && <p className="p-6 text-center text-ink-mute">Tidak ada pesanan yang menunggu pembayaran tanpa bukti.</p>}</section>;
  } else if (tab === "history") {
    let hq = db.from("payment_proofs").select("id, status, reject_reason, amount, reviewed_at, orders!inner(order_number, shipping_address), profiles:reviewed_by(full_name)").neq("status", "PENDING").order("reviewed_at", { ascending: false }).limit(50);
    if (q) hq = hq.ilike("orders.order_number", `%${q}%`);
    if (from) hq = hq.gte("reviewed_at", from);
    if (to) hq = hq.lte("reviewed_at", `${to}T23:59:59`);
    const { data: done } = await hq;
    body = <section className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-5 py-3">Pesanan</th><th>Nominal</th><th>Keputusan</th><th>Waktu</th><th>Verifikator</th></tr></thead><tbody>
      {done?.map((d) => { const o = d.orders as unknown as { order_number: string; shipping_address: { recipient_name: string } }; return <tr key={d.id} className="border-t border-line"><td className="px-5 py-3"><span className="font-mono text-xs font-bold">#{o?.order_number}</span><br /><span className="text-xs text-ink-mute">{o?.shipping_address?.recipient_name}</span></td><td className="font-semibold">{formatRupiah(d.amount)}</td><td><span className={`badge ${d.status === "APPROVED" ? "bg-leaf-light text-leaf" : "bg-danger-light text-danger"}`}>{d.status === "APPROVED" ? "Disetujui" : "Ditolak"}</span>{d.reject_reason && <span className="block text-xs text-ink-mute">{d.reject_reason}</span>}</td><td className="text-ink-soft">{d.reviewed_at && new Date(d.reviewed_at).toLocaleString("id-ID")}</td><td>{(d.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"}</td></tr>; })}
      {!done?.length && <tr><td colSpan={5} className="p-6 text-center text-ink-mute">Belum ada riwayat.</td></tr>}</tbody></table></section>;
  } else {
    const { data: banks } = await db.from("bank_accounts").select("*").order("sort").order("created_at");
    body = (<div className="space-y-5"><section className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-5 py-3">Bank & nomor rekening</th><th>Atas nama</th><th>Status</th><th className="pr-5 text-right">Aksi</th></tr></thead><tbody>
      {banks?.map((b) => <tr key={b.id} className="border-t border-line"><td className="px-5 py-3"><span className="font-semibold">{b.bank_name}</span><br /><span className="font-mono text-xs text-ink-soft">{b.account_number}</span></td><td>{b.account_holder}</td><td><span className={`badge ${b.active ? "bg-leaf-light text-leaf" : "bg-surface-muted text-ink-soft"}`}>{b.active ? "Aktif" : "Nonaktif"}</span></td><td className="pr-5 text-right"><span className="inline-flex gap-3"><form action={toggleBankAccount.bind(null, b.id, !b.active)}><button className="text-brand underline">{b.active ? "Nonaktifkan" : "Aktifkan"}</button></form><ConfirmButton label="Hapus" confirmText="Hapus rekening ini?" action={deleteBankAccount.bind(null, b.id)} /></span></td></tr>)}
      {!banks?.length && <tr><td colSpan={4} className="p-6 text-center text-danger">Belum ada rekening. Tambahkan minimal satu agar pelanggan bisa membayar.</td></tr>}</tbody></table></section>
      <div><h2 className="mb-2 text-xl">Tambah rekening</h2><div className="max-w-xl"><BankForm /></div></div></div>);
  }

  return (
    <>
      <AdminPageHeader eyebrow="Kas & Perbankan" title="Verifikasi Pembayaran & Mutasi" subtitle="Cocokkan bukti transfer dengan mutasi rekening sebelum menyetujui. Menyetujui mengubah pesanan menjadi Dibayar dan memotong stok." />
      <TabNav label="Bagian pembayaran" tabs={tabs} active={`/admin/payments?tab=${tab}`} />
      {(tab === "verify" || tab === "history") && (
        <form className="card mb-4 flex flex-wrap items-end gap-3 p-3"><input type="hidden" name="tab" value={tab} />
          <div><label htmlFor="q" className="label !mb-1 text-xs">No. pesanan</label><input id="q" name="q" defaultValue={q} placeholder="TBE-..." className="input !w-48" /></div>
          <div><label htmlFor="from" className="label !mb-1 text-xs">Dari tanggal</label><input id="from" name="from" type="date" defaultValue={from} className="input !w-44" /></div>
          <div><label htmlFor="to" className="label !mb-1 text-xs">Sampai tanggal</label><input id="to" name="to" type="date" defaultValue={to} className="input !w-44" /></div>
          <button className="btn-primary">Terapkan</button>{(q || from || to) && <Link href={`/admin/payments?tab=${tab}`} className="btn-subtle">Reset</Link>}</form>
      )}
      {body}
    </>
  );
}