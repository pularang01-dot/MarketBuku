"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { addToCart } from "@/actions/cart";

export function QuickAdd({ bookId, disabled }: { bookId: string; disabled?: boolean }) {
  const router = useRouter();
  const [p, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button type="button" disabled={disabled || p} aria-label={disabled ? "Stok habis" : "Tambah ke keranjang"}
      className="inline-flex h-10 items-center gap-1.5 rounded-ctl bg-brand-light px-3 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      onClick={() => start(async () => { const r = await addToCart(bookId, 1); if (r.ok) { setDone(true); router.refresh(); setTimeout(() => setDone(false), 1500); } })}>
      <ShoppingBag aria-hidden className="h-4 w-4" />{done ? "✓" : "Beli"}
    </button>
  );
}