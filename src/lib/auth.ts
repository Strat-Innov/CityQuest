import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginPath } from "@/lib/redirect";
import type { Role } from "@/lib/types";

export interface SessionProfile {
  id: string;
  participant_id: string;
  full_name: string;
  contact_number: string;
  role: Role;
}

/** Validated user for this request (getUser verifies the JWT with Supabase Auth). */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<SessionProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, participant_id, full_name, contact_number, role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data as SessionProfile | null;
});

/** Requires a signed-in user with a profile; otherwise redirects to login. */
export async function requireProfile(returnTo: string): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(loginPath(returnTo));
  return profile;
}

/**
 * Requires one of the given roles. Users without it get a 404 so admin
 * routes are not discoverable. The database enforces the same rules.
 */
export async function requireRole(roles: readonly Role[], returnTo: string): Promise<SessionProfile> {
  const profile = await requireProfile(returnTo);
  if (!roles.includes(profile.role)) notFound();
  return profile;
}

export function isStaff(role: Role): boolean {
  return role === "staff" || role === "admin";
}
