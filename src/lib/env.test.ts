import { describe, expect, it } from "vitest";
import { EnvConfigError, resolveEnv } from "@/lib/env";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-long-enough-123",
  NEXT_PUBLIC_SITE_URL: "https://cityquest.example.com/",
};

describe("resolveEnv", () => {
  it("uses explicit values and trims the trailing slash", () => {
    const env = resolveEnv(base);
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://cityquest.example.com");
    expect(env.APP_TIME_ZONE).toBe("UTC");
  });

  it("accepts the Supabase integration's publishable key name", () => {
    const env = resolveEnv({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abcdefghijklmnop" });
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("sb_publishable_abcdefghijklmnop");
  });

  it("falls back to Vercel's production domain, then the deployment URL", () => {
    const noSite = { ...base, NEXT_PUBLIC_SITE_URL: undefined };
    expect(resolveEnv({ ...noSite, VERCEL_PROJECT_PRODUCTION_URL: "city-quest.vercel.app", VERCEL_URL: "x.vercel.app" }).NEXT_PUBLIC_SITE_URL).toBe(
      "https://city-quest.vercel.app",
    );
    expect(resolveEnv({ ...noSite, VERCEL_URL: "city-quest-abc.vercel.app" }).NEXT_PUBLIC_SITE_URL).toBe("https://city-quest-abc.vercel.app");
  });

  it("names missing variables without values", () => {
    try {
      resolveEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvConfigError);
      expect((error as EnvConfigError).variables).toEqual(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"]);
    }
  });

  it("rejects a site URL without a protocol", () => {
    expect(() => resolveEnv({ ...base, NEXT_PUBLIC_SITE_URL: "cityquest.example.com" })).toThrow(EnvConfigError);
  });
});
