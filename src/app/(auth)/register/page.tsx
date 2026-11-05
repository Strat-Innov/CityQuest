import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/app/(auth)/RegisterForm";
import { Notice } from "@/components/ui/Notice";
import { getCurrentUser } from "@/lib/auth";
import { isNfcPath, safeNextPath } from "@/lib/redirect";

export const metadata: Metadata = { title: "Register" };

type SearchParams = Promise<{ next?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <h1 className="h1">Join City Quest</h1>
      <p className="lead">Create your digital pass. You&apos;ll get a unique Participant ID to show at each stop.</p>
      {isNfcPath(next) ? (
        <Notice tone="info">After registering, we&apos;ll record your check-in at the stop you just tapped.</Notice>
      ) : null}
      <section className="card">
        <RegisterForm next={next} />
      </section>
    </>
  );
}
