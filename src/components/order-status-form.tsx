"use client";
import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/actions/admin";
import { ORDER_TRANSITIONS, ADMIN_SETTABLE, STATUS_LABEL, type OrderStatus } from "@/lib/order-state";
export function OrderStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const options = ORDER_TRANSITIONS[status].filter((s) => ADMIN_SETTABLE.includes(s));
  const [to, setTo] = useState<string>(options[0] ?? ""); const [track, setTrack] = useState(""); const [msg, setMsg] = useState(""); const [p, start] = useTransition();
  if (!options.length) return <span className="text-xs text-ink-mute">Tidak ada aksi</span>;
  return (<div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`s${id}`}>Status baru</label><select id={`s${id}`} value={to} onChange={(e) => setTo(e.target.value)} className="input !w-40">{options.map((o) => <option key={o} value={o}>{STATUS_LABEL[o]}</option>)}</select>
    {to === "SHIPPED" && <input aria-label="Nomor resi" value={track} onChange={(e) => setTrack(e.target.value)} placeholder="No. resi" className="input !w-36" />}
    <button className="btn-ghost" disabled={p} onClick={() => { if (["CANCELLED", "REFUNDED"].includes(to) && !confirm("Yakin? Tindakan ini tidak bisa dibatalkan. Untuk pembayaran manual, pengembalian dana ke pelanggan harus kamu transfer sendiri.")) return; start(async () => { const r = await updateOrderStatus(id, to as OrderStatus, track); setMsg(r.message ?? ""); }); }}>Terapkan</button><span role="status" className="text-xs">{msg}</span></div>);
}