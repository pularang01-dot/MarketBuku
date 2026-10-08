import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ArticleForm } from "@/components/article-form";
export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const db = createSupabaseAdmin();
  const [{ data: a }, { data: books }] = await Promise.all([db.from("articles").select("*").eq("id", id).maybeSingle(), db.from("books").select("id,title").eq("status", "PUBLISHED").order("title")]);
  if (!a) notFound();
  return (<><h1 className="mb-4 text-3xl font-bold">Ubah Artikel</h1><ArticleForm a={a} books={books ?? []} /></>);
}
