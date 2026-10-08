import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { PdfReader } from "@/components/pdf-reader";

export const metadata = { title: "Pembaca", robots: { index: false } };

export default async function Reader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/reader/${id}`);
  const supabase = await createSupabaseServer();
  const { data: ent } = await supabase.from("digital_entitlements").select("book_id, book:books(title)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!ent) notFound();
  const db = createSupabaseAdmin();
  const { data: file } = await db.from("digital_products").select("storage_path, page_count").eq("book_id", ent.book_id).maybeSingle();
  if (!file) return <p className="card p-6">File digital belum tersedia. Hubungi admin.</p>;
  const { data: signed } = await db.storage.from("digital").createSignedUrl(file.storage_path, 300);
  const { data: prog } = await supabase.from("reading_progress").select("page").eq("user_id", user.id).eq("book_id", ent.book_id).maybeSingle();
  const { data: bms } = await supabase.from("reading_bookmarks").select("id, page, label").eq("user_id", user.id).eq("book_id", ent.book_id).order("page");
  if (!signed) return <p className="card p-6">Gagal membuka file. Coba lagi.</p>;
  const title = (ent.book as unknown as { title: string }).title;
  return (<><h1 className="mb-3 text-2xl font-bold">{title}</h1><PdfReader bookId={ent.book_id} url={signed.signedUrl} title={title} startPage={prog?.page ?? 1} bookmarks={bms ?? []} totalPages={file.page_count} /></>);
}
