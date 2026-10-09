export function AdminPageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>{eyebrow && <p className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">{eyebrow}</p>}<h1 className="text-3xl">{title}</h1>{subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}