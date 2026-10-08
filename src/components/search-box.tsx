"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { suggestAction } from "@/actions/search";

export function SearchBox({ large = false }: { large?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ label: string; href: string; kind: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return; }
    const id = ++seq.current;
    const t = setTimeout(() => start(async () => {
      const r = await suggestAction(q);
      if (id === seq.current) { setItems(r); setOpen(true); }
    }), 250); // debounce
    return () => clearTimeout(t);
  }, [q]);

  return (
    <form role="search" className="relative w-full" onSubmit={(e) => { e.preventDefault(); setOpen(false); router.push(`/books?q=${encodeURIComponent(q.trim())}`); }}>
      <label htmlFor={large ? "hero-q" : "nav-q"} className="sr-only">Cari buku</label>
      <input id={large ? "hero-q" : "nav-q"} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => items.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Cari judul, penulis, ISBN, mata pelajaran..." autoComplete="off" maxLength={80}
        className={`input pl-11 ${large ? "!min-h-[52px] text-base" : ""}`} />
      <Search aria-hidden className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute ${pending ? "animate-pulse" : ""}`} />
      {open && items.length > 0 && (
        <ul className="card absolute z-50 mt-2 w-full overflow-hidden p-1 text-sm shadow-float" role="listbox">
          {items.map((s) => (
            <li key={s.href} role="option" aria-selected="false"><Link href={s.href} className="flex items-center justify-between rounded px-3 py-2 hover:bg-brand-light"><span className="truncate">{s.label}</span><span className="badge bg-brand-light text-brand">{s.kind}</span></Link></li>
          ))}
        </ul>
      )}
      <span role="status" className="sr-only">{pending ? "Mencari" : items.length ? `${items.length} saran` : ""}</span>
    </form>
  );
}