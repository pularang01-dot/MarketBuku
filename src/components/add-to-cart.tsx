"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { addToCart } from "@/actions/cart";

export function AddToCart({ bookId, max, disabled }: { bookId: string; max: number | null; disabled?: boolean }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const limit = max ?? 99;
  const run = (buyNow: boolean) => start(async () => {
    const r = await addToCart(bookId, qty);
    setMsg({ ok: r.ok, text: r.message ?? "" });
    if (r.ok && buyNow) router.push("/checkout");
    else if (r.ok) router.refresh();
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-sm font-medium">Jumlah</label>
        <div className="flex items-center rounded-ctl border border-line bg-white">
          <button type="button" aria-label="Kurangi jumlah" className="grid h-11 w-11 place-items-center text-ink-soft hover:text-brand disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={disabled || qty <= 1}><Minus className="h-4 w-4" /></button>
          <input id="qty" inputMode="numeric" readOnly value={qty} className="w-10 bg-transparent text-center font-semibold" aria-live="polite" />
          <button type="button" aria-label="Tambah jumlah" className="grid h-11 w-11 place-items-center text-ink-soft hover:text-brand disabled:opacity-40" onClick={() => setQty((q) => Math.min(limit, q + 1))} disabled={disabled || qty >= limit}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={disabled || pending} onClick={() => run(false)}><ShoppingBag aria-hidden className="h-4 w-4" />{pending ? "Menambahkan..." : "Masukkan Keranjang"}</button>
        <button className="btn-ghost flex-1" disabled={disabled || pending} onClick={() => run(true)}>Beli Sekarang</button>
      </div>
      <p role="status" className={`text-sm ${msg?.ok ? "text-leaf" : "text-danger"}`}>{msg?.text}</p>
    </div>
  );
}