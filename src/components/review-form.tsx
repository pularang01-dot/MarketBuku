"use client";
import { useActionState } from "react";
import { submitReview } from "@/actions/review";
import { Submit, Msg } from "./form-bits";

export function ReviewForm({ bookId }: { bookId: string }) {
  const [state, action] = useActionState(submitReview, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <input type="hidden" name="book_id" value={bookId} />
      <fieldset><legend className="label">Penilaian</legend><div className="flex gap-3">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="flex min-h-[44px] items-center gap-1"><input type="radio" name="rating" value={n} required /> {n}★</label>)}</div></fieldset>
      <div><label htmlFor="body" className="label">Ulasanmu</label><textarea id="body" name="body" rows={4} className="input !py-2" minLength={10} maxLength={2000} required />{state?.errors?.body && <p className="field-error">{state.errors.body[0]}</p>}</div>
      <div><label htmlFor="image" className="label">Foto (opsional, maks 3 MB)</label><input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" /></div>
      <Msg state={state} /><Submit>Kirim Ulasan</Submit>
    </form>
  );
}