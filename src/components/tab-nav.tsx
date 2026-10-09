import Link from "next/link";
/** Server-rendered tab bar; the page decides which tab is active. */
export function TabNav({ tabs, active, label }: { tabs: { href: string; label: string; count?: number }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-6 flex gap-2 overflow-x-auto rounded-card bg-surface-muted p-1.5">
      {tabs.map((t) => { const on = t.href === active; return (
        <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-ctl px-4 py-2 text-sm transition ${on ? "bg-white font-semibold text-brand-dark shadow-float" : "text-ink-soft hover:text-brand"}`}>
          {t.label}{t.count != null && t.count > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-pill px-1.5 text-[11px] font-bold ${on ? "bg-brand text-white" : "bg-white text-ink-soft"}`}>{t.count}</span>}</Link>); })}
    </nav>
  );
}