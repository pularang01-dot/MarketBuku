"use client";
import { useActionState } from "react";
import { adjustStock } from "@/actions/admin";
import { Msg, Submit } from "./form-bits";
export function StockForm({ bookId }: { bookId: string }) {
  const [s, a] = useActionState(adjustStock, null);
  return (<form action={a} className="flex flex-wrap items-center gap-2"><input type="hidden" name="book_id" value={bookId} /><label className="sr-only" htmlFor={`d${bookId}`}>Perubahan</label><input id={`d${bookId}`} name="delta" type="number" className="input !min-h-[38px] !w-20" placeholder="+/−" required />
    <label className="sr-only" htmlFor={`t${bookId}`}>Jenis</label><select id={`t${bookId}`} name="type" className="input !min-h-[38px] !w-28"><option value="restock">Restock</option><option value="adjustment">Koreksi</option><option value="return">Retur</option></select>
    <input name="note" placeholder="Catatan" className="input !min-h-[38px] !w-32" maxLength={200} /><Submit className="btn-ghost !min-h-[38px]">Simpan</Submit><Msg state={s} /></form>);
}