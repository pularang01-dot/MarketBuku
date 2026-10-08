import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpenCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Perpustakaan Digital", robots: { index: false } };

export default async function Library() {
  const user = await requireUser("/library");
  const supabase = await createSupabaseServer();
  const [{ data }, { data: prog }] = await Promise.all([
    supabase.from("digital_entitlements").select("id, book_id, book:books(title, slug, cover_url, author:authors(name))").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("reading_progress").select("book_id, page").eq("user_id", user.id),
  ]);
  const page = new Map((prog ?? []).map((p) => [p.book_id, p.page]));
  return (
    <>
      <PageHeader title="Perpustakaan Digital" subtitle="E-book dan modul yang sudah kamu beli." crumbs={[{ href: "/", label: "Beranda" }, { label: "Perpustakaan Digital" }]} />
      {!data?.length ? <div className="card grid place-items-center gap-3 p-10 text-center"><span className="grid h-14 w-14 place-items-center rounded-pill bg-brand-light text-brand"><BookOpenCheck aria-hidden className="h-7 w-7" /></span><p className="max-w-md text-sm text-ink-soft">Belum ada e-book. Buku digital yang kamu beli akan muncul di sini setelah pembayaran diverifikasi.</p><Link href="/books?format=EBOOK" className="btn-primary">Lihat e-book</Link></div> :
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((e) => { const b = e.book as unknown as { title: string; cover_url: string | null; author: { name: string } | null }; const pg = page.get(e.book_id);
          return <li key={e.id} className="card flex gap-4 p-4"><div className="relative h-28 w-[84px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">{b.cover_url && <Image src={b.cover_url} alt="" fill sizes="84px" className="object-cover" />}</div>
            <div className="flex min-w-0 flex-1 flex-col"><p className="line-clamp-2 font-serif text-lg font-semibold leading-snug text-brand-dark">{b.title}</p><p className="text-xs text-ink-soft">{b.author?.name}</p><p className="mt-1 text-xs text-ink-mute">{pg ? `Lanjut baca — halaman ${pg}` : "Belum dibaca"}</p><Link className="btn-primary mt-auto !min-h-[40px] w-fit" href={`/reader/${e.id}`}>Baca</Link></div></li>; })}</ul>}
      <p className="mt-6 text-xs text-ink-mute">Catatan: akses file dilindungi tautan bertanda tangan yang berlaku singkat dan hanya untuk pemilik. Ini bukan DRM — file yang telah dibuka tetap dapat disalin oleh pembaca.</p>
    </>
  );
}