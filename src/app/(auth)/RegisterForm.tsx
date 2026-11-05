"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/ui/FormField";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(register, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <FormField
        label="Full name"
        name="fullName"
        autoComplete="name"
        required
        maxLength={100}
        defaultValue={state.values?.fullName ?? ""}
        error={errors.fullName}
      />
      <FormField
        label="Contact number"
        name="contactNumber"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        maxLength={20}
        hint="Shown on your digital pass so booth staff can confirm it's you."
        defaultValue={state.values?.contactNumber ?? ""}
        error={errors.contactNumber}
      />
      <FormField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email ?? ""}
        error={errors.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        hint="At least 8 characters."
        error={errors.password}
      />

      <div className="mt-5 flex items-start gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          className="mt-0.5 h-5 w-5 flex-none accent-blue"
          defaultChecked={state.values?.consent === "on"}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? "consent-error" : undefined}
        />
        <label htmlFor="consent" className="text-sm leading-snug text-body">
          I agree that City Quest may store my name, contact number, email and quest progress to run this event, as
          described in the{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-blue underline">
            privacy notice
          </Link>
          .
        </label>
      </div>
      {errors.consent ? (
        <p id="consent-error" className="field-error">
          {errors.consent}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Creating your pass…" className="btn mt-6">
        Create my pass
      </SubmitButton>
      <p className="mt-4 text-center text-sm text-muted">
        Already registered?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-blue underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
