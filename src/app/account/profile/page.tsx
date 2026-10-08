import { getProfile } from "@/lib/auth/session";
import { saveProfile } from "@/actions/account";
import { SimpleForm } from "@/components/simple-form";
export const metadata = { title: "Profil" };
export default async function ProfilePage() {
  const p = await getProfile();
  return (<><h1 className="mb-4 text-3xl font-bold">Profil</h1><SimpleForm action={saveProfile} cta="Simpan" fields={[{ name: "full_name", label: "Nama lengkap", defaultValue: p?.full_name ?? "", required: true }, { name: "phone", label: "No. HP", defaultValue: p?.phone ?? "" }]} /><p className="mt-2 text-sm text-ink-mute">Email: {p?.email}</p></>);
}
