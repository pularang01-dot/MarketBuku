"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import { getUser, requireAdmin, audit } from "@/lib/auth/session";
import { validateUpload, PROOF_RULE, randomName } from "@/lib/upload";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import type { ActionState } from "@/types";

const uuid = z.string().uuid();

/* ---------------- customer: upload proof ---------------- */
export async function submitPaymentProof(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Silakan masuk." };
  if (!(await rateLimit(`proof:${user.id}`, 5, 60_000))) return { ok: false, message: "Terlalu banyak percobaan. Tunggu sebentar." };

  const p = z.object({
    order_id: uuid, sender_name: z.string().trim().min(2, "Nama pengirim wajib diisi").max(80),
    sender_bank: z.string().trim().max(40).optional(), amount: z.coerce.number().int().min(1, "Isi nominal transfer"),
    transfer_date: z.string().optional(), note: z.string().trim().max(200).optional(),
  }).safeParse(Object.fromEntries(Array.from(fd).map(([k, v]) => [k, v === "" ? undefined : v])));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };

  const supabase = await createSupabaseServer();
  const { data: order } = await supabase.from("orders").select("id, status, order_number").eq("id", p.data.order_id).eq("user_id", user.id).maybeSingle();
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan." };
  if (order.status !== "PENDING_PAYMENT") return { ok: false, message: "Pesanan ini tidak sedang menunggu pembayaran." };

  const { count } = await supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("order_id", order.id).eq("status", "PENDING");
  if ((count ?? 0) >= 1) return { ok: false, message: "Bukti sebelumnya masih menunggu verifikasi. Mohon tunggu admin memeriksanya." };

  const file = fd.get("proof");
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { proof: ["Unggah foto/tangkapan layar bukti transfer (JPG, PNG, atau WebP, maks 5 MB)"] } };
  const v = await validateUpload(file, PROOF_RULE);
  if (!v.ok) return { ok: false, errors: { proof: [v.error] } };

  const db = createSupabaseAdmin();
  const path = `${user.id}/${order.id}/${randomName(v.ext)}`;
  const up = await db.storage.from("payment-proofs").upload(path, file, { contentType: file.type });
  if (up.error) return { ok: false, message: "Upload gagal. Coba lagi." };

  const { error } = await db.from("payment_proofs").insert({
    order_id: order.id, user_id: user.id, file_path: path, sender_name: p.data.sender_name, sender_bank: p.data.sender_bank ?? null,
    amount: p.data.amount, transfer_date: p.data.transfer_date ?? null, note: p.data.note ?? null,
  });
  if (error) {
    await db.storage.from("payment-proofs").remove([path]); // do not leave an orphan file behind
    return { ok: false, message: error.code === "23505" ? "Bukti sebelumnya masih menunggu verifikasi." : "Gagal menyimpan bukti. Silakan coba lagi." };
  }
  await db.from("notifications").insert({ user_id: user.id, type: "payment", title: "Bukti pembayaran diterima", body: `Pesanan ${order.order_number} menunggu verifikasi admin.`, link: `/orders/${order.id}` });
  if (user.email) await sendEmail(user.email, "proof_submitted", { order: order.order_number });

  // notify admins (in-app)
  const { data: admins } = await db.from("profiles").select("id").in("role", ["ADMIN", "SUPER_ADMIN"]);
  if (admins?.length) await db.from("notifications").insert(admins.map((a) => ({ user_id: a.id, type: "payment", title: `Bukti bayar baru: ${order.order_number}`, link: "/admin/payments" })));
  revalidatePath(`/orders/${order.id}`); revalidatePath(`/orders/${order.id}/pay`);
  return { ok: true, message: "Bukti pembayaran berhasil dikirim dan sedang menunggu verifikasi. Pesanan akan diproses setelah dana dikonfirmasi oleh tim kami." };
}

/* ---------------- admin: verify ---------------- */
async function settle(orderId: string, amount: number, extra: Record<string, unknown>) {
  const db = createSupabaseAdmin();
  const { data: pay } = await db.from("payments").select("provider, provider_txn_id").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.rpc("mark_order_paid", { p_order: orderId, p_provider: pay?.provider ?? "manual", p_txn: pay?.provider_txn_id ?? `MANUAL-${orderId}`, p_amount: amount, p_raw: extra });
  if (error) throw error;
  return data as string;
}

export async function approveProof(proofId: string, receivedAmount: number) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(proofId).success || !Number.isInteger(receivedAmount) || receivedAmount <= 0) return { ok: false, message: "Data tidak valid." };
  const db = createSupabaseAdmin();
  const { data: proof } = await db.from("payment_proofs").select("id, order_id, status").eq("id", proofId).maybeSingle();
  if (!proof) return { ok: false, message: "Bukti tidak ditemukan." };
  if (proof.status !== "PENDING") return { ok: false, message: "Bukti ini sudah diproses." };

  const result = await settle(proof.order_id, receivedAmount, { via: "manual_proof", proof_id: proofId, verified_by: admin.id });
  if (result === "AMOUNT_MISMATCH") return { ok: false, message: "Nominal yang diterima tidak sama dengan total pesanan. Periksa mutasi rekening, atau tolak bukti ini." };
  if (result === "NOT_FOUND") return { ok: false, message: "Pesanan tidak ditemukan." };

  const now = new Date().toISOString();
  await db.from("payment_proofs").update({ status: "APPROVED", reviewed_by: admin.id, reviewed_at: now }).eq("id", proofId).eq("status", "PENDING");
  await db.from("payment_proofs").update({ status: "REJECTED", reject_reason: "Pesanan sudah lunas", reviewed_by: admin.id, reviewed_at: now }).eq("order_id", proof.order_id).eq("status", "PENDING");
  await audit(admin.id, "payment.approve", "orders", proof.order_id, { proofId, amount: receivedAmount, result });

  if (result === "OK") {
    const { data: o } = await db.from("orders").select("order_number, user_id").eq("id", proof.order_id).single();
    const { data: u } = o ? await db.auth.admin.getUserById(o.user_id) : { data: null };
    if (o && u?.user?.email) await sendEmail(u.user.email, "payment_success", { order: o.order_number });
  }
  revalidatePath("/admin/payments"); revalidatePath("/admin/orders");
  return { ok: true, message: result === "ALREADY_PROCESSED" ? "Pesanan sudah berstatus lunas sebelumnya; bukti ditandai disetujui." : "Pembayaran diverifikasi. Pesanan masuk status Dibayar." };
}

