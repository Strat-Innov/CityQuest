import type { Metadata } from "next";
import Link from "next/link";
import { isNfcPath, safeNextPath } from "@/lib/redirect";

export const metadata: Metadata = { title: "Confirm your email" };

type SearchParams = Promise<{ next?: string }>;

export default async function CheckEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNextPath((await searchParams).next);
  return (
    <>
      <h1 className="h1">Check your email</h1>
      <p className="lead">
        We&apos;ve sent you a confirmation link. Open it on this phone to activate your City Quest pass.
      </p>
      <section className="card">
        <p className="text-sm leading-relaxed text-body">
          {isNfcPath(next)
            ? "Once confirmed, you'll return to the stop you tapped and your check-in will be recorded."
            : "Once confirmed, you'll be signed in and can start your quest."}
        </p>
        <p className="hint">Can&apos;t find it? Check your spam folder, or wait a minute before trying again.</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-ghost">
          Back to sign in
        </Link>
      </section>
    </>
  );
}
