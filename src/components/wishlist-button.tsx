"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/actions/wishlist";

export function WishlistButton({ bookId, initial, variant = "icon" }: { bookId: string; initial: boolean; variant?: "icon" | "button" }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [opt, setOpt] = useOptimistic(saved);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const cls = variant === "button"
    ? "grid h-11 w-12 place-items-center rounded-ctl border border-brand bg-white text-brand hover:bg-brand-light disabled:opacity-60"
    : "grid h-9 w-9 place-items-center rounded-pill border border-line bg-white/95 hover:border-brand disabled:opacity-60";
  return (
    <button type="button" disabled={pending} aria-pressed={opt} aria-label={opt ? "Hapus dari wishlist" : "Simpan ke wishlist"} className={cls}
      onClick={() => start(async () => {
        setErr(""); setOpt(!saved);
        const r = await toggleWishlist(bookId);
        if ("needLogin" in r && r.needLogin) { router.push("/login"); return; }
        if (r.ok && "saved" in r) { setSaved(!!r.saved); router.refresh(); } else setErr(r.message ?? "Gagal");
      })}>
      <Heart className={`h-[18px] w-[18px] ${opt ? "fill-danger text-danger" : "text-ink-soft"}`} />
      {err && <span role="alert" className="sr-only">{err}</span>}
    </button>
  );
}