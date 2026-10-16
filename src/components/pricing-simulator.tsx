"use client";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { simulatePricing } from "@/actions/coupons";
import { formatRupiah } from "@/lib/utils";
import type { Quote } from "@/lib/pricing/types";

type Row = { bookId: string; qty: number };

export function PricingSimulator({ books }: { books: { id: string; title: string; price: number }[] }) {
  const [rows, setRows] = useState<Row[]>([{ bookId: books[0]?.id ?? "", qty: 1 }]);
  const [coupon, setCoupon] = useState(""); const [ship, setShip] = useState(9000);
  const [res, setRes] = useState<{ quote?: Quote; message?: string } | null>(null);
  const [p, start] = useTransition();
  const upd = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const q = res?.quote;
  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`sb${i}`}>Buku</label>
            <select id={`sb${i}`} value={r.bookId} onChange={(e) => upd(i, { bookId: e.target.value })} className="input min-w-0 flex-1">{books.map((b) => <option key={b.id} value={b.id}>{b.title} — {formatRupiah(b.price)}</option>)}</select>
            <label className="sr-only" htmlFor={`sq${i}`}>Jumlah</label>
            <input id={`sq${i}`} type="number" min={1} max={99} value={r.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) || 1 })} className="input !w-24" />
            <button type="button" aria-label="Hapus baris" onClick={() => setRows((x) => x.filter((_, k) => k !== i))} disabled={rows.length === 1} className="grid h-10 w-10 place-items-center rounded-ctl text-ink-mute hover:bg-danger-light hover:text-danger disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
          </div>))}
        <button type="button" className="btn-ghost !min-h-[38px]" onClick={() => setRows((r) => [...r, { bookId: books[0]?.id ?? "", qty: 1 }])}><Plus aria-hidden className="h-4 w-4" />Tambah buku</button>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="sim-coupon" className="label !mb-1 text-xs">Kode kupon (opsional)</label><input id="sim-coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="input" autoCapitalize="characters" /></div>
          <div><label htmlFor="sim-ship" className="label !mb-1 text-xs">Ongkir (Rp)</label><input id="sim-ship" type="number" min={0} value={ship} onChange={(e) => setShip(Number(e.target.value) || 0)} className="input" /></div>
        </div>
        <button type="button" className="btn-primary" disabled={p} onClick={() => start(async () => setRes(await simulatePricing(rows.map((r) => ({ bookId: r.bookId, quantity: r.qty })), coupon, ship)))}>{p ? "Menghitung..." : "Simulasikan"}</button>
        <p className="text-xs text-ink-mute">Memakai mesin harga yang sama dengan keranjang dan checkout. Tidak menyimpan apa pun. Batas per akun dihitung atas nama akun adminmu.</p>
      </div>
      {res?.message && <p role="alert" className="rounded-card bg-danger-light p-3 text-sm text-danger">{res.message}</p>}
      {q && (
        <div className="card space-y-3 p-4" aria-live="polite">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-ink-mute"><tr><th className="py-2">Buku</th><th>Qty</th><th>Harga jual</th><th>Promosi</th><th className="text-right">Bersih</th></tr></thead>
            <tbody>{q.lines.map((l) => <tr key={l.bookId} className="border-t border-line"><td className="py-2 pr-2">{l.title}</td><td>{l.quantity}</td><td>{formatRupiah(l.sellingUnit)}</td><td>{l.promoId ? <span className="text-leaf">{l.promoTitle}: −{formatRupiah(l.promoUnitDiscount)}/buku</span> : <span className="text-ink-mute">tidak ada</span>}</td><td className="text-right font-semibold">{formatRupiah(l.lineNet)}</td></tr>)}</tbody></table></div>
          <dl className="ml-auto max-w-sm space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatRupiah(q.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Promosi otomatis</dt><dd>−{formatRupiah(q.promoDiscount)}</dd></div>
            <div className="flex justify-between"><dt>Diskon paket</dt><dd>−{formatRupiah(q.bundleDiscount)}</dd></div>
            <div className="flex justify-between"><dt>Kupon {q.coupon?.code}</dt><dd>−{formatRupiah(q.coupon?.discount ?? 0)}</dd></div>
            <div className="flex justify-between"><dt>Ongkir</dt><dd>{formatRupiah(q.shippingCost)}</dd></div>
            <div className="flex justify-between"><dt>Diskon ongkir</dt><dd>−{formatRupiah(q.shippingDiscount)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1 text-base font-bold"><dt>Total</dt><dd>{formatRupiah(q.total)}</dd></div>
          </dl>
          {q.couponError && <p role="alert" className="rounded-ctl bg-danger-light px-3 py-2 text-sm text-danger">Kupon tidak diterapkan: {q.couponError.message}</p>}
          {q.coupon && <p className="text-xs text-ink-mute">Basis eligible kupon: {formatRupiah(q.coupon.eligibleBase)} (setelah promosi dan bagian proporsional diskon paket).</p>}
          <p className="text-xs text-ink-mute">Dievaluasi {new Date(q.evaluatedAt).toLocaleString("id-ID")}.</p>
        </div>)}
    </div>
  );
}