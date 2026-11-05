"use client";

import { PhoneFrame } from "@/components/ui/PhoneFrame";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PhoneFrame>
      <h1 className="h1">Something went wrong</h1>
      <p className="lead">We couldn&apos;t load this page. Check your connection and try again.</p>
      <button type="button" className="btn" onClick={reset}>
        Try again
      </button>
    </PhoneFrame>
  );
}
