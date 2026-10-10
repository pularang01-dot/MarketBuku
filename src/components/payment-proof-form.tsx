"use client";
import { useActionState } from "react";
import { submitPaymentProof } from "@/actions/payment";
import { Field, Msg, Submit } from "./form-bits";
import { FileDrop } from "./file-drop";

export function PaymentProofForm({ orderId, total }: { orderId: string; total: number }) {
  const [state, action] = useActionState(submitPaymentProof, null);
  return (
    <form action={action} className="card space-y-4 p-5 sm:p-6">
      <div><h2 className="text-xl">Unggah Bukti Pembayaran</h2><p className="mt-1 text-sm text-ink-soft">Lengkapi data transfer agar admin dapat mencocokkannya dengan mutasi rekening.</p></div>
      <input type="hidden" name="order_id" value={orderId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="sender_name" label="Nama pemilik rekening pengirim *" state={state} required />
        <Field name="sender_bank" label="Bank pengirim" state={state} placeholder="mis. BCA, BRI, Mandiri" />
        <Field name="amount" label="Nominal yang ditransfer (Rp) *" type="number" state={state} defaultValue={total} min={1} required />
        <Field name="transfer_date" label="Tanggal transfer" type="date" state={state} />
      </div>
      <Field name="note" label="Catatan tambahan (opsional)" state={state} />
      <FileDrop name="proof" accept="image/jpeg,image/png,image/webp" label="Foto / tangkapan layar bukti transfer *" error={state?.errors?.proof?.[0]} />
      <Msg state={state} /><Submit className="btn-primary w-full">Kirim Bukti Pembayaran</Submit>
    </form>
  );
}