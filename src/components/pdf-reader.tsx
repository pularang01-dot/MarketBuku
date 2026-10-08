"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { addBookmark, removeBookmark, saveProgress } from "@/actions/reader";

interface BM { id: string; page: number; label: string | null }

export function PdfReader({ bookId, url, title, startPage, bookmarks, totalPages }: { bookId: string; url: string; title: string; startPage: number; bookmarks: BM[]; totalPages: number | null }) {
  const [page, setPage] = useState(startPage);
  const [src, setSrc] = useState(`${url}#page=${startPage}&zoom=page-width`);
  const [bms, setBms] = useState(bookmarks);
  const [label, setLabel] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();
  const first = useRef(true);
  const max = totalPages ?? 5000;

  const go = (p: number) => { const n = Math.min(Math.max(1, p), max); setPage(n); setSrc(`${url}#page=${n}&zoom=page-width&t=${Date.now() % 1000}`); };

  // debounced auto-save of reading position ("resume" support)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(async () => { const r = await saveProgress(bookId, page); setSaved(r.ok ? "Posisi tersimpan" : ""); }, 800);
    return () => clearTimeout(t);
  }, [page, bookId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => go(page - 1)} aria-label="Halaman sebelumnya">‹</button>
          <label htmlFor="pg" className="sr-only">Halaman</label>
          <input id="pg" type="number" min={1} max={max} value={page} onChange={(e) => setPage(Number(e.target.value) || 1)} onBlur={() => go(page)} onKeyDown={(e) => e.key === "Enter" && go(page)} className="input !w-20 text-center" />
          {totalPages && <span className="text-sm text-ink-mute">/ {totalPages}</span>}
          <button className="btn-ghost" onClick={() => go(page + 1)} aria-label="Halaman berikutnya">›</button>
          <span role="status" className="text-xs text-leaf">{saved}</span>
        </div>
        <iframe key={src} title={title} src={src} className="h-[78vh] w-full rounded-card border bg-white" />
        <p className="mt-2 text-xs text-ink-mute">Zoom dan pencarian teks tersedia di toolbar penampil PDF (atau Ctrl/Cmd+F). Tautan file berlaku 5 menit; muat ulang halaman jika kedaluwarsa. Ini bukan DRM.</p>
      </div>
      <aside className="card h-fit space-y-3 p-3">
        <h2 className="text-lg font-bold">Penanda</h2>
        <div className="flex gap-2"><label htmlFor="bm" className="sr-only">Label penanda</label><input id="bm" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (opsional)" maxLength={80} className="input" />
          <button className="btn-primary" disabled={pending} onClick={() => start(async () => { const r = await addBookmark(bookId, page, label); if (r.ok && r.bookmark) { setBms((b) => [...b, r.bookmark!].sort((x, y) => x.page - y.page)); setLabel(""); } })}>+</button></div>
        <ul className="space-y-1 text-sm">
          {bms.map((b) => (<li key={b.id} className="flex items-center justify-between gap-2"><button className="text-left text-brand underline" onClick={() => go(b.page)}>Hal. {b.page}{b.label ? ` — ${b.label}` : ""}</button><button aria-label="Hapus penanda" className="text-danger" onClick={() => start(async () => { await removeBookmark(b.id); setBms((x) => x.filter((y) => y.id !== b.id)); })}>✕</button></li>))}
          {!bms.length && <li className="text-ink-mute">Belum ada penanda.</li>}
        </ul>
      </aside>
    </div>
  );
}
