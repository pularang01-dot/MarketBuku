import Link from "next/link";
export function Breadcrumb({ crumbs }: { crumbs: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs text-ink-mute">
      <ol className="flex flex-wrap items-center gap-1.5">{crumbs.map((c, i) => <li key={i} className="flex min-w-0 items-center gap-1.5">{i > 0 && <span aria-hidden>›</span>}{c.href ? <Link href={c.href} className="hover:text-brand">{c.label}</Link> : <span className="truncate text-ink-soft" aria-current="page">{c.label}</span>}</li>)}</ol>
    </nav>
  );
}