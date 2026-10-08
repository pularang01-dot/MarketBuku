"use client";
import { useActionState, useState } from "react";
import { addAddress } from "@/actions/account";
import { AddressFields, type AddrValue } from "./address-fields";
import { Msg, Submit } from "./form-bits";

export function AddressForm() {
  const [state, action] = useActionState(addAddress, null);
  const [v, setV] = useState<AddrValue>({});
  return (
    <form action={action} className="card space-y-3 p-4">
      <AddressFields value={v} onChange={(p) => setV((a) => ({ ...a, ...p }))} state={state} />
      <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" name="is_default" /> Jadikan alamat utama</label>
      <Msg state={state} /><Submit>Simpan alamat</Submit>
    </form>
  );
}