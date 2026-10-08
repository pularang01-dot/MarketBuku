"use client";
import { useState, useTransition } from "react";

export function ConfirmButton({ action, label, confirmText = "Yakin?", className = "text-danger underline" }: { action: () => Promise<unknown>; label: string; confirmText?: string; className?: string }) {
  const [p, start] = useTransition();
  return <button className={className} disabled={p} onClick={() => { if (confirm(confirmText)) start(async () => { await action(); }); }}>{p ? "..." : label}</button>;
}

export function RenameInline({ action, initial }: { action: (name: string) => Promise<{ ok: boolean; message?: string } | undefined>; initial: string }) {
  const [v, setV] = useState(initial); const [m, setM] = useState(""); const [p, start] = useTransition();
  return (<span className="flex items-center gap-1"><label className="sr-only">Nama</label><input value={v} onChange={(e) => setV(e.target.value)} className="input !min-h-[36px] !w-48" /><button className="btn-ghost !min-h-[36px]" disabled={p || v === initial} onClick={() => start(async () => { const r = await action(v); setM(r?.ok ? "✓" : r?.message ?? "Gagal"); })}>Simpan</button><span role="status" className="text-xs">{m}</span></span>);
}
