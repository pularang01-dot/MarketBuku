import { createSupabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ContentTabs } from "@/components/content-tabs";
import { PricingSimulator } from "@/components/pricing-simulator";

export const metadata = { title: "Simulasi Harga" };

export default async function PricingSimulatorPage() {
  const { data } = await createSupabaseAdmin().from("books").select("id,title,price").eq("status", "PUBLISHED").order("title").limit(500);
  return (
    <>
      <AdminPageHeader eyebrow="Konten & Promosi" title="Simulasi Harga" subtitle="Uji kombinasi buku, promosi, paket, dan kupon sebelum dipublikasikan, memakai mesin harga yang sama dengan checkout." />
      <ContentTabs active="/admin/pricing-simulator" />
      <PricingSimulator books={data ?? []} />
    </>
  );
}