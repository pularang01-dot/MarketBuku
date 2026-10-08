"use client";
import type { ActionState } from "@/types";
import { Field } from "./form-bits";
import { MapPicker, type ResolvedAddress } from "./map-picker";

export interface AddrValue { recipient_name?: string; phone?: string; province?: string; city?: string; district?: string; postal_code?: string; address_line?: string; latitude?: number | null; longitude?: number | null }

/** Address inputs + map pin. Controlled by the parent so saved addresses and map autofill both update the fields. */
export function AddressFields({ value, onChange, state }: { value: AddrValue; onChange: (patch: Partial<AddrValue>) => void; state: ActionState }) {
  const set = (k: keyof AddrValue) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: e.target.value });
  const resolve = (a: ResolvedAddress) => onChange({
    ...(a.province ? { province: a.province } : {}), ...(a.city ? { city: a.city } : {}), ...(a.district ? { district: a.district } : {}),
    ...(a.postal_code ? { postal_code: a.postal_code } : {}), ...(a.address_line && !value.address_line ? { address_line: a.address_line } : {}),
  });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="recipient_name" label="Nama penerima" state={state} value={value.recipient_name ?? ""} onChange={set("recipient_name")} required />
        <Field name="phone" label="No. HP" state={state} inputMode="tel" value={value.phone ?? ""} onChange={set("phone")} required />
      </div>
      <div className="panel p-4"><p className="label">Titik lokasi pengiriman (peta)</p>
        <MapPicker lat={value.latitude} lng={value.longitude} onChange={(latitude, longitude) => onChange({ latitude, longitude })} onResolve={resolve} /></div>
      <input type="hidden" name="latitude" value={value.latitude ?? ""} /><input type="hidden" name="longitude" value={value.longitude ?? ""} />
      {state?.errors?.latitude && <p className="field-error">{state.errors.latitude[0]}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="province" label="Provinsi" state={state} value={value.province ?? ""} onChange={set("province")} required />
        <Field name="city" label="Kota/Kabupaten" state={state} value={value.city ?? ""} onChange={set("city")} required />
        <Field name="district" label="Kecamatan" state={state} value={value.district ?? ""} onChange={set("district")} required />
        <Field name="postal_code" label="Kode pos" state={state} inputMode="numeric" maxLength={5} value={value.postal_code ?? ""} onChange={set("postal_code")} required />
      </div>
      <Field name="address_line" label="Alamat lengkap (jalan, nomor, RT/RW, patokan)" state={state} value={value.address_line ?? ""} onChange={set("address_line")} required />
    </div>
  );
}