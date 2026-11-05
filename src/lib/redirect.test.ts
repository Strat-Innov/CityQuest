import { describe, expect, it } from "vitest";
import { isNfcPath, loginPath, safeNextPath } from "@/lib/redirect";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/nfc/abcDEF_123-xyz")).toBe("/nfc/abcDEF_123-xyz");
    expect(safeNextPath("/admin/participants?q=CQ-ABCDE")).toBe("/admin/participants?q=CQ-ABCDE");
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/foo\nbar",
    "",
    undefined,
    null,
    42,
    `/${"a".repeat(600)}`,
  ])("rejects unsafe value %j", (value) => {
    expect(safeNextPath(value)).toBe("/quest");
  });

  it("uses the provided fallback", () => {
    expect(safeNextPath("//evil", "/pass")).toBe("/pass");
  });
});

describe("loginPath", () => {
  it("encodes the return path", () => {
    expect(loginPath("/nfc/token_value_1234567890")).toBe("/login?next=%2Fnfc%2Ftoken_value_1234567890");
  });
  it("drops unsafe return paths", () => {
    expect(loginPath("//evil.example")).toBe("/login");
  });
});

describe("isNfcPath", () => {
  it("detects NFC routes", () => {
    expect(isNfcPath("/nfc/abc")).toBe(true);
    expect(isNfcPath("/quest")).toBe(false);
  });
});
