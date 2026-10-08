import { Breadcrumb } from "./breadcrumb";
export function PageHeader({ title, subtitle, crumbs = [], aside }: { title: string; subtitle?: string; crumbs?: { href?: string; label: string }[]; aside?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {crumbs.length > 0 && <Breadcrumb crumbs={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl sm:text-[34px]">{title}</h1>{subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}</div>{aside}</div>
    </div>
  );
}