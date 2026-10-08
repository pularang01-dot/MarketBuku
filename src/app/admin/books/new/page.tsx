import { BookForm } from "@/components/book-form";
import { formOptions } from "@/lib/admin-data";
export default async function NewBook() { return (<><h1 className="mb-4 text-3xl font-bold">Tambah Buku</h1><BookForm {...(await formOptions())} /></>); }
