import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { createSupabaseServer } from "@/lib/supabase/server";
import { hmacSha256 } from "@/lib/payments/signature";
import { processPaymentWebhook } from "@/lib/payments/webhook";
import { formatRupiah } from "@/lib/utils";

export const metadata = { robots: { index: false } };

export default async function MockPay({ params }: { params: Promise<{ orderId: string }> }) {
  if (env.isProd || env.paymentProvider !== "mock") notFound();
  const { orderId } = await params;
  const supabase = await createSupabaseServer();
  const { data: o } = await supabase.from("orders").select("id,order_number,total,status").eq("id", orderId).maybeSingle(); // RLS: only the owner
  if (!o) notFound();

  async function pay(fd: FormData) {
    "use server";
    const status = fd.get("result") === "fail" ? "FAILED" : "PAID";
    const body = JSON.stringify({ order_id: orderId, txn_id: `MOCK-${orderId}`, amount: o!.total, status });
    const h = new Headers(await headers());
    h.set("x-mock-signature", hmacSha256(env.webhookSecret, body));
    await processPaymentWebhook(body, h); // same verified path as a real gateway webhook
    redirect(`/orders/${orderId}`);
  }

  return (
    <div className="card mx-auto max-w-md space-y-4 p-6">
      <p className="badge bg-marigold-light text-marigold-dark">DEVELOPMENT ONLY — gateway simulasi</p>
      <h1 className="text-2xl font-bold">Bayar {o.order_number}</h1>
      <p>Total {formatRupiah(o.total)} · status {o.status}</p>
      {o.status === "PENDING_PAYMENT" ? (
        <form action={pay} className="flex gap-2"><button name="result" value="ok" className="btn-primary flex-1">Simulasikan sukses</button><button name="result" value="fail" className="btn-ghost flex-1">Simulasikan gagal</button></form>
      ) : <p>Pesanan sudah diproses.</p>}
    </div>
  );
}
