import { createSupabaseAdmin } from "@/lib/supabase/server";
import { saveArticle } from "@/actions/admin";
import { SimpleForm } from "@/components/simple-form";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ContentTabs } from "@/components/content-tabs";
import { ConfirmButton } from "@/components/row-actions";
import { deleteArticle } from "@/actions/admin-content";
export default async function AdminArticles() {
  const { data } = await createSupabaseAdmin().from("articles").select("id,title,status,published_at").order("created_at", { ascending: false });
  return (<><AdminPageHeader eyebrow="Konten & Promosi" title="Editor Artikel" subtitle="Tulis artikel edukasi dan tautkan buku terkait." /><ContentTabs active="/admin/articles" /><ul className="card mb-4 divide-y text-sm">{data?.map((a) => <li key={a.id} className="flex items-center justify-between p-3"><span>{a.title} · {a.status}</span><span className="flex gap-3"><Link className="text-brand underline" href={`/admin/articles/${a.id}`}>Ubah</Link><ConfirmButton label="Hapus" confirmText="Hapus artikel ini?" action={deleteArticle.bind(null, a.id)} /></span></li>)}</ul>
    <h2 className="mb-2 text-xl">Artikel baru</h2>
    <SimpleForm action={saveArticle} cta="Simpan artikel" fields={[{ name: "title", label: "Judul", required: true }, { name: "excerpt", label: "Ringkasan" }, { name: "category", label: "Kategori" }, { name: "seo_title", label: "SEO title (maks 70)" }, { name: "seo_description", label: "SEO description (maks 170)" }]}>
      <div><label htmlFor="content" className="label">Isi (pisahkan paragraf dengan baris kosong; teks biasa)</label><textarea id="content" name="content" rows={8} className="input !py-2" required /></div>
      <div><label htmlFor="status" className="label">Status</label><select id="status" name="status" className="input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option></select></div></SimpleForm></>);
}