"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TicketPercent, X } from "lucide-react";
import { applyCoupon, removeCoupon } from "@/actions/coupon";

/** Coupon entry. Deliberately NOT a <form>, so it can live inside the checkout <form>. All validation happens on the server. */
export function CouponBox({ applied, error, loggedIn }: { applied: { code: string; label: string } | null; error: string | null; loggedIn: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.message }); if (r.ok) { setCode(""); router.refresh(); } });

  return (
    <div className="space-y-2" aria-live="polite">
      {applied ? (
        <div className="flex items-center justify-between gap-2 rounded-card bg-leaf-light p-3 text-sm text-leaf">
          <span className="flex items-center gap-2"><CheckCircle2 aria-hidden className="h-4 w-4 shrink-0" /><span><strong className="font-mono">{applied.code}</strong> · {applied.label}</span></span>
          <button type="button" disabled={pending} onClick={() => run(removeCoupon)} className="inline-flex items-center gap-1 text-xs font-semibold underline"><X aria-hidden className="h-3 w-3" />Hapus</button>
        </div>
      ) : (
        <>
          <label htmlFor="coupon-code" className="label !mb-1 flex items-center gap-1.5"><TicketPercent aria-hidden className="h-4 w-4 text-brand" />Kode kupon</label>
          {!loggedIn && <p className="text-xs text-ink-mute">Masuk ke akunmu untuk memakai kupon.</p>}
          <div className="flex gap-2">
            <input id="coupon-code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (code.trim()) run(() => applyCoupon(code)); } }}
              placeholder="mis. BELAJAR10" autoCapitalize="characters" autoComplete="off" maxLength={40} className="input min-w-0 flex-1" />
            <button type="button" disabled={pending || !code.trim()} onClick={() => run(() => applyCoupon(code))} className="btn-ghost">{pending ? "Memeriksa..." : "Terapkan"}</button>
          </div>
        </>
      )}
      {error && !msg && <p role="alert" className="rounded-ctl bg-danger-light px-3 py-2 text-xs text-danger">Kupon <strong>{applied?.code}</strong> tidak lagi berlaku: {error}</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-ctl px-3 py-2 text-xs ${msg.ok ? "bg-leaf-light text-leaf" : "bg-danger-light text-danger"}`}>{msg.t}</p>}
    </div>
  );
}