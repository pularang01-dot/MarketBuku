import { redirect } from "next/navigation";
// Paket tampil di halaman Promo & Paket Hemat (satu halaman, sesuai desain).
export default function BundlesRedirect() { redirect("/promo#paket"); }