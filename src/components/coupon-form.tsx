"use client";
import { useActionState } from "react";
import { saveCoupon } from "@/actions/coupons";
import { Field, Msg, Submit } from "./form-bits";
import { CheckList, ScopePicker, type Opt, type ScopeOptions } from "./scope-picker";
import { toWibInput } from "@/lib/wib";

export interface CouponRow { id?: string; code?: string; type?: string; value?: number; min_purchase?: number; max_discount?: number | null; usage_limit?: number | null; per_user_limit?: number; scope_type?: string; scope_ids?: string[]; exclude_book_ids?: string[]; starts_at?: string | null; ends_at?: string | null; stackable_with_promo?: boolean; is_public?: boolean; active?: boolean }

export function CouponForm({ coupon = {}, options, books }: { coupon?: CouponRow; options: ScopeOptions; books: Opt[] }) {
  const [s, action] = useActionState(saveCoupon, null);
  const err = (k: string) => s?.errors?.[k]?.[0];
  const key = coupon.id ?? "new";
  return (
    <form action={action} className="card space-y-4 p-4">
      {coupon.id && <input type="hidden" name="id" value={coupon.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="code" label="Kode kupon" state={s} defaultValue={coupon.code} required autoCapitalize="characters" />
        <div><label htmlFor={`t${key}`} className="label">Jenis</label><select id={`t${key}`} name="type" defaultValue={coupon.type ?? "PERCENT"} className="input"><option value="PERCENT">Persen (%)</option><option value="FIXED">Nominal (Rp)</option><option value="FREE_SHIPPING">Gratis ongkir</option></select></div>
        <Field name="value" label="Nilai (% atau Rp; 0 untuk gratis ongkir)" type="number" min={0} state={s} defaultValue={coupon.value ?? 0} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field name="min_purchase" label="Minimal belanja eligible (Rp)" type="number" min={0} state={s} defaultValue={coupon.min_purchase ?? 0} />
        <Field name="max_discount" label="Maks. diskon (Rp, kupon persen)" type="number" min={1} state={s} defaultValue={coupon.max_discount ?? ""} />
        <Field name="usage_limit" label="Kuota total (kosong = tanpa batas)" type="number" min={1} state={s} defaultValue={coupon.usage_limit ?? ""} />
        <Field name="per_user_limit" label="Batas per akun" type="number" min={1} state={s} defaultValue={coupon.per_user_limit ?? 1} />
      </div>
      <ScopePicker options={options} initialType={coupon.scope_type ?? "ALL"} initialIds={coupon.scope_ids ?? []} error={err("scope_ids")} />
      <CheckList name="exclude_book_ids" legend="Buku yang dikecualikan (opsional)" options={books} selected={coupon.exclude_book_ids ?? []} error={err("exclude_book_ids")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor={`cs${key}`} className="label">Mulai (WIB)</label><input id={`cs${key}`} name="starts_at" type="datetime-local" defaultValue={toWibInput(coupon.starts_at)} className="input" /></div>
        <div><label htmlFor={`ce${key}`} className="label">Berakhir (WIB, tidak termasuk)</label><input id={`ce${key}`} name="ends_at" type="datetime-local" defaultValue={toWibInput(coupon.ends_at)} className="input" aria-invalid={!!err("ends_at")} />{err("ends_at") && <p className="field-error">{err("ends_at")}</p>}</div>
      </div>
      <div className="flex flex-wrap gap-x-6 text-sm">
        {([["stackable_with_promo", "Boleh digabung dengan promosi otomatis", coupon.stackable_with_promo ?? true], ["is_public", "Tampilkan di halaman Promo", coupon.is_public ?? false], ["active", "Aktif", coupon.active ?? true]] as const).map(([n, l, v]) => <label key={n} className="flex min-h-[40px] items-center gap-2"><input type="checkbox" name={n} defaultChecked={v} className="h-4 w-4 accent-[#1F3A5F]" />{l}</label>)}
      </div>
      <Msg state={s} /><Submit>{coupon.id ? "Simpan perubahan" : "Buat kupon"}</Submit>
    </form>
  );
}