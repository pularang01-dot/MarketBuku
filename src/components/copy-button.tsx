"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies text; always gives visible + screen-reader feedback, including when the clipboard is blocked. */
export function CopyButton({ text, label = "Salin" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("ok");
    } catch {
      // clipboard API blocked (insecure context / permissions): fall back to the legacy path
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        setState(ok ? "ok" : "fail");
      } catch { setState("fail"); }
    }
    setTimeout(() => setState("idle"), 2500);
  }
  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={copy} className="btn-ghost !min-h-[36px] !px-3 text-xs">
        {state === "ok" ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
        {state === "ok" ? "Tersalin" : label}
      </button>
      <span role="status" aria-live="polite" className={`mt-1 text-[11px] ${state === "fail" ? "text-danger" : "sr-only"}`}>
        {state === "ok" ? "Tersalin ke papan klip" : state === "fail" ? "Gagal menyalin. Salin secara manual." : ""}
      </span>
    </span>
  );
}