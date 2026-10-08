# Toko Buku Edukasi

Toko buku edukasi full-stack: Next.js 15 (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, Storage) — siap GitHub → Vercel.

> **Status jujur:** kode ini ditulis tanpa akses jaringan, sehingga `npm install`, `npm run build`, `npm run lint`, dan `vitest` **belum pernah dijalankan**. Hanya logika murni (harga, kupon, state order, stok, skor rekomendasi) yang diuji lewat Node. Jalankan langkah di bawah dan perbaiki error tipe/build kecil yang mungkin muncul sebelum deploy.

## Fitur
Katalog + filter/sort/pagination via URL, pencarian (trigram) + autocomplete, detail buku (JSON-LD Book/Product), wishlist, keranjang (guest cookie → merge ke DB saat login), checkout dengan harga/stok/kupon dihitung ulang di server (fungsi SQL atomik `create_order`), abstraksi payment (Midtrans + mock dev-only) dengan webhook ber-signature dan idempoten, state machine order, inventori anti-oversell (row lock + reserved stock + movements), ulasan terverifikasi + moderasi, e-book privat (signed URL 5 menit), rekomendasi berbobot yang bisa dijelaskan, book finder, artikel, sitemap/robots, admin (dashboard, buku, stok, order, pelanggan, ulasan, kupon, artikel, taksonomi), audit log.

## Setup
1. `npm install`
2. Buat project Supabase. Jalankan berurutan di SQL Editor (atau `supabase db push`): `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_functions.sql`, lalu `supabase/seed.sql`.
3. `cp .env.example .env.local` dan isi URL, anon key, service role key (server only), `PAYMENT_WEBHOOK_SECRET` (string acak panjang).
4. `npm run dev` → http://localhost:3000
5. Jadikan diri admin: daftar akun, lalu di SQL Editor: `update profiles set role='ADMIN' where id = '<uuid-user>';`
6. Di Supabase Auth → URL Configuration, tambahkan `http://localhost:3000/auth/callback` dan URL produksi.

Seed tidak menyertakan cover; unggah lewat Admin → Buku → Ubah.

## Pembayaran
- Dev: `PAYMENT_PROVIDER=mock` — halaman `/pay/mock/[orderId]` mengirim webhook bertanda tangan lewat jalur verifikasi yang sama. **Ditolak otomatis di production.**
- Midtrans: `PAYMENT_PROVIDER=midtrans`, `PAYMENT_SECRET_KEY=<server key>`, `PAYMENT_SANDBOX=true`. Notification URL: `https://DOMAIN/api/payments/webhook`. Mendukung buat transaksi, verifikasi signature, dan refund API (refund_key idempoten). Ditulis dari dokumentasi publik — **uji di sandbox sebelum live**.
- Refund/pembatalan admin: dana dikembalikan di gateway dulu, lalu fungsi SQL `reverse_paid_order` mengembalikan stok (jika belum dikirim), mencabut akses e-book, dan mencatat event.

## Pengiriman, email, rate limit
- Shipping: `dev` (tarif flat, hanya development) atau `biteship` (`SHIPPING_API_KEY`, `SHIPPING_ORIGIN_POSTAL_CODE`, `SHIPPING_COURIERS`) — tarif dan pelacakan. Adapter belum diuji dengan kunci nyata.
- Email: `console` (log) atau `resend` (`EMAIL_API_KEY`, `EMAIL_FROM`). Belum diuji dengan kunci nyata.
- Rate limit: isi `UPSTASH_REDIS_REST_URL/TOKEN` untuk limiter terdistribusi; tanpa itu memakai memori per-instance.

## Testing
- `npm run typecheck && npm run lint && npm test` — unit test (harga, kupon, bundle, state order, stok, rekomendasi, signature, validasi upload).
- `npm run test:integration` — butuh project Supabase uji + `.env.local`: balapan stok (anti-oversell), total dari DB + snapshot harga, webhook idempoten, pembatalan/refund + restock, kupon per-user, e-book entitlement, RLS (anon, lintas-user, eskalasi role, ulasan non-pembeli). **Pakai project Supabase terpisah, bukan produksi** (membuat data uji).
- `npx playwright install && npm run test:e2e` — E2E: browse, search, daftar, keranjang, checkout (mock), halaman terproteksi, overflow mobile; admin butuh `E2E_ADMIN_EMAIL/PASSWORD`. Matikan konfirmasi email di project uji.

## Deploy ke Vercel
Push ke GitHub → import di Vercel → isi semua env var dari `.env.example` → deploy. Kedaluwarsa pesanan: migrasi 0004 menjadwalkan `expire_stale_orders()` tiap 15 menit bila ekstensi `pg_cron` aktif (Database → Extensions); jika tidak, jadwalkan manual.

## Fitur yang ditambahkan di putaran kedua
Diskon paket otomatis di keranjang/checkout (SQL autoritatif, satu paket terbaik per pesanan); refund + restock; CRUD admin promo/paket/pengaturan/kupon (aktif-nonaktif)/taksonomi (ubah-hapus)/artikel (ubah, sampul, buku terkait); galeri buku + arsipkan; detail pelanggan; pembaca e-book dengan navigasi halaman, penanda, dan resume posisi; notifikasi (pesanan, pembayaran, pengiriman, **turun harga**, **stok kembali**) + pusat notifikasi; invoice cetak; beli lagi; pelacakan; pengumuman situs dari pengaturan.

## Batasan yang masih ada (jujur)
- **Belum pernah dijalankan end-to-end**: seluruh kode ditulis tanpa `npm install`/build. Harapkan beberapa perbaikan tipe/lint pada percobaan pertama.
- Adapter Midtrans, Biteship, Resend belum diuji dengan kredensial nyata.
- Diskon paket hanya satu paket terbaik per pesanan (tidak menumpuk beberapa paket).
- Pembaca memakai penampil PDF bawaan browser: zoom/cari lewat toolbar viewer; bukan DRM.
- Refund parsial belum ada (refund selalu penuh). Retur fisik setelah barang sampai: tambahkan stok manual lewat Inventori (jenis "Retur").
- Peran selain USER/ADMIN/SUPER_ADMIN ada di enum tetapi belum dibedakan hak aksesnya.
- Konten artikel teks biasa (tanpa editor rich-text) demi keamanan XSS.
