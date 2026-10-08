import Link from "next/link";
import { PAGE_SIZE } from "@/lib/catalog-const";
export function Pagination({ page, pages, params, base, total }: { page: number; pages: number; params: Record<string, string | undefined>; base: string; total?: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => { const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && k !== "page" && u.set(k, v)); u.set("page", String(p)); return `${base}?${u}`; };
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const from = (page - 1) * PAGE_SIZE + 1, to = total ? Math.min(page * PAGE_SIZE, total) : page * PAGE_SIZE;
  return (
    <nav aria-label="Halaman" className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
      <p className="text-ink-soft">{total ? <>Menampilkan <strong>{from}–{to}</strong> dari <strong>{total}</strong> buku</> : `Halaman ${page} dari ${pages}`}</p>
      <ul className="flex items-center gap-1.5">
        <li>{page > 1 ? <Link className="btn-ghost !min-h-[40px]" href={href(page - 1)} rel="prev">Sebelumnya</Link> : <span className="btn !min-h-[40px] bg-surface-muted text-ink-mute">Sebelumnya</span>}</li>
        {nums.map((n, i) => <li key={n} className="flex items-center">{i > 0 && nums[i - 1] !== n - 1 && <span className="px-1 text-ink-mute">…</span>}<Link href={href(n)} aria-current={n === page ? "page" : undefined} className={`grid h-10 w-10 place-items-center rounded-ctl font-medium ${n === page ? "bg-brand text-white" : "text-ink-soft hover:bg-brand-light"}`}>{n}</Link></li>)}
        <li>{page < pages ? <Link className="btn-ghost !min-h-[40px]" href={href(page + 1)} rel="next">Berikutnya</Link> : <span className="btn !min-h-[40px] bg-surface-muted text-ink-mute">Berikutnya</span>}</li>
      </ul>
    </nav>
  );
}