"use client";
import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/actions/admin";
import { allowedTransitions, STATUS_LABEL, type OrderStatus } from "@/lib/order-state";

const isoDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export function OrderStatusForm({ id, status, hasPhysical = true }: { id: string; status: OrderStatus; hasPhysical?: boolean }) {
  const options = allowedTransitions(status, hasPhysical);
  const today = new Date();
  const [to, setTo] = useState<string>(options[0] ?? "");
  const [track, setTrack] = useState("");
  const [eta, setEta] = useState(isoDate(new Date(today.getTime() + 3 * 864e5))); // editable default: 3 days
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [p, start] = useTransition();
  if (!options.length) return <span className="text-xs text-ink-mute">Tidak ada aksi</span>;
  // `to` may be stale after the order moved to a new status (options changed); always use what the select really shows
  const value = (options as string[]).includes(to) ? to : options[0];
  const shipping = value === "SHIPPED";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`s${id}`}>Status baru</label>
        <select id={`s${id}`} value={value} onChange={(e) => setTo(e.target.value)} className="input !min-h-[38px] !w-44">{options.map((o) => <option key={o} value={o}>{STATUS_LABEL[o]}</option>)}</select>
        <button className="btn-ghost !min-h-[38px]" disabled={p} onClick={() => {
          if (["CANCELLED", "REFUNDED"].includes(value) && !confirm("Yakin? Tindakan ini tidak bisa dibatalkan. Untuk pembayaran manual, pengembalian dana ke pelanggan harus kamu transfer sendiri.")) return;
          start(async () => { const r = await updateOrderStatus(id, value as OrderStatus, track, shipping ? eta : undefined); setMsg({ ok: r.ok, t: r.message ?? "" }); });
        }}>Terapkan</button>
      </div>
      {shipping && (
        <div className="grid gap-2 rounded-card bg-paper p-3 sm:grid-cols-2">
          <div><label className="label !mb-1 text-xs" htmlFor={`t${id}`}>Nomor resi *</label><input id={`t${id}`} value={track} onChange={(e) => setTrack(e.target.value)} placeholder="mis. JNE1234567890" maxLength={60} className="input !min-h-[38px]" /></div>
          <div><label className="label !mb-1 text-xs" htmlFor={`e${id}`}>Perkiraan tiba</label><input id={`e${id}`} type="date" value={eta} min={isoDate(today)} onChange={(e) => setEta(e.target.value)} className="input !min-h-[38px]" /></div>
          <p className="text-[11px] text-ink-mute sm:col-span-2">Resi dan perkiraan tiba ditampilkan kepada pembeli di halaman pesanan dan dikirim lewat notifikasi.</p>
        </div>
      )}
      <p role="status" className={`text-xs ${msg?.ok ? "text-leaf" : "text-danger"}`}>{msg?.t}</p>
    </div>
  );
}