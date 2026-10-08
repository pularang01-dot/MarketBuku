"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { reviewSchema } from "@/schemas";
import { validateUpload, IMAGE_RULE, randomName } from "@/lib/upload";
import type { ActionState } from "@/types";

export async function submitReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Masuk dulu untuk menulis ulasan." };
  const p = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };

  const supabase = await createSupabaseServer();
  // RLS policy also enforces has_purchased(); this gives a friendly error.
  const { data: ok } = await supabase.rpc("has_purchased", { p_book: p.data.book_id });
  if (!ok) return { ok: false, message: "Ulasan hanya untuk pembeli buku ini." };

  const { data: review, error } = await supabase.from("reviews").insert({ ...p.data, user_id: user.id, status: "PENDING" }).select("id").single();
  if (error) return { ok: false, message: error.code === "23505" ? "Kamu sudah mengulas buku ini." : "Gagal menyimpan ulasan." };

  const img = fd.get("image");
  if (img instanceof File && img.size > 0) {
    const v = await validateUpload(img, { ...IMAGE_RULE, maxBytes: 3 * 1024 * 1024 });
    if (v.ok) {
      const path = `${user.id}/${randomName(v.ext)}`;
      const db = createSupabaseAdmin();
      const { error: upErr } = await db.storage.from("review-images").upload(path, img, { contentType: img.type });
      if (!upErr) await db.from("review_images").insert({ review_id: review.id, path });
    }
  }
  await supabase.from("user_events").insert({ user_id: user.id, type: "review", book_id: p.data.book_id });
  revalidatePath("/account/reviews");
  return { ok: true, message: "Terima kasih! Ulasanmu akan tampil setelah dimoderasi." };
}
