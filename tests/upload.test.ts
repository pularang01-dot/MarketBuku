import { describe, it, expect } from "vitest";
import { validateUpload, IMAGE_RULE, PDF_RULE } from "../src/lib/upload";

const f = (bytes: number[], type: string, size = bytes.length) => new File([new Uint8Array(bytes)], "x", { type }) as File & { size: number };

describe("upload validation", () => {
  it("accepts a real PNG header", async () => { expect((await validateUpload(f([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0], "image/png"), IMAGE_RULE)).ok).toBe(true); });
  it("rejects spoofed MIME (exe bytes labelled png)", async () => { expect((await validateUpload(f([0x4d, 0x5a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "image/png"), IMAGE_RULE)).ok).toBe(false); });
  it("rejects disallowed MIME", async () => { expect((await validateUpload(f([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0], "application/pdf"), IMAGE_RULE)).ok).toBe(false); });
  it("accepts PDF magic", async () => { expect((await validateUpload(f([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0], "application/pdf"), PDF_RULE)).ok).toBe(true); });
  it("rejects empty files", async () => { expect((await validateUpload(f([], "image/png"), IMAGE_RULE)).ok).toBe(false); });
});
