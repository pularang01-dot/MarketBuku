"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="btn-ghost !min-h-[36px] !px-3 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}>{done ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}{done ? "Tersalin" : "Salin Kode"}</button>;
}