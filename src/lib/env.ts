import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z
    .url()
    .transform((url) => url.replace(/\/+$/, "")),
  APP_TIME_ZONE: z
    .string()
    .default("UTC")
    .refine(isValidTimeZone, "APP_TIME_ZONE must be an IANA time zone, e.g. Asia/Manila"),
  ORGANIZER_NAME: z.string().trim().min(1).default("the City Quest organisers"),
  PRIVACY_CONTACT_EMAIL: z.email().optional(),
  DATA_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(90),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

/** Thrown when required configuration is missing; lists variable names only, never values. */
export class EnvConfigError extends Error {
  constructor(readonly variables: string[]) {
    super(`Missing or invalid environment variables: ${variables.join(", ")}. See .env.example.`);
    this.name = "EnvConfigError";
  }
}

type EnvSource = Record<string, string | undefined>;

/** Vercel exposes the production domain without a protocol. */
function vercelSiteUrl(source: EnvSource): string | undefined {
  const host = source.VERCEL_PROJECT_PRODUCTION_URL || source.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}

/**
 * Pure resolver (testable). Accepts the variable names created by the
 * Vercel ↔ Supabase integration as fallbacks:
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the anon key
 *   - Vercel's production domain when NEXT_PUBLIC_SITE_URL is not set
 */
export function resolveEnv(source: EnvSource): AppEnv {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      source.NEXT_PUBLIC_SUPABASE_ANON_KEY || source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL || vercelSiteUrl(source),
    APP_TIME_ZONE: source.APP_TIME_ZONE || undefined,
    ORGANIZER_NAME: source.ORGANIZER_NAME || undefined,
    PRIVACY_CONTACT_EMAIL: source.PRIVACY_CONTACT_EMAIL || undefined,
    DATA_RETENTION_DAYS: source.DATA_RETENTION_DAYS || undefined,
  });
  if (!parsed.success) {
    throw new EnvConfigError([...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))]);
  }
  return parsed.data;
}

/**
 * Validated environment. Read lazily so `next build` succeeds without
 * credentials; the first request fails fast with a clear message instead.
 * NEXT_PUBLIC_* variables are referenced literally so Next.js can inline them.
 */
export function getEnv(): AppEnv {
  if (cached) return cached;
  cached = resolveEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    APP_TIME_ZONE: process.env.APP_TIME_ZONE,
    ORGANIZER_NAME: process.env.ORGANIZER_NAME,
    PRIVACY_CONTACT_EMAIL: process.env.PRIVACY_CONTACT_EMAIL,
    DATA_RETENTION_DAYS: process.env.DATA_RETENTION_DAYS,
  });
  return cached;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}
