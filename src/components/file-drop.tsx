"use client";
import { useState } from "react";
import { FileUp, CheckCircle2 } from "lucide-react";

export function FileDrop({ name, accept, label, error }: { name: string; accept: string; label: string; error?: string }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <label htmlFor={name} className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-line bg-paper p-6 text-center transition hover:border-brand has-[:focus-visible]:border-brand">
        <span className="grid h-11 w-11 place-items-center rounded-pill bg-white text-brand"><FileUp aria-hidden className="h-5 w-5" /></span>
        <span className="text-sm">Tarik & lepas file di sini atau <span className="font-semibold text-brand underline">klik untuk memilih file</span></span>
        <span className="text-xs text-ink-mute">Format JPG, PNG, WebP, atau PDF (maksimal 5 MB)</span>
        <input id={name} name={name} type="file" accept={accept} required className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {file && <p role="status" className="mt-2 flex items-center gap-2 rounded-ctl bg-leaf-light px-3 py-2 text-sm text-leaf"><CheckCircle2 aria-hidden className="h-4 w-4" /><span className="truncate">{file.name}</span><span className="text-xs">({(file.size / 1048576).toFixed(1)} MB)</span></p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}