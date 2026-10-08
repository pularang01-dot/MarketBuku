"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ links, label, exact = [] }: { links: [string, string][]; label: string; exact?: string[] }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="card flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
      {links.map(([h, l]) => {
        const active = exact.includes(h) ? path === h : path === h || path.startsWith(h + "/");
        return <Link key={h} href={h} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-ctl px-3 py-2.5 text-sm transition ${active ? "bg-brand-light font-semibold text-brand-dark" : "text-ink-soft hover:bg-surface-muted hover:text-brand"}`}>{l}</Link>;
      })}
    </nav>
  );
}