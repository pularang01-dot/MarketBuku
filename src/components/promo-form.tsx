"use client";
import { useActionState } from "react";
import { savePromotion } from "@/actions/admin-content";
import { Field, Msg, Submit } from "./form-bits";
export function PromoForm({ promo }: { promo?: { id: string; title: string; description: string | null; active: boolean; starts_at: string | null; ends_at: string | null } }) {
  const [s, a] = useActionState(savePromotion, null);
  const d = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");
  return (<form action={a} className="card space-y-3 p-4">{promo && <input type="hidden" name="id" value={promo.id} />}
    <Field name="title" label="Judul promo" state={s} defaultValue={promo?.title} required /><Field name="description" label="Deskripsi" state={s} defaultValue={promo?.description ?? ""} />
    <div className="grid gap-3 sm:grid-cols-2"><Field name="starts_at" label="Mulai" type="date" state={s} defaultValue={d(promo?.starts_at)} /><Field name="ends_at" label="Berakhir" type="date" state={s} defaultValue={d(promo?.ends_at)} /></div>
    <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="active" defaultChecked={promo?.active ?? true} /> Aktif</label><Msg state={s} /><Submit>Simpan promo</Submit></form>);
}
