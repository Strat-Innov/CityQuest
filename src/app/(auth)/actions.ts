"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEnv } from "@/lib/env";
import { errorContext, logger } from "@/lib/logger";
import { safeNextPath } from "@/lib/redirect";
import { fieldErrors, formValues, loginSchema, registerSchema } from "@/lib/validation";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so the form keeps what the user typed (never the password). */
  values?: Record<string, string | undefined>;
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = formValues(formData, ["email", "password", "next"]);
  const values = { email: raw.email };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email address first. Check your inbox for the confirmation link.", values };
    }
    if (error.status === 429) {
      return { error: "Too many sign-in attempts. Please wait a moment and try again.", values };
    }
    if (error.code !== "invalid_credentials") logger.warn("login failed", errorContext(error));
    return { error: "Incorrect email or password.", values };
  }

  redirect(safeNextPath(raw.next));
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = formValues(formData, ["fullName", "contactNumber", "email", "password", "consent", "next"]);
  const values = {
    fullName: raw.fullName,
    contactNumber: raw.contactNumber,
    email: raw.email,
    consent: raw.consent,
  };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const next = safeNextPath(raw.next);
  const { NEXT_PUBLIC_SITE_URL } = getEnv();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // The Participant ID and profile row are created by a database trigger.
      data: {
        full_name: parsed.data.fullName,
        contact_number: parsed.data.contactNumber,
        privacy_consent: true,
      },
      emailRedirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { error: "An account with this email already exists. Try signing in instead.", values };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: "Choose a stronger password (mix letters, numbers and symbols)." }, values };
    }
    if (error.status === 429) {
      return { error: "Too many registrations from this device. Please wait a moment and try again.", values };
    }
    logger.error("registration failed", errorContext(error));
    return { error: "We couldn't create your account. Check your details and try again.", values };
  }

  // With email confirmation enabled (recommended) there is no session yet.
  if (!data.session) redirect(`/check-email?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
