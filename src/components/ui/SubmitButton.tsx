"use client";

import { useFormStatus } from "react-dom";

/** Form submit button that disables itself while the server action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
