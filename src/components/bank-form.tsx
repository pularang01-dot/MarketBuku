"use client";
import { useActionState } from "react";
import { saveBankAccount } from "@/actions/payment";
import { Field, Msg, Submit } from "./form-bits";
export function BankForm() {
  const [s, a] = useActionState(saveBankAccount, null);
  return (<form action={a} className="card space-y-3 p-4"><Field name="bank_name" label="Nama bank" state={s} placeholder="BCA / BRI / Mandiri / BNI" required /><Field name="account_number" label="Nomor rekening" state={s} inputMode="numeric" required /><Field name="account_holder" label="Atas nama" state={s} required /><Msg state={s} /><Submit>Tambah rekening</Submit></form>);
}