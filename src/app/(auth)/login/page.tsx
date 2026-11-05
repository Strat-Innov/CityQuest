import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/(auth)/LoginForm";
import { Notice } from "@/components/ui/Notice";
import { getCurrentUser } from "@/lib/auth";
import { isNfcPath, safeNextPath } from "@/lib/redirect";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext);
  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <h1 className="h1">City Quest</h1>
      <p className="lead">Sign in to continue your quest.</p>
      {isNfcPath(next) ? (
        <Notice tone="info">You tapped a City Quest stop. Sign in and we&apos;ll record your check-in straight away.</Notice>
      ) : null}
      {error === "confirm" ? (
        <Notice tone="error">That confirmation link is invalid or has expired. Sign in, or register again.</Notice>
      ) : null}
      <section className="card">
        <LoginForm next={next} />
      </section>
    </>
  );
}
