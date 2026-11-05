const DEFAULT_PATH = "/quest";

/**
 * Returns a safe, same-origin relative path for post-login redirects.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com"), backslash
 * tricks ("/\\evil.com") and control characters to prevent open redirects.
 */
export function safeNextPath(raw: unknown, fallback: string = DEFAULT_PATH): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, "https://placeholder.invalid");
    if (url.origin !== "https://placeholder.invalid") return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function loginPath(next?: string): string {
  const safe = safeNextPath(next, "");
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

export function isNfcPath(path: string): boolean {
  return path.startsWith("/nfc/");
}
