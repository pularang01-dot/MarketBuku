import "server-only";
import { env } from "@/lib/env";

export type EmailEvent = "registration" | "order_created" | "proof_submitted" | "proof_rejected" | "payment_success" | "order_shipped" | "order_completed" | "password_reset" | "promotion";
export interface EmailMessage { to: string; event: EmailEvent; subject: string; html: string }
export interface EmailProvider { send(m: EmailMessage): Promise<void> }

class ConsoleEmailProvider implements EmailProvider {
  async send(m: EmailMessage) { console.info(`[email:console] ${m.event} -> ${m.to}: ${m.subject}`); }
}

const esc = (v?: string) => (v ?? "-").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const templates: Record<EmailEvent, (d: Record<string, string>) => { subject: string; html: string }> = {
  registration: (d) => ({ subject: "Selamat datang di Toko Buku Edukasi", html: `<p>Halo ${d.name}, akunmu sudah aktif.</p>` }),
  order_created: (d) => ({ subject: `Pesanan ${d.order} dibuat`, html: `<p>Selesaikan pembayaran sebelum 24 jam.</p>` }),
  proof_submitted: (d) => ({ subject: `Bukti pembayaran ${d.order} diterima`, html: `<p>Bukti pembayaranmu sudah kami terima dan sedang menunggu verifikasi admin. Pesanan diproses setelah dana dikonfirmasi.</p>` }),
  proof_rejected: (d) => ({ subject: `Bukti pembayaran ${d.order} ditolak`, html: `<p>Bukti pembayaranmu belum dapat diterima. Alasan: ${esc(d.reason)}. Silakan unggah ulang bukti yang benar dari halaman pesanan.</p>` }),
  payment_success: (d) => ({ subject: `Pembayaran ${d.order} diterima`, html: `<p>Terima kasih! Pesananmu segera kami proses.</p>` }),
  order_shipped: (d) => ({ subject: `Pesanan ${d.order} dikirim`, html: `<p>Pesananmu sudah dikirim. Resi: ${esc(d.tracking)}</p>${d.eta ? `<p>Perkiraan tiba: ${esc(d.eta)}</p>` : ""}` }),
  order_completed: (d) => ({ subject: `Pesanan ${d.order} selesai`, html: `<p>Bagikan ulasanmu tentang buku yang kamu beli.</p>` }),
  password_reset: () => ({ subject: "Reset kata sandi", html: `<p>Reset kata sandi dikirim oleh Supabase Auth.</p>` }),
  promotion: (d) => ({ subject: d.title ?? "Promo", html: `<p>${d.body ?? ""}</p>` }),
};

/** Resend adapter (https://resend.com). Needs EMAIL_API_KEY and a verified EMAIL_FROM domain. Verify with your own key before production. */
class ResendEmailProvider implements EmailProvider {
  async send(m: EmailMessage) {
    const key = process.env.EMAIL_API_KEY;
    if (!key) throw new Error("EMAIL_API_KEY belum diisi");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "noreply@example.com", to: [m.to], subject: m.subject, html: m.html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
  }
}

export function getEmailProvider(): EmailProvider {
  if (env.emailProvider === "console") return new ConsoleEmailProvider();
  if (env.emailProvider === "resend") return new ResendEmailProvider();
  throw new Error(`Unknown EMAIL_PROVIDER "${env.emailProvider}"`);
}

/** Never throws: email failure must not break checkout. */
export async function sendEmail(to: string, event: EmailEvent, data: Record<string, string> = {}) {
  try { await getEmailProvider().send({ to, event, ...templates[event](data) }); }
  catch (e) { console.error("[email] failed", event, e); }
}