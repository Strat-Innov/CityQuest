import { describe, expect, it } from "vitest";
import { formatCompletedAt, initials } from "@/lib/format";

describe("initials", () => {
  it.each([
    ["Maya Ortiz", "MO"],
    ["  maya  de la Cruz ", "MC"],
    ["Cher", "CH"],
    ["", "?"],
  ])("%j -> %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe("formatCompletedAt", () => {
  const now = new Date("2026-11-05T12:00:00Z");

  it("shows only the time for today, in the configured time zone", () => {
    expect(formatCompletedAt("2026-11-05T01:42:00Z", "Asia/Manila", now)).toBe("09:42");
  });

  it("includes the date for earlier days", () => {
    expect(formatCompletedAt("2026-11-03T01:42:00Z", "Asia/Manila", now)).toBe("3 Nov, 09:42");
  });
});

describe("countWord", () => {
  it("spells out small numbers", async () => {
    const { countWord } = await import("@/lib/format");
    expect(countWord(6)).toBe("six");
    expect(countWord(13)).toBe("13");
  });
});
