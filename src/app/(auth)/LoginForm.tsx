"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/ui/FormField";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(login, {});

  return (
    <form action={action} noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <FormField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email ?? ""}
        error={state.fieldErrors?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="Signing in…" className="btn mt-6">
        Sign in
      </SubmitButton>
      <p className="mt-4 text-center text-sm text-muted">
        New to City Quest?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-blue underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
