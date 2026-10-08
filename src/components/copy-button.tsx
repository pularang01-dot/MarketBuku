"use client";
import { useState } from "react";
export function CopyButton({ text, label = "Salin" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="btn-ghost !min-h-[36px] !px-3" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}>{done ? "Tersalin ✓" : label}</button>;
}