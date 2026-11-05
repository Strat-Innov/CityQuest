import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { loginPath } from "@/lib/redirect";

const PROTECTED_PREFIXES = ["/quest", "/pass", "/admin", "/nfc/"];

/**
 * Refreshes the Supabase session cookie and sends signed-out visitors of
 * protected pages to the login screen (preserving where they were going).
 * This is a convenience only: every page and endpoint re-checks the session
 * on the server, and the database enforces access with RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getEnv();

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
