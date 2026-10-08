"use client";
import { useActionState } from "react";
import { saveSettings } from "@/actions/admin-content";
import { Field, Msg, Submit } from "./form-bits";
export function SettingsForm({ v }: { v: Record<string, string> }) {
  const [s, a] = useActionState(saveSettings, null);
  return (<form action={a} className="card space-y-3 p-4"><Field name="store_name" label="Nama toko" state={s} defaultValue={v.store_name ?? "Toko Buku Edukasi"} /><Field name="support_email" label="Email bantuan" state={s} defaultValue={v.support_email ?? ""} /><Field name="support_whatsapp" label="WhatsApp bantuan" state={s} defaultValue={v.support_whatsapp ?? ""} /><Field name="announcement" label="Pengumuman (tampil di atas situs; kosongkan untuk menyembunyikan)" state={s} defaultValue={v.announcement ?? ""} /><Field name="low_stock_default" label="Ambang stok menipis bawaan" type="number" state={s} defaultValue={v.low_stock_default ?? "5"} /><Msg state={s} /><Submit>Simpan pengaturan</Submit></form>);
}
