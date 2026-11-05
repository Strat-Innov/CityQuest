import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { EnvConfigError, getEnv } from "@/lib/env";
import { loginPath } from "@/lib/redirect";

const PROTECTED_PREFIXES = ["/quest", "/pass", "/admin", "/nfc/"];

/**
 * Refreshes the Supabase session cookie and sends signed-out visitors of
 * protected pages to the login screen (preserving where they were going).
 * This is a convenience only: every page and endpoint re-checks the session
 * on the server, and the database enforces access with RLS.
 */
export async function updateSession(request: NextRequest) {
  let env;
  try {
    env = getEnv();
  } catch (error) {
    if (error instanceof EnvConfigError) return configurationErrorResponse(error.variables);
    throw error;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add code between createServerClient and getUser(): it refreshes the session.
  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (error) {
    // Supabase unreachable: don't take the whole site down. Pages re-check
    // the session themselves and show their own error state.
    console.error(JSON.stringify({ level: "error", message: "middleware getUser failed", error: String(error) }));
    return response;
  }

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    const target = new URL(loginPath(`${pathname}${search}`), request.nextUrl.origin);
    url.pathname = target.pathname;
    url.search = target.search;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

/**
 * Readable setup page instead of a platform 500 when the deployment is missing
 * configuration. Shows variable NAMES only (never values).
 */
function configurationErrorResponse(variables: string[]) {
  console.error(JSON.stringify({ level: "error", message: "missing configuration", variables }));
  const items = variables.map((name) => `<li><code>${name.replace(/[^A-Z0-9_]/gi, "")}</code></li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>City Quest is not configured</title><style>body{font-family:system-ui,sans-serif;background:#ebe7f8;color:#15131f;display:flex;justify-content:center;padding:40px 16px}main{max-width:520px;background:#fff;border-radius:22px;padding:24px}code{background:#e3e9ff;color:#2f5bff;padding:2px 6px;border-radius:6px}p{color:#6c6883;line-height:1.5}</style></head><body><main><h1>City Quest is not configured yet</h1><p>These environment variables are missing or invalid:</p><ul>${items}</ul><p>Add them in Vercel → Project → Settings → Environment Variables (see <code>.env.example</code>), then <strong>redeploy</strong>. Variables starting with <code>NEXT_PUBLIC_</code> are baked in at build time, so a redeploy is required.</p></main></body></html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
