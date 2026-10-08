import { notFound } from "next/navigation";
import { BookForm } from "@/components/book-form";
import { GalleryManager } from "@/components/gallery-manager";
import { formOptions } from "@/lib/admin-data";
import { createSupabaseAdmin } from "@/lib/supabase/server";
export default async function EditBook({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const db = createSupabaseAdmin();
  const [{ data: book }, { data: bs }, { data: bc }, opts] = await Promise.all([db.from("books").select("*").eq("id", id).maybeSingle(), db.from("book_subjects").select("subject_id").eq("book_id", id), db.from("book_categories").select("category_id").eq("book_id", id), formOptions()]);
  if (!book) notFound();
  return (<><h1 className="mb-4 text-3xl font-bold">Ubah Buku</h1><BookForm book={book} {...opts} selSubjects={bs?.map((x) => x.subject_id)} selCategories={bc?.map((x) => x.category_id)} /><GalleryManager bookId={book.id} gallery={book.gallery ?? []} /></>);
}
