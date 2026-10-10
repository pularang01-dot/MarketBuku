const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const EXT_BY_MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export interface UploadRule { mimes: string[]; maxBytes: number }
export const IMAGE_RULE: UploadRule = { mimes: IMAGE_MIME, maxBytes: 5 * 1024 * 1024 };
export const PDF_RULE: UploadRule = { mimes: ["application/pdf"], maxBytes: 100 * 1024 * 1024 };

/** Validate by declared MIME + size + magic bytes. Filename from the user is never used. */
export async function validateUpload(file: File, rule: UploadRule): Promise<{ ok: true; ext: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "File kosong." };
  if (file.size > rule.maxBytes) return { ok: false, error: `Ukuran file maksimal ${Math.round(rule.maxBytes / 1048576)} MB.` };
  if (!rule.mimes.includes(file.type)) return { ok: false, error: "Tipe file tidak diizinkan." };
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = Array.from(head).map((b) => b.toString(16).padStart(2, "0")).join("");
  const ok =
    (file.type === "image/jpeg" && hex.startsWith("ffd8ff")) ||
    (file.type === "image/png" && hex.startsWith("89504e47")) ||
    (file.type === "image/webp" && hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") ||
    (file.type === "application/pdf" && hex.startsWith("25504446"));
  if (!ok) return { ok: false, error: "Isi file tidak sesuai dengan tipenya." };
  return { ok: true, ext: EXT_BY_MIME[file.type] };
}

export const randomName = (ext: string) => `${crypto.randomUUID()}.${ext}`;

/** Payment proofs: images only (JPEG/PNG/WebP), max 5 MB. Validated on the server by MIME + magic bytes. */
export const PROOF_RULE: UploadRule = { mimes: IMAGE_MIME, maxBytes: 5 * 1024 * 1024 };