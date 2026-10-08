-- SEED DATA (development). Safe to re-run: uses ON CONFLICT where possible.
insert into education_levels(name, slug, sort) values
 ('SD/MI','sd',1),('SMP/MTs','smp',2),('SMA/MA','sma',3),('Umum','umum',4)
on conflict (slug) do nothing;

insert into grades(level_id, name, slug, sort)
select l.id, g.name, g.slug, g.sort from (values
 ('sd','Kelas 1','kelas-1',1),('sd','Kelas 2','kelas-2',2),('sd','Kelas 3','kelas-3',3),
 ('sd','Kelas 4','kelas-4',4),('sd','Kelas 5','kelas-5',5),('sd','Kelas 6','kelas-6',6),
 ('smp','Kelas 7','kelas-7',7),('smp','Kelas 8','kelas-8',8),('smp','Kelas 9','kelas-9',9),
 ('sma','Kelas 10','kelas-10',10),('sma','Kelas 11','kelas-11',11),('sma','Kelas 12','kelas-12',12),
 ('umum','Umum','umum',13)
) as g(level, name, slug, sort) join education_levels l on l.slug = g.level
on conflict (slug) do nothing;

insert into subjects(name, slug) values
 ('Matematika','matematika'),('Bahasa Indonesia','bahasa-indonesia'),('IPAS','ipas'),('PPKn','ppkn'),
 ('Bahasa Inggris','bahasa-inggris'),('Fisika','fisika'),('Kimia','kimia'),('Biologi','biologi'),
 ('Sejarah','sejarah'),('Literasi','literasi')
on conflict (slug) do nothing;

insert into categories(name, slug, description) values
 ('Buku Pelajaran','buku-pelajaran','Buku teks pendamping kurikulum nasional.'),
 ('Latihan Soal','latihan-soal','Kumpulan soal dan pembahasan untuk latihan mandiri.'),
 ('Persiapan Ujian','persiapan-ujian','Materi ringkas dan simulasi untuk ujian sekolah, ANBK, dan UTBK.'),
 ('Referensi Guru','referensi-guru','Panduan mengajar dan perangkat pembelajaran.'),
 ('Literasi & Bacaan','literasi-bacaan','Bacaan penumbuh minat baca dan nalar kritis.')
on conflict (slug) do nothing;

insert into authors(name, slug, bio) values
 ('Dra. Ratna Wulandari, M.Pd.','ratna-wulandari','Guru matematika SD dan penulis buku pendamping kurikulum.'),
 ('Budi Santoso, S.Pd.','budi-santoso','Praktisi pendidikan IPA tingkat SMP.'),
 ('Dr. Siti Nurhaliza, M.Si.','siti-nurhaliza','Dosen pendidikan biologi dan penulis modul sains.'),
 ('Agus Prasetyo, M.Pd.','agus-prasetyo','Guru bahasa dan sastra Indonesia.'),
 ('Maya Kartika, S.S.','maya-kartika','Pengajar bahasa Inggris dan penyusun materi literasi.')
on conflict (slug) do nothing;

insert into publishers(name, slug) values
 ('Penerbit Cahaya Ilmu','cahaya-ilmu'),('Penerbit Nusa Pustaka','nusa-pustaka'),('Penerbit Kencana Belajar','kencana-belajar')
on conflict (slug) do nothing;

