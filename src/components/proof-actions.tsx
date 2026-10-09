"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, CircleX } from "lucide-react";
import { approveProof, rejectProof, markPaidManually } from "@/actions/payment";
import { formatRupiah } from "@/lib/utils";

export function ProofActions({ proofId, total, claimed }: { proofId: string; total: number; claimed: number }) {
  const [amount, setAmount] = useState(String(total)); const [reason, setReason] = useState(""); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [p, start] = useTransition();
  const n = Number(amount); const match = n === total; const diff = n - total;
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.message ?? "" }); });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">Penyesuaian mutasi bank</p>{match ? <span className="badge bg-leaf-light text-leaf">Cocok 100%</span> : <span className="badge bg-danger-light text-danger">Selisih {diff > 0 ? "+" : "−"}{formatRupiah(Math.abs(diff))}</span>}</div>
      <div><label className="label !mb-1 text-xs" htmlFor={`a${proofId}`}>Nominal diterima di mutasi rekening (Rp)</label>
        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">Rp</span><input id={`a${proofId}`} type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`input pl-10 font-semibold ${match ? "" : "!border-danger text-danger"}`} /></div>
        {claimed !== total && <p className="mt-1 text-xs text-danger">Pelanggan mengklaim {formatRupiah(claimed)}; total pesanan {formatRupiah(total)}.</p>}</div>
      <button className="btn-primary w-full" disabled={p || !match} title={match ? undefined : "Nominal harus sama dengan total pesanan"} onClick={() => { if (confirm(`Setujui pembayaran ${formatRupiah(n)}? Pesanan akan menjadi Dibayar dan stok dipotong.`)) run(() => approveProof(proofId, n)); }}><CheckCircle2 aria-hidden className="h-4 w-4" />Setujui Pembayaran</button>
      {!match && <p className="text-xs text-ink-mute">Tombol setuju aktif bila nominal sama dengan total pesanan. Jika kurang bayar, tolak dan minta bukti baru.</p>}
      <div><label className="label !mb-1 text-xs" htmlFor={`r${proofId}`}>Alasan penolakan</label><input id={`r${proofId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. nominal kurang Rp 20.000" className="input" maxLength={200} /></div>
      <button className="btn w-full border border-danger bg-white text-danger hover:bg-danger-light" disabled={p} onClick={() => run(() => rejectProof(proofId, reason))}><CircleX aria-hidden className="h-4 w-4" />Tolak & Minta Bukti Baru</button>
      <p role="status" className={`text-sm ${msg?.ok ? "text-leaf" : "text-danger"}`}>{msg?.t}</p>
    </div>
  );
}

export function MarkPaidButton({ orderId, total }: { orderId: string; total: number }) {
  const [msg, setMsg] = useState(""); const [p, start] = useTransition();
  return (<span className="flex items-center gap-2"><button className="btn-ghost !min-h-[36px] text-xs" disabled={p} onClick={() => { if (confirm(`Tandai LUNAS ${formatRupiah(total)} tanpa bukti? Pastikan dana sudah masuk di mutasi rekening.`)) start(async () => { const r = await markPaidManually(orderId, total); setMsg(r.message ?? ""); }); }}>Tandai lunas</button><span role="status" className="text-xs">{msg}</span></span>);
}