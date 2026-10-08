"use client";
import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { removeFromCart, updateCartQty } from "@/actions/cart";

export function CartControls({ bookId, quantity, max }: { bookId: string; quantity: number; max: number | null }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-ctl border border-line bg-white">
        <button aria-label="Kurangi jumlah" className="grid h-10 w-10 place-items-center text-ink-soft hover:text-brand disabled:opacity-40" disabled={pending || quantity <= 1} onClick={() => start(async () => { await updateCartQty(bookId, quantity - 1); })}><Minus className="h-4 w-4" /></button>
        <span className="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
        <button aria-label="Tambah jumlah" className="grid h-10 w-10 place-items-center text-ink-soft hover:text-brand disabled:opacity-40" disabled={pending || (max !== null && quantity >= max)} onClick={() => start(async () => { await updateCartQty(bookId, quantity + 1); })}><Plus className="h-4 w-4" /></button>
      </div>
      <button aria-label="Hapus dari keranjang" className="grid h-10 w-10 place-items-center rounded-ctl text-ink-mute hover:bg-danger-light hover:text-danger" disabled={pending} onClick={() => start(async () => { await removeFromCart(bookId); })}><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}