-- BOOKS (sample catalogue; titles are illustrative demo content)
with src(title, slug, isbn, descr, author, publisher, yr, pages, fmt, price, sale, level, grade, kw, topics, subs, cats, stock, featured) as (values
 ('Matematika Kelas 5 Kurikulum Merdeka','matematika-kelas-5-kurikulum-merdeka','9786021000011','Buku pendamping matematika kelas 5 dengan penjelasan konsep bertahap, contoh soal kontekstual, dan latihan mandiri di setiap bab.','ratna-wulandari','cahaya-ilmu',2024,248,'PRINT'::book_format,89000,74000,'sd','kelas-5',array['pecahan','bangun ruang','kurikulum merdeka'],array['Pecahan','Bangun ruang','Data dan peluang'],array['matematika'],array['buku-pelajaran'],60,true),
 ('Latihan Soal Matematika SD Kelas 6','latihan-soal-matematika-sd-kelas-6','9786021000028','Kumpulan 600 soal bertingkat beserta pembahasan untuk persiapan ujian akhir sekolah dasar.','ratna-wulandari','cahaya-ilmu',2024,196,'PRINT',65000,null,'sd','kelas-6',array['ujian','soal','kelas 6'],array['Bilangan bulat','Perbandingan','Statistika dasar'],array['matematika'],array['latihan-soal','persiapan-ujian'],40,false),
 ('IPAS Kelas 5: Tubuh Kita dan Lingkungan','ipas-kelas-5-tubuh-kita-dan-lingkungan','9786021000035','Eksplorasi sistem tubuh manusia dan ekosistem sekitar melalui percobaan sederhana yang bisa dilakukan di rumah.','siti-nurhaliza','nusa-pustaka',2023,224,'PRINT',92000,79000,'sd','kelas-5',array['ipas','ekosistem','tubuh manusia'],array['Sistem pencernaan','Ekosistem','Energi'],array['ipas'],array['buku-pelajaran'],45,true),
 ('Bahasa Indonesia Kelas 4: Aku Suka Membaca','bahasa-indonesia-kelas-4-aku-suka-membaca','9786021000042','Teks bacaan beragam, latihan menulis, dan kosakata untuk memperkuat literasi siswa kelas 4.','agus-prasetyo','nusa-pustaka',2023,212,'PRINT',78000,null,'sd','kelas-4',array['membaca','menulis','literasi'],array['Teks narasi','Teks deskripsi','Kosakata'],array['bahasa-indonesia','literasi'],array['buku-pelajaran','literasi-bacaan'],35,false),
 ('IPA Terpadu Kelas 8','ipa-terpadu-kelas-8','9786021000059','Materi IPA SMP kelas 8 mencakup gerak, tekanan, getaran, dan sistem peredaran darah dengan ilustrasi berwarna.','budi-santoso','kencana-belajar',2024,312,'PRINT',115000,99000,'smp','kelas-8',array['ipa','fisika','biologi'],array['Gaya dan gerak','Tekanan zat','Sistem peredaran darah'],array['fisika','biologi'],array['buku-pelajaran'],50,true),
 ('Bank Soal Matematika SMP Kelas 9','bank-soal-matematika-smp-kelas-9','9786021000066','Latihan soal HOTS dan pembahasan terstruktur untuk persiapan ujian sekolah dan masuk SMA.','ratna-wulandari','cahaya-ilmu',2024,288,'PRINT',98000,null,'smp','kelas-9',array['hots','ujian','smp'],array['Persamaan kuadrat','Transformasi geometri','Bangun ruang sisi lengkung'],array['matematika'],array['latihan-soal','persiapan-ujian'],30,false),
 ('Fisika SMA Kelas 11: Konsep dan Penerapan','fisika-sma-kelas-11-konsep-dan-penerapan','9786021000073','Pembahasan konsep fisika kelas 11 dengan contoh penerapan dalam teknologi sehari-hari.','budi-santoso','kencana-belajar',2022,356,'PRINT',138000,119000,'sma','kelas-11',array['fisika','termodinamika','gelombang'],array['Dinamika rotasi','Fluida','Termodinamika'],array['fisika'],array['buku-pelajaran'],25,false),
 ('Kimia SMA Kelas 10: Struktur Atom dan Ikatan','kimia-sma-kelas-10-struktur-atom-dan-ikatan','9786021000080','Membangun pemahaman struktur atom, tabel periodik, dan ikatan kimia melalui visualisasi dan soal berjenjang.','siti-nurhaliza','kencana-belajar',2023,264,'PRINT',124000,null,'sma','kelas-10',array['kimia','atom','ikatan'],array['Struktur atom','Tabel periodik','Ikatan kimia'],array['kimia'],array['buku-pelajaran'],20,false),
 ('Strategi UTBK: Penalaran dan Literasi (E-Book)','strategi-utbk-penalaran-dan-literasi-ebook','9786021000097','Panduan belajar mandiri UTBK untuk penalaran umum, literasi bahasa Indonesia, dan literasi bahasa Inggris dalam format PDF.','agus-prasetyo','nusa-pustaka',2025,320,'EBOOK',85000,69000,'sma','kelas-12',array['utbk','snbt','penalaran'],array['Penalaran umum','Literasi bahasa','Strategi waktu'],array['bahasa-indonesia','bahasa-inggris'],array['persiapan-ujian'],0,true),
 ('Modul Digital Bahasa Inggris Kelas 7','modul-digital-bahasa-inggris-kelas-7','9786021000103','Modul PDF dengan latihan percakapan, kosakata tematik, dan lembar kerja siap cetak untuk siswa kelas 7.','maya-kartika','kencana-belajar',2025,120,'MODULE',45000,null,'smp','kelas-7',array['english','conversation','modul'],array['Greetings','Descriptive text','Simple present'],array['bahasa-inggris'],array['buku-pelajaran'],0,false),
 ('Panduan Guru: Asesmen Formatif di Kelas','panduan-guru-asesmen-formatif-di-kelas','9786021000110','Teknik praktis merancang dan menganalisis asesmen formatif beserta contoh instrumen yang dapat disesuaikan.','agus-prasetyo','cahaya-ilmu',2024,180,'PRINT',87000,null,'umum','umum',array['guru','asesmen','formatif'],array['Rubrik','Umpan balik','Analisis hasil'],array['literasi'],array['referensi-guru'],28,false),
 ('Sejarah Indonesia SMA Kelas 11','sejarah-indonesia-sma-kelas-11','9786021000127','Penelusuran sejarah Indonesia dari masa pergerakan nasional hingga kemerdekaan dengan sumber primer dan peta konsep.','siti-nurhaliza','nusa-pustaka',2023,300,'PRINT',105000,89000,'sma','kelas-11',array['sejarah','pergerakan nasional'],array['Pergerakan nasional','Proklamasi','Revolusi fisik'],array['sejarah'],array['buku-pelajaran'],32,false)
), ins as (
 insert into books(title, slug, isbn, description, author_id, publisher_id, publication_year, pages, format, price, sale_price, education_level_id, grade_id, keywords, topics, status, featured, audience)
 select s.title, s.slug, s.isbn, s.descr, a.id, p.id, s.yr, s.pages, s.fmt, s.price, s.sale, l.id, g.id, s.kw, s.topics, 'PUBLISHED', s.featured, 'Siswa ' || g.name || ' dan orang tua pendamping belajar'
 from src s join authors a on a.slug = s.author join publishers p on p.slug = s.publisher
 join education_levels l on l.slug = s.level join grades g on g.slug = s.grade
 on conflict (slug) do nothing returning id, slug
)
select count(*) from ins;

insert into book_subjects(book_id, subject_id)
select b.id, s.id from books b join (values
 ('matematika-kelas-5-kurikulum-merdeka','matematika'),('latihan-soal-matematika-sd-kelas-6','matematika'),
 ('ipas-kelas-5-tubuh-kita-dan-lingkungan','ipas'),('bahasa-indonesia-kelas-4-aku-suka-membaca','bahasa-indonesia'),
 ('bahasa-indonesia-kelas-4-aku-suka-membaca','literasi'),('ipa-terpadu-kelas-8','fisika'),('ipa-terpadu-kelas-8','biologi'),
 ('bank-soal-matematika-smp-kelas-9','matematika'),('fisika-sma-kelas-11-konsep-dan-penerapan','fisika'),
 ('kimia-sma-kelas-10-struktur-atom-dan-ikatan','kimia'),('strategi-utbk-penalaran-dan-literasi-ebook','bahasa-indonesia'),
 ('strategi-utbk-penalaran-dan-literasi-ebook','bahasa-inggris'),('modul-digital-bahasa-inggris-kelas-7','bahasa-inggris'),
 ('panduan-guru-asesmen-formatif-di-kelas','literasi'),('sejarah-indonesia-sma-kelas-11','sejarah')
) v(book, subj) on b.slug = v.book join subjects s on s.slug = v.subj
on conflict do nothing;

insert into book_categories(book_id, category_id)
select b.id, c.id from books b join (values
 ('matematika-kelas-5-kurikulum-merdeka','buku-pelajaran'),('latihan-soal-matematika-sd-kelas-6','latihan-soal'),
 ('latihan-soal-matematika-sd-kelas-6','persiapan-ujian'),('ipas-kelas-5-tubuh-kita-dan-lingkungan','buku-pelajaran'),
 ('bahasa-indonesia-kelas-4-aku-suka-membaca','buku-pelajaran'),('bahasa-indonesia-kelas-4-aku-suka-membaca','literasi-bacaan'),
 ('ipa-terpadu-kelas-8','buku-pelajaran'),('bank-soal-matematika-smp-kelas-9','latihan-soal'),('bank-soal-matematika-smp-kelas-9','persiapan-ujian'),
 ('fisika-sma-kelas-11-konsep-dan-penerapan','buku-pelajaran'),('kimia-sma-kelas-10-struktur-atom-dan-ikatan','buku-pelajaran'),
 ('strategi-utbk-penalaran-dan-literasi-ebook','persiapan-ujian'),('modul-digital-bahasa-inggris-kelas-7','buku-pelajaran'),
 ('panduan-guru-asesmen-formatif-di-kelas','referensi-guru'),('sejarah-indonesia-sma-kelas-11','buku-pelajaran')
) v(book, cat) on b.slug = v.book join categories c on c.slug = v.cat
on conflict do nothing;

-- stock for print books (inventory rows are auto-created by trigger)
update inventory i set stock = v.stock
from (values
 ('matematika-kelas-5-kurikulum-merdeka',60),('latihan-soal-matematika-sd-kelas-6',40),('ipas-kelas-5-tubuh-kita-dan-lingkungan',45),
 ('bahasa-indonesia-kelas-4-aku-suka-membaca',35),('ipa-terpadu-kelas-8',50),('bank-soal-matematika-smp-kelas-9',30),
 ('fisika-sma-kelas-11-konsep-dan-penerapan',25),('kimia-sma-kelas-10-struktur-atom-dan-ikatan',20),
 ('panduan-guru-asesmen-formatif-di-kelas',28),('sejarah-indonesia-sma-kelas-11',32)
) v(slug, stock) join books b on b.slug = v.slug where i.book_id = b.id;

-- coupons
insert into coupons(code, type, value, min_purchase, max_discount, ends_at, usage_limit, per_user_limit) values
 ('BELAJAR10','PERCENT',10,100000,30000,now() + interval '1 year',1000,3),
 ('HEMAT20K','FIXED',20000,150000,null,now() + interval '1 year',500,1),
 ('ONGKIRGRATIS','FREE_SHIPPING',0,75000,null,now() + interval '1 year',null,2)
on conflict (code) do nothing;

-- bundle
with b as (insert into bundles(title, slug, description, price, status)
  values ('Paket Pintar Kelas 5','paket-pintar-kelas-5','Matematika dan IPAS kelas 5 dalam satu paket hemat.',145000,'PUBLISHED')
  on conflict (slug) do nothing returning id)
insert into bundle_items(bundle_id, book_id, quantity)
select b.id, bk.id, 1 from b, books bk where bk.slug in ('matematika-kelas-5-kurikulum-merdeka','ipas-kelas-5-tubuh-kita-dan-lingkungan')
on conflict do nothing;

insert into promotions(title, slug, description, ends_at) values
 ('Tahun Ajaran Baru','tahun-ajaran-baru','Diskon buku pelajaran untuk persiapan semester baru. Gunakan kode BELAJAR10.', now() + interval '60 days')
on conflict (slug) do nothing;

insert into articles(title, slug, excerpt, content, author_name, category, status, published_at, seo_title, seo_description) values
 ('5 Cara Mendampingi Anak Kelas 5 SD Belajar Matematika','cara-mendampingi-anak-kelas-5-belajar-matematika','Pecahan dan bangun ruang sering menjadi tantangan. Berikut langkah praktis untuk orang tua.',
  E'Belajar matematika di kelas 5 mulai menuntut pemahaman konsep, bukan sekadar hafalan.\n\nPertama, ajak anak menghubungkan pecahan dengan benda sehari-hari seperti membagi kue atau air minum.\n\nKedua, biasakan latihan singkat tetapi rutin, sekitar 20 menit sehari.\n\nKetiga, minta anak menjelaskan kembali langkah pengerjaannya dengan kata-katanya sendiri.\n\nKeempat, pilih buku dengan contoh kontekstual dan pembahasan bertahap.\n\nKelima, rayakan kemajuan kecil agar anak tetap percaya diri.',
  'Redaksi Toko Buku Edukasi','Tips Belajar','PUBLISHED', now(), 'Cara Mendampingi Anak Kelas 5 Belajar Matematika','Lima langkah praktis orang tua mendampingi anak kelas 5 SD belajar matematika.')
on conflict (slug) do nothing;
