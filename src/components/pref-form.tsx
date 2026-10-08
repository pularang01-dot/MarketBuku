"use client";
import { useActionState } from "react";
import type { ActionState } from "@/types";
import { Msg, Submit } from "./form-bits";
type O = { name: string; slug: string };
export function PrefForm({ action, tax, pref }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; tax: { levels: O[]; grades: O[]; subjects: O[] }; pref: { education_level_slug?: string | null; grade_slug?: string | null; subject_slugs?: string[] } | null }) {
  const [state, run] = useActionState(action, null);
  return (
    <form action={run} className="card space-y-3 p-4">
      <div><label htmlFor="level" className="label">Jenjang</label><select id="level" name="level" defaultValue={pref?.education_level_slug ?? ""} className="input"><option value="">—</option>{tax.levels.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></div>
      <div><label htmlFor="grade" className="label">Kelas</label><select id="grade" name="grade" defaultValue={pref?.grade_slug ?? ""} className="input"><option value="">—</option>{tax.grades.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></div>
      <fieldset><legend className="label">Mata pelajaran</legend><div className="flex flex-wrap gap-2">{tax.subjects.map((s) => <label key={s.slug} className="flex min-h-[44px] items-center gap-2 rounded-pill border px-3 text-sm"><input type="checkbox" name="subjects" value={s.slug} defaultChecked={pref?.subject_slugs?.includes(s.slug)} />{s.name}</label>)}</div></fieldset>
      <Msg state={state} /><Submit>Simpan</Submit>
    </form>
  );
}
