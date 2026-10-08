import Link from "next/link";
type Opt = { name: string; slug: string };
const group = "border-b border-line pb-4 last:border-0 last:pb-0";
export function Filters({ tax, sp, action = "/books" }: { tax: { levels: Opt[]; grades: Opt[]; subjects: Opt[]; categories: Opt[] }; sp: Record<string, string | undefined>; action?: string }) {
  const sel = (name: string, label: string, opts: Opt[]) => (
    <div className={group}><label htmlFor={`f-${name}`} className="label">{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={sp[name] ?? ""} className="input"><option value="">Semua</option>{opts.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></div>
  );
  return (
    <form action={action} method="get" className="card space-y-4 p-4">
      <p className="font-serif text-lg font-semibold text-brand-dark">Filter</p>
      <div className={group}><label htmlFor="f-q" className="label">Pencarian</label><input id="f-q" name="q" defaultValue={sp.q ?? ""} placeholder="Judul, penulis, ISBN..." className="input" /></div>
      {sel("level", "Jenjang sekolah", tax.levels)}{sel("grade", "Tingkat kelas", tax.grades)}{sel("subject", "Mata pelajaran", tax.subjects)}{sel("category", "Kategori buku", tax.categories)}
      <div className={group}><label htmlFor="f-format" className="label">Format</label>
        <select id="f-format" name="format" defaultValue={sp.format ?? ""} className="input"><option value="">Semua</option><option value="PRINT">Buku cetak</option><option value="EBOOK">E-book</option><option value="MODULE">Modul digital</option></select></div>
      <div className={group}><p className="label">Rentang harga (Rp)</p>
        <div className="grid grid-cols-2 gap-2"><label className="sr-only" htmlFor="f-min">Harga minimum</label><input id="f-min" name="min" inputMode="numeric" placeholder="Min" defaultValue={sp.min ?? ""} className="input" /><label className="sr-only" htmlFor="f-max">Harga maksimum</label><input id="f-max" name="max" inputMode="numeric" placeholder="Maks" defaultValue={sp.max ?? ""} className="input" /></div></div>
      <fieldset className={group}><legend className="label">Rating minimal</legend>
        {[["", "Semua"], ["4", "4,0 ke atas"], ["3", "3,0 ke atas"]].map(([v, l]) => <label key={v} className="flex min-h-[36px] items-center gap-2 text-sm"><input type="radio" name="rating" value={v} defaultChecked={(sp.rating ?? "") === v} className="h-4 w-4 accent-[#1F3A5F]" />{l}</label>)}</fieldset>
      <label className="flex min-h-[44px] items-center justify-between gap-2 text-sm font-medium">Hanya yang tersedia<input type="checkbox" name="available" value="1" defaultChecked={sp.available === "1"} className="h-5 w-5 accent-[#1F3A5F]" /></label>
      {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
      <button className="btn-primary w-full">Terapkan Filter</button>
      <Link href={action} className="block text-center text-xs text-ink-mute hover:text-brand">Reset semua filter</Link>
    </form>
  );
}