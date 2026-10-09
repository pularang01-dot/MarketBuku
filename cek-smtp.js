// Pemakaian: node cek-smtp.js NAMA_HOST
// Contoh:    node cek-smtp.js smtp-relay.brevo.com
const net = require("net");
const tls = require("tls");

const host = process.argv[2];
if (!host) { console.log("Pemakaian: node cek-smtp.js NAMA_HOST"); process.exit(1); }

function probe(port, secure) {
  return new Promise((resolve) => {
    const start = Date.now();
    let finished = false;
    const sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    const label = `${secure ? "SSL  " : "plain"} port ${String(port).padEnd(4)}`;
    const done = (msg) => {
      if (finished) return;
      finished = true;
      sock.destroy();
      resolve(`${label}: ${msg} (${Date.now() - start} ms)`);
    };
    sock.setTimeout(8000, () => done("TIMEOUT - tidak ada jawaban"));
    sock.on("error", (e) => done("GAGAL " + (e.code || e.message)));
    sock.on("data", (d) => done("TERSAMBUNG, server berkata: " + d.toString().split("\n")[0].trim()));
  });
}

(async () => {
  console.log("Memeriksa host:", host, "\n");
  for (const [port, secure] of [[587, false], [465, true], [2525, false]]) {
    console.log(await probe(port, secure));
  }
  console.log("\nPort yang menampilkan 'server berkata: 220 ...' adalah port yang benar-benar aktif.");
})();