import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEnv } from "@/lib/env";
import { errorContext, logger } from "@/lib/logger";
import type { CheckInResult } from "@/lib/types";
import { checkInRequestSchema } from "@/lib/validation";

/**
 * POST /api/check-in  { token, latitude?, longitude? }
 *
 * The only way to record progress. All rules (token validity, active station,
 * final-stop lock, duplicates, geofence, rate limiting, audit) are enforced
 * atomically by the public.check_in database function, running as the
 * authenticated participant. The browser only reports what the server decided.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return respond({ status: "forbidden" }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ status: "bad_request" }, 400);
  }

  const parsed = checkInRequestSchema.safeParse(body);
  if (!parsed.success) {
    // A malformed token can never match a station.
    return respond({ status: "invalid_token" }, 200);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return respond({ status: "unauthenticated" }, 401);
  }

  const { data, error } = await supabase.rpc("check_in", {
    p_token: parsed.data.token,
    p_latitude: parsed.data.latitude ?? null,
    p_longitude: parsed.data.longitude ?? null,
  });

  if (error || !data) {
    logger.error("check_in rpc failed", { ...errorContext(error), userId: user.id });
    return respond({ status: "server_error" }, 500);
  }

  const result = data as CheckInResult;
  if (result.status !== "already_completed" && result.status !== "checked_in") {
    logger.info("check-in rejected", { status: result.status, userId: user.id, station: result.station?.number });
  }

  const httpStatus = result.status === "rate_limited" ? 429 : result.status === "unauthenticated" ? 401 : 200;
  return respond(result, httpStatus);
}

function respond(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** CSRF defence in depth (session cookies are also SameSite=Lax). */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([request.nextUrl.origin]);
  try {
    allowed.add(new URL(getEnv().NEXT_PUBLIC_SITE_URL).origin);
  } catch {
    // Env validation reports misconfiguration elsewhere.
  }
  return allowed.has(origin);
}