export async function rejectProof(proofId: string, reason: string) {
  const admin = await requireAdmin();
  const r = reason.trim();
  if (!uuid.safeParse(proofId).success || r.length < 3) return { ok: false, message: "Isi alasan penolakan (min. 3 karakter)." };
  const db = createSupabaseAdmin();
  const { data: proof } = await db.from("payment_proofs").select("id, order_id, user_id, status").eq("id", proofId).maybeSingle();
  if (!proof || proof.status !== "PENDING") return { ok: false, message: "Bukti sudah diproses." };
  const { data: order } = await db.from("orders").select("status, order_number, expires_at").eq("id", proof.order_id).single();
  if (!order || order.status !== "PENDING_PAYMENT") return { ok: false, message: "Pesanan ini sudah tidak menunggu pembayaran (sudah lunas atau dibatalkan), jadi bukti tidak dapat ditolak." };

  const { data: updated } = await db.from("payment_proofs").update({ status: "REJECTED", reject_reason: r.slice(0, 200), reviewed_by: admin.id, reviewed_at: new Date().toISOString() }).eq("id", proofId).eq("status", "PENDING").select("id");
  if (!updated?.length) return { ok: false, message: "Bukti sudah diproses oleh admin lain." };

  // give the buyer a fair window to upload a corrected proof: expiry is never earlier than 24h from the rejection
  const floor = new Date(Date.now() + 24 * 3_600_000).toISOString();
  if (new Date(order.expires_at).toISOString() < floor) await db.from("orders").update({ expires_at: floor }).eq("id", proof.order_id).eq("status", "PENDING_PAYMENT");

  await db.from("notifications").insert({ user_id: proof.user_id, type: "payment", title: "Bukti pembayaran ditolak", body: r.slice(0, 200), link: `/orders/${proof.order_id}/pay` });
  const { data: u } = await db.auth.admin.getUserById(proof.user_id);
  if (u.user?.email) await sendEmail(u.user.email, "proof_rejected", { order: order.order_number, reason: r.slice(0, 200) });
  await audit(admin.id, "payment.reject", "orders", proof.order_id, { proofId, reason: r });
  revalidatePath("/admin/payments");
  return { ok: true, message: "Bukti ditolak. Pembeli dapat mengunggah ulang." };
}

/** Mark paid without a proof (e.g. verified directly in the bank statement). Always audited. */
export async function markPaidManually(orderId: string, receivedAmount: number) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(orderId).success || !Number.isInteger(receivedAmount) || receivedAmount <= 0) return { ok: false, message: "Data tidak valid." };
  const result = await settle(orderId, receivedAmount, { via: "manual_admin", verified_by: admin.id });
  if (result === "AMOUNT_MISMATCH") return { ok: false, message: "Nominal tidak sama dengan total pesanan." };
  if (result !== "OK") return { ok: false, message: result === "ALREADY_PROCESSED" ? "Pesanan sudah diproses." : "Pesanan tidak ditemukan." };
  await createSupabaseAdmin().from("payment_proofs").update({ status: "APPROVED", reviewed_by: admin.id, reviewed_at: new Date().toISOString() }).eq("order_id", orderId).eq("status", "PENDING");
  await audit(admin.id, "payment.manual_paid", "orders", orderId, { amount: receivedAmount });
  revalidatePath("/admin/payments"); revalidatePath("/admin/orders");
  return { ok: true, message: "Pesanan ditandai lunas." };
}

/* ---------------- admin: bank accounts ---------------- */
export async function saveBankAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = z.object({ bank_name: z.string().trim().min(2).max(40), account_number: z.string().trim().regex(/^[0-9 -]{5,30}$/, "Nomor rekening hanya angka"), account_holder: z.string().trim().min(2).max(80) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, errors: p.error.flatten().fieldErrors };
  const { error } = await createSupabaseAdmin().from("bank_accounts").insert(p.data);
  if (error) return { ok: false, message: "Gagal menyimpan." };
  await audit(admin.id, "bank_account.create", "bank_accounts", p.data.bank_name);
  revalidatePath("/admin/bank-accounts");
  return { ok: true, message: "Rekening ditambahkan." };
}
export async function toggleBankAccount(id: string, active: boolean) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return;
  await createSupabaseAdmin().from("bank_accounts").update({ active }).eq("id", id);
  await audit(admin.id, "bank_account.toggle", "bank_accounts", id, { active });
  revalidatePath("/admin/bank-accounts");
}
export async function deleteBankAccount(id: string) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return;
  await createSupabaseAdmin().from("bank_accounts").delete().eq("id", id);
  await audit(admin.id, "bank_account.delete", "bank_accounts", id);
  revalidatePath("/admin/bank-accounts");
}