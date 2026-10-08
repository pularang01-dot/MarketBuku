import { describe, it, expect } from "vitest";
import { hmacSha256, sha512, safeEqual } from "../src/lib/payments/signature";

describe("webhook signatures", () => {
  it("hmac is deterministic and secret dependent", () => {
    expect(hmacSha256("s", "body")).toBe(hmacSha256("s", "body"));
    expect(hmacSha256("s", "body")).not.toBe(hmacSha256("t", "body"));
  });
  it("safeEqual rejects different lengths and values", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
  it("sha512 has 128 hex chars", () => { expect(sha512("x")).toHaveLength(128); });
});
