// Pemakaian:
// node cek-kirim.js HOST PORT USERNAME SMTP_KEY EMAIL_PENGIRIM EMAIL_TUJUAN
const nodemailer = require("nodemailer");

const [host, port, user, pass, from, to] = process.argv.slice(2);
if (!to) {
  console.log("Pemakaian: node cek-kirim.js HOST PORT USERNAME SMTP_KEY EMAIL_PENGIRIM EMAIL_TUJUAN");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: host.trim(),
  port: Number(port),
  secure: Number(port) === 465,
  auth: { user: user.trim(), pass: pass.trim() },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

(async () => {
  try {
    await transporter.verify();
    console.log("1/2 Login SMTP: BERHASIL");
    const info = await transporter.sendMail({
      from: `Toko Buku Edukasi <${from.trim()}>`,
      to: to.trim(),
      subject: "Uji SMTP Toko Buku Edukasi",
      text: "Jika email ini masuk, pengaturan SMTP kamu benar.",
    });
    console.log("2/2 Email terkirim. Cek kotak masuk dan folder spam. ID:", info.messageId);
  } catch (e) {
    console.log("GAGAL:", e.code || "", e.responseCode || "", e.message);
  }
})();