import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog-view";
import type { CatalogParams } from "@/lib/catalog";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Katalog Buku", description: "Telusuri buku pelajaran, latihan soal, dan referensi berdasarkan jenjang, kelas, dan mata pelajaran.", alternates: { canonical: "/books" } };

export default async function BooksPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const sp = await searchParams;
  return (<><PageHeader title="Katalog Buku" subtitle="Telusuri buku pelajaran, latihan soal, dan referensi berdasarkan jenjang, kelas, dan mata pelajaran." crumbs={[{ href: "/", label: "Beranda" }, { label: "Katalog" }]} /><CatalogView sp={sp} base="/books" /></>);
}