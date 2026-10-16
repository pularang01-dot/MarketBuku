"use client";
import { useActionState } from "react";
import { savePromotion } from "@/actions/promotions";
import { Field, Msg, Submit } from "./form-bits";
import { ScopePicker, type ScopeOptions } from "./scope-picker";
import { toWibInput } from "@/lib/wib";

export interface PromoRow { id?: string; title?: string; description?: string | null; benefit_type?: string | null; benefit_value?: number; max_discount?: number | null; min_purchase?: number; scope_type?: string; scope_ids?: string[]; priority?: number; stackable_with_coupon?: boolean; starts_at?: string | null; ends_at?: string | null; active?: boolean }

export function PromotionForm({ promo = {}, options }: { promo?: PromoRow; options: ScopeOptions }) {
  const [s, action] = useActionState(savePromotion, null);
  const err = (k: string) => s?.errors?.[k]?.[0];
  return (
    <form action={action} className="card space-y-4 p-4">
      {promo.id && <input type="hidden" name="id" value={promo.id} />}
      <Field name="title" label="Nama promosi" state={s} defaultValue={promo.title} required />
      <Field name="description" label="Deskripsi (tampil di halaman Promo)" state={s} defaultValue={promo.description ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label htmlFor="benefit_type" className="label">Jenis diskon</label>
          <select id="benefit_type" name="benefit_type" defaultValue={promo.benefit_type ?? "NONE"} className="input"><option value="NONE">Hanya banner (tanpa diskon)</option><option value="PERCENT">Persen (%)</option><option value="FIXED">Nominal per buku (Rp)</option></select></div>
        <Field name="benefit_value" label="Nilai (% atau Rp)" type="number" min={0} state={s} defaultValue={promo.benefit_value ?? 0} />
        <Field name="max_discount" label="Maks. diskon per buku (Rp, opsional)" type="number" min={1} state={s} defaultValue={promo.max_discount ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="min_purchase" label="Minimal belanja produk eligible (Rp)" type="number" min={0} state={s} defaultValue={promo.min_purchase ?? 0} />
        <Field name="priority" label="Prioritas (angka lebih besar menang)" type="number" state={s} defaultValue={promo.priority ?? 0} />
        <div className="flex flex-col justify-end gap-1 text-sm"><label className="flex min-h-[40px] items-center gap-2"><input type="checkbox" name="stackable_with_coupon" defaultChecked={promo.stackable_with_coupon ?? true} className="h-4 w-4 accent-[#1F3A5F]" />Boleh digabung dengan kupon</label>
          <label className="flex min-h-[40px] items-center gap-2"><input type="checkbox" name="active" defaultChecked={promo.active ?? true} className="h-4 w-4 accent-[#1F3A5F]" />Aktif</label></div>
      </div>
      <ScopePicker options={options} initialType={promo.scope_type ?? "ALL"} initialIds={promo.scope_ids ?? []} error={err("scope_ids")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor={`ps${promo.id ?? "new"}`} className="label">Mulai (WIB)</label><input id={`ps${promo.id ?? "new"}`} name="starts_at" type="datetime-local" defaultValue={toWibInput(promo.starts_at)} className="input" /></div>
        <div><label htmlFor={`pe${promo.id ?? "new"}`} className="label">Berakhir (WIB, tidak termasuk)</label><input id={`pe${promo.id ?? "new"}`} name="ends_at" type="datetime-local" defaultValue={toWibInput(promo.ends_at)} className="input" aria-invalid={!!err("ends_at")} />{err("ends_at") && <p className="field-error">{err("ends_at")}</p>}</div>
      </div>
      <p className="text-xs text-ink-mute">Diskon dihitung dari harga normal. Jika harga jual (diskon manual) lebih murah, harga jual yang dipakai — diskon tidak pernah ganda. Perubahan hanya berlaku untuk perhitungan berikutnya.</p>
      <Msg state={s} /><Submit>{promo.id ? "Simpan perubahan" : "Buat promosi"}</Submit>
    </form>
  );
}