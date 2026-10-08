import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { BundleForm } from "@/components/bundle-form";
export default async function EditBundle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const db = createSupabaseAdmin();
  const [{ data: b }, { data: items }, { data: books }] = await Promise.all([db.from("bundles").select("*").eq("id", id).maybeSingle(), db.from("bundle_items").select("book_id").eq("bundle_id", id), db.from("books").select("id,title").neq("status", "ARCHIVED").order("title")]);
  if (!b) notFound();
  return (<><h1 className="mb-4 text-3xl font-bold">Ubah Paket</h1><BundleForm books={books ?? []} bundle={b} selected={items?.map((i) => i.book_id)} /></>);
}
