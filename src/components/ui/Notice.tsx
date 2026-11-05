import type { Tone } from "@/lib/check-in-messages";

const TONES: Record<Tone, string> = {
  success: "bg-green-soft text-green",
  info: "bg-blue-soft text-blue",
  warning: "bg-amber-soft text-amber",
  error: "bg-danger-soft text-danger",
};

/** Inline status banner using the prototype's soft colour pairs. */
export function Notice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-snug ${TONES[tone]}`}>
      {children}
    </div>
  );
}
