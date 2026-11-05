import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorContext, logger } from "@/lib/logger";
import { safeNextPath } from "@/lib/redirect";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "magiclink", "recovery", "invite", "email_change"];

/**
 * Email confirmation landing. Supports both the recommended token-hash link
 * (works when the email is opened on a different device) and the PKCE code.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  let error: unknown = null;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = new Error("Missing confirmation parameters");
  }

  if (error) {
    logger.warn("email confirmation failed", errorContext(error));
    return NextResponse.redirect(new URL(`/login?error=confirm&next=${encodeURIComponent(next)}`, origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
