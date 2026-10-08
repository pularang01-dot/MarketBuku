"use client";
import { useState, useTransition } from "react";
import { approveProof, rejectProof, markPaidManually } from "@/actions/payment";
import { formatRupiah } from "@/lib/utils";

export function ProofActions({ proofId, total, claimed }: { proofId: string; total: number; claimed: number }) {
  const [amount, setAmount] = useState(String(total)); const [reason, setReason] = useState(""); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [p, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.message ?? "" }); });
  return (
    <div className="space-y-2">
      {claimed !== total && <p className="text-xs font-semibold text-danger">Nominal yang diklaim pelanggan ({formatRupiah(claimed)}) berbeda dari total pesanan ({formatRupiah(total)}).</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div><label className="label" htmlFor={`a${proofId}`}>Nominal diterima (cek mutasi)</label><input id={`a${proofId}`} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input !w-40" /></div>
        <button className="btn-primary" disabled={p} onClick={() => { if (confirm(`Setujui pembayaran ${formatRupiah(Number(amount))}? Pesanan akan menjadi Dibayar dan stok dipotong.`)) run(() => approveProof(proofId, Number(amount))); }}>Setujui</button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div><label className="label" htmlFor={`r${proofId}`}>Alasan penolakan</label><input id={`r${proofId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. nominal tidak sesuai" className="input !w-64" maxLength={200} /></div>
        <button className="btn-ghost !text-danger" disabled={p} onClick={() => run(() => rejectProof(proofId, reason))}>Tolak</button>
      </div>
      <p role="status" className={`text-sm ${msg?.ok ? "text-leaf" : "text-danger"}`}>{msg?.t}</p>
    </div>
  );
}

export function MarkPaidButton({ orderId, total }: { orderId: string; total: number }) {
  const [msg, setMsg] = useState(""); const [p, start] = useTransition();
  return (<span className="flex items-center gap-2"><button className="btn-ghost !min-h-[36px]" disabled={p} onClick={() => { if (confirm(`Tandai LUNAS ${formatRupiah(total)} tanpa bukti? Pastikan dana sudah masuk di mutasi rekening.`)) start(async () => { const r = await markPaidManually(orderId, total); setMsg(r.message ?? ""); }); }}>Tandai lunas</button><span role="status" className="text-xs">{msg}</span></span>);
}