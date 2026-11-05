type Level = "info" | "warn" | "error";

/**
 * Minimal structured logger. Output is captured by Vercel's runtime logs.
 * Never pass secrets (NFC tokens, passwords, session tokens) as context.
 */
function log(level: Level, message: string, context: Record<string, unknown> = {}) {
  const entry = JSON.stringify({ level, message, ...context, at: new Date().toISOString() });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};

export function errorContext(error: unknown): Record<string, unknown> {
  if (error && typeof error === "object") {
    const { message, code } = error as { message?: unknown; code?: unknown };
    return { error: typeof message === "string" ? message : String(error), code };
  }
  return { error: String(error) };
}
