"use client";
import { useMemo, useState } from "react";

export type Opt = { id: string; name: string };
export interface ScopeOptions { CATEGORY: Opt[]; SUBJECT: Opt[]; LEVEL: Opt[]; GRADE: Opt[]; BOOK: Opt[] }
const LABEL: Record<string, string> = { ALL: "Semua buku", CATEGORY: "Kategori tertentu", SUBJECT: "Mata pelajaran tertentu", LEVEL: "Jenjang tertentu", GRADE: "Kelas tertentu", BOOK: "Buku tertentu" };

/** A searchable checkbox list. Only checked values are submitted under `name`. */
export function CheckList({ name, options, selected = [], legend, error }: { name: string; options: Opt[]; selected?: string[]; legend: string; error?: string }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));
  const shown = useMemo(() => options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())).slice(0, 200), [options, q]);
  return (
    <fieldset className="rounded-card border border-line p-3">
      <legend className="px-1 text-sm font-medium">{legend} <span className="text-xs text-ink-mute">({picked.size} dipilih)</span></legend>
      {options.length > 8 && <input aria-label={`Cari ${legend}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." className="input !min-h-[36px] mb-2" />}
      {/* keep selections that are filtered out of view submitted */}
      {[...picked].filter((id) => !shown.some((o) => o.id === id)).map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
        {shown.map((o) => (
          <label key={o.id} className="flex min-h-[34px] items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={o.id} checked={picked.has(o.id)} className="h-4 w-4 accent-[#1F3A5F]"
              onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(o.id); else n.delete(o.id); return n; })} />{o.name}
          </label>))}
        {!shown.length && <p className="text-xs text-ink-mute">Tidak ada pilihan.</p>}
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}

export function ScopePicker({ options, initialType = "ALL", initialIds = [], error }: { options: ScopeOptions; initialType?: string; initialIds?: string[]; error?: string }) {
  const [type, setType] = useState(initialType);
  return (
    <div className="space-y-2">
      <div><label htmlFor="scope_type" className="label">Cakupan produk</label>
        <select id="scope_type" name="scope_type" value={type} onChange={(e) => setType(e.target.value)} className="input">{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      {type !== "ALL" && <CheckList key={type} name="scope_ids" legend={LABEL[type]} options={options[type as keyof ScopeOptions]} selected={type === initialType ? initialIds : []} error={error} />}
    </div>
  );
}