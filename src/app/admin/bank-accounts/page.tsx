import { createSupabaseAdmin } from "@/lib/supabase/server";
import { BankForm } from "@/components/bank-form";
import { ConfirmButton } from "@/components/row-actions";
import { toggleBankAccount, deleteBankAccount } from "@/actions/payment";
export const metadata = { title: "Rekening Toko" };
export default async function BankAccounts() {
  const { data } = await createSupabaseAdmin().from("bank_accounts").select("*").order("sort").order("created_at");
  return (<><h1 className="mb-1 text-3xl font-bold">Rekening Toko</h1><p className="mb-4 text-sm text-ink-soft">Rekening aktif akan ditampilkan kepada pelanggan di halaman pembayaran.</p>
    <ul className="card mb-6 divide-y text-sm">{data?.map((b) => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span><strong>{b.bank_name}</strong> · <span className="font-mono">{b.account_number}</span> · a.n. {b.account_holder} {b.active ? "" : <em className="text-ink-mute">(nonaktif)</em>}</span><span className="flex gap-3"><form action={toggleBankAccount.bind(null, b.id, !b.active)}><button className="text-brand underline">{b.active ? "Nonaktifkan" : "Aktifkan"}</button></form><ConfirmButton label="Hapus" confirmText="Hapus rekening ini?" action={deleteBankAccount.bind(null, b.id)} /></span></li>)}{!data?.length && <li className="p-3 text-danger">Belum ada rekening. Tambahkan minimal satu agar pelanggan bisa membayar.</li>}</ul>
    <h2 className="mb-2 text-xl font-bold">Tambah rekening</h2><BankForm /></>);
}