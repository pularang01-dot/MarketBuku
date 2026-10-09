import { Check, EyeOff, Trash2, Star } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { moderateReview } from "@/actions/admin";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ContentTabs } from "@/components/content-tabs";

const ST: Record<string, [string, string]> = { PENDING: ["Menunggu", "bg-marigold-light text-marigold-dark"], APPROVED: ["Tayang", "bg-leaf-light text-leaf"], HIDDEN: ["Disembunyikan", "bg-surface-muted text-ink-soft"] };

export default async function AdminReviews() {
  const db = createSupabaseAdmin();
  const [{ data }, pend, avg] = await Promise.all([
    db.from("reviews").select("id,rating,body,status,created_at,book:books(title),profiles(full_name),review_images(path)").order("created_at", { ascending: false }).limit(50),
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    db.from("reviews").select("rating").eq("status", "APPROVED"),
  ]);
  const n = avg.data?.length ?? 0; const mean = n ? (avg.data!.reduce((s, r) => s + r.rating, 0) / n).toFixed(2) : "—";
  return (
    <>
      <AdminPageHeader eyebrow="Konten & Promosi" title="Moderasi Ulasan Pembaca" subtitle="Tinjau ulasan pembeli terverifikasi sebelum tampil di halaman buku."
        actions={<div className="flex gap-3"><div className="card px-4 py-2"><p className="text-[11px] text-ink-mute">Menunggu</p><p className="font-serif text-xl font-semibold text-brand-dark">{pend.count ?? 0}</p></div><div className="card px-4 py-2"><p className="text-[11px] text-ink-mute">Rata-rata tayang</p><p className="font-serif text-xl font-semibold text-brand-dark">{mean}</p></div></div>} />
      <ContentTabs active="/admin/reviews" counts={{ "/admin/reviews": pend.count ?? 0 }} />
      <div className="grid gap-4 lg:grid-cols-2">{data?.map((r) => { const name = (r.profiles as unknown as { full_name: string })?.full_name ?? "Pembaca"; const st = ST[r.status];
        return (
          <article key={r.id} className="card flex flex-col gap-3 p-5">
            <header className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-pill bg-brand-light text-sm font-bold text-brand">{name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span><div><p className="font-semibold">{name}</p><p className="text-xs text-ink-mute">{new Date(r.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })} · <span className="text-leaf">Pembelian terverifikasi</span></p></div></div>
              <span className="flex items-center gap-1 rounded-pill bg-paper px-3 py-1 text-sm font-bold"><Star aria-hidden className="h-4 w-4 fill-marigold text-marigold" />{r.rating}.0</span></header>
            <p className="rounded-card bg-paper p-3 text-sm"><span className="block text-[11px] font-bold uppercase tracking-wide text-ink-mute">Buku</span><span className="font-serif font-semibold text-brand-dark">{(r.book as unknown as { title: string }).title}</span></p>
            <blockquote className="flex-1 font-serif text-lg italic leading-relaxed text-ink-soft">&ldquo;{r.body}&rdquo;</blockquote>
            {(r.review_images as unknown as { path: string }[] | null)?.map((im) => <a key={im.path} className="text-sm text-brand underline" href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/review-images/${im.path}`} target="_blank" rel="noreferrer">Lihat foto ulasan</a>)}
            <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-3"><span className={`badge ${st[1]}`}>{st[0]}</span><span className="flex-1" />
              {r.status !== "APPROVED" && <form action={moderateReview.bind(null, r.id, "APPROVED")}><button className="btn-primary !min-h-[38px] text-xs"><Check aria-hidden className="h-4 w-4" />Setujui & Tampilkan</button></form>}
              {r.status !== "HIDDEN" && <form action={moderateReview.bind(null, r.id, "HIDDEN")}><button className="btn-ghost !min-h-[38px] text-xs"><EyeOff aria-hidden className="h-4 w-4" />Sembunyikan</button></form>}
              <form action={moderateReview.bind(null, r.id, "DELETE")}><button aria-label="Hapus ulasan" className="grid h-9 w-9 place-items-center rounded-ctl text-ink-mute hover:bg-danger-light hover:text-danger"><Trash2 className="h-4 w-4" /></button></form></footer>
          </article>); })}
        {!data?.length && <p className="card p-8 text-center text-ink-mute lg:col-span-2">Belum ada ulasan.</p>}</div>
    </>
  );
}