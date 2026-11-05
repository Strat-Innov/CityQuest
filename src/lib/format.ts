/** Two-letter initials for the pass avatar. */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return (first + last).toUpperCase();
}

function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** "09:42" for today, "5 Nov, 09:42" otherwise — matching the prototype's "Done 09:42". */
export function formatCompletedAt(iso: string, timeZone: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  if (dayKey(date, timeZone) === dayKey(now, timeZone)) return time;
  const day = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" }).format(date);
  return `${day}, ${time}`;
}

/** Full timestamp for admin tables and accessible labels: "5 Nov 2026, 09:42". */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** "six" for small counts (as in the prototype copy), digits otherwise. */
export function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}
