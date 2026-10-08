import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ProofActions, MarkPaidButton } from "@/components/proof-actions";
import { formatRupiah } from "@/lib/utils";

export const metadata = { title: "Verifikasi Pembayaran" };

export default async function AdminPayments() {
  const db = createSupabaseAdmin();
  const [{ data: proofs }, { data: waiting }, { data: done }] = await Promise.all([
    db.from("payment_proofs").select("id, file_path, sender_name, sender_bank, amount, transfer_date, note, created_at, orders(id, order_number, total, expires_at, shipping_address)").eq("status", "PENDING").order("created_at"),
    db.from("orders").select("id, order_number, total, expires_at, created_at, payments!inner(provider)").eq("status", "PENDING_PAYMENT").eq("payments.provider", "manual").order("created_at"),
    db.from("payment_proofs").select("id, status, reject_reason, amount, reviewed_at, orders(order_number)").neq("status", "PENDING").order("reviewed_at", { ascending: false }).limit(15),
  ]);
  const withUrls = await Promise.all((proofs ?? []).map(async (p) => ({ ...p, url: (await db.storage.from("payment-proofs").createSignedUrl(p.file_path, 600)).data?.signedUrl ?? null })));
  const proofOrderIds = new Set((proofs ?? []).map((p) => (p.orders as unknown as { id: string }).id));
  const noProof = (waiting ?? []).filter((o) => !proofOrderIds.has(o.id));

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold">Verifikasi Pembayaran</h1><p className="text-sm text-ink-soft">Cocokkan bukti dengan mutasi rekening sebelum menyetujui. Menyetujui akan mengubah pesanan menjadi Dibayar dan memotong stok.</p></div>
      <section><h2 className="mb-2 text-xl font-bold">Menunggu verifikasi ({withUrls.length})</h2>
        {!withUrls.length ? <p className="card p-4 text-sm text-ink-mute">Tidak ada bukti yang menunggu.</p> :
          <ul className="space-y-3">{withUrls.map((p) => { const o = p.orders as unknown as { id: string; order_number: string; total: number; expires_at: string; shipping_address: { recipient_name: string } };
            return (<li key={p.id} className="card space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><p><Link href={`/orders/${o.id}`} className="font-bold text-brand underline">{o.order_number}</Link> · total {formatRupiah(o.total)} · {o.shipping_address.recipient_name}</p>{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="btn-ghost !min-h-[36px]">Lihat bukti</a> : <span className="text-danger">File tidak dapat dibuka</span>}</div>
              <p className="text-ink-soft">Pengirim: <strong>{p.sender_name}</strong>{p.sender_bank ? ` (${p.sender_bank})` : ""} · klaim {formatRupiah(p.amount)}{p.transfer_date ? ` · tgl ${p.transfer_date}` : ""}{p.note ? ` · "${p.note}"` : ""}</p>
              <p className="text-xs text-ink-mute">Diunggah {new Date(p.created_at).toLocaleString("id-ID")} · pesanan kedaluwarsa {new Date(o.expires_at).toLocaleString("id-ID")}</p>
              <ProofActions proofId={p.id} total={o.total} claimed={p.amount} /></li>); })}</ul>}
      </section>
      <section><h2 className="mb-2 text-xl font-bold">Menunggu pembayaran, belum ada bukti ({noProof.length})</h2>
        <ul className="card divide-y text-sm">{noProof.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span>{o.order_number} · {formatRupiah(o.total)} · batas {new Date(o.expires_at).toLocaleString("id-ID")}</span><MarkPaidButton orderId={o.id} total={o.total} /></li>)}{!noProof.length && <li className="p-3 text-ink-mute">Tidak ada.</li>}</ul>
      </section>
      <section><h2 className="mb-2 text-xl font-bold">Riwayat verifikasi</h2>
        <ul className="card divide-y text-sm">{done?.map((d) => <li key={d.id} className="p-3">{(d.orders as unknown as { order_number: string })?.order_number} · {formatRupiah(d.amount)} · <strong>{d.status === "APPROVED" ? "Disetujui" : "Ditolak"}</strong>{d.reject_reason ? ` — ${d.reject_reason}` : ""} · {d.reviewed_at && new Date(d.reviewed_at).toLocaleString("id-ID")}</li>)}{!done?.length && <li className="p-3 text-ink-mute">Belum ada.</li>}</ul>
      </section>
    </div>
  );
}