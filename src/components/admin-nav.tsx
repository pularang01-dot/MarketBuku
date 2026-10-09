"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Boxes, Building2, Gift, GraduationCap, Landmark, LayoutDashboard, Library, Megaphone, MessageSquareText, Newspaper, PackageCheck, ReceiptText, Settings, Tags, TicketPercent, UserRound } from "lucide-react";

const ICONS = { Activity, Boxes, Building2, Gift, GraduationCap, Landmark, LayoutDashboard, Library, Megaphone, MessageSquareText, Newspaper, PackageCheck, ReceiptText, Settings, Tags, TicketPercent, UserRound };
type Group = { title: string; items: { href: string; label: string; icon: keyof typeof ICONS }[] };

export function AdminNav({ groups }: { groups: Group[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-4">
      {groups.map((g) => (
        <div key={g.title}><p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-mute">{g.title}</p>
          <ul className="space-y-0.5">{g.items.map((i) => {
            const Icon = ICONS[i.icon]; const active = path === i.href || path.startsWith(i.href + "/");
            return <li key={i.href}><Link href={i.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-ctl px-3 py-2.5 text-sm transition ${active ? "bg-brand-light font-semibold text-brand-dark" : "text-ink-soft hover:bg-surface-muted hover:text-brand"}`}><Icon aria-hidden className="h-[18px] w-[18px]" />{i.label}</Link></li>;
          })}</ul></div>
      ))}
    </nav>
  );
}