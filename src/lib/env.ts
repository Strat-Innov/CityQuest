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

/**
 * Validated environment. Read lazily so `next build` succeeds without
 * credentials; the first request fails fast with a clear message instead.
 */
export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    APP_TIME_ZONE: process.env.APP_TIME_ZONE || undefined,
    ORGANIZER_NAME: process.env.ORGANIZER_NAME || undefined,
    PRIVACY_CONTACT_EMAIL: process.env.PRIVACY_CONTACT_EMAIL || undefined,
    DATA_RETENTION_DAYS: process.env.DATA_RETENTION_DAYS || undefined,
  });
  if (!parsed.success) {
    throw new EnvConfigError([...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))]);
  }
  cached = parsed.data;
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
