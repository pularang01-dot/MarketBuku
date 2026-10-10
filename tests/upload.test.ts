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

import { PROOF_RULE } from "../src/lib/upload";
describe("payment proof rule", () => {
  const pdf = () => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0])], "x.pdf", { type: "application/pdf" });
  const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])], "x.png", { type: "image/png" });
  it("accepts a real image", async () => { expect((await validateUpload(png(), PROOF_RULE)).ok).toBe(true); });
  it("rejects PDF (images only)", async () => { expect((await validateUpload(pdf(), PROOF_RULE)).ok).toBe(false); });
  it("rejects files over 5 MB", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    expect((await validateUpload(big, PROOF_RULE)).ok).toBe(false);
  });
  it("rejects a disguised executable", async () => {
    const exe = new File([new Uint8Array([0x4d, 0x5a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], "evil.png", { type: "image/png" });
    expect((await validateUpload(exe, PROOF_RULE)).ok).toBe(false);
  });
});