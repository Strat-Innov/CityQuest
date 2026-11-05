import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/fields";
import { requireRole } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, PARTICIPANT_ID_PATTERN } from "@/lib/validation";

export const metadata: Metadata = { title: "Participants" };

const PAGE_SIZE = 25;

type SearchParams = Promise<{ q?: string; page?: string }>;

interface ParticipantRow {
  participant_id: string;
  full_name: string;
  contact_number: string;
  created_at: string;
  check_ins: { count: number }[];
  reward_redemptions: { count: number }[];
}

export default async function ParticipantsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["staff", "admin"], "/admin/participants");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const { APP_TIME_ZONE } = getEnv();

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(
      "participant_id, full_name, contact_number, created_at, check_ins(count), reward_redemptions!reward_redemptions_profile_id_fkey(count)",
      { count: "exact" },
    )
    .eq("role", "participant")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    const upper = q.toUpperCase();
    query = PARTICIPANT_ID_PATTERN.test(upper)
      ? query.eq("participant_id", upper)
      : /^CQ-?[A-Z0-9]*$/.test(upper)
        ? query.ilike("participant_id", `${escapeLike(upper.replace(/^CQ-?/, "CQ-"))}%`)
        : query.ilike("full_name", `%${escapeLike(q)}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`Could not load participants: ${error.message}`);
  const rows = (data ?? []) as unknown as ParticipantRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) => `/admin/participants?${new URLSearchParams({ ...(q ? { q } : {}), page: String(target) })}`;

  return (
    <>
      <PageHeader title="Participants" description="Look up a participant by name or Participant ID." />
      <form role="search" className="card flex flex-col gap-2 sm:flex-row sm:items-end" action="/admin/participants">
        <div className="flex-1">
          <label htmlFor="q" className="field-label !mt-0">
            Name or Participant ID
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="CQ-AB12C or Maya" className="field" autoComplete="off" />
        </div>
        <button type="submit" className="btn sm:w-auto sm:px-8">
          Search
        </button>
      </form>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {total.toLocaleString("en")} participant{total === 1 ? "" : "s"}
        {q ? ` matching “${q}”` : ""}
      </p>

      <ul className="mt-2 space-y-2.5">
        {rows.map((row) => (
          <li key={row.participant_id}>
            <Link
              href={`/admin/participants/${row.participant_id}`}
              className="stop-card flex flex-wrap items-center justify-between gap-3 hover:border-blue-soft"
            >
              <div>
                <div className="font-bold">{row.full_name}</div>
                <div className="mt-0.5 text-[13px] text-muted">
                  <span className="font-mono text-ink">{row.participant_id}</span> · {row.contact_number}
                </div>
                <div className="mt-0.5 text-xs text-muted">Registered {formatDateTime(row.created_at, APP_TIME_ZONE)}</div>
              </div>
              <div className="flex gap-2">
                <span className="pill pill-ready">{row.check_ins?.[0]?.count ?? 0} stops</span>
                <span className="pill pill-used">{row.reward_redemptions?.[0]?.count ?? 0} redeemed</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="card text-sm text-muted">No participants found.</p> : null}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-semibold text-blue underline">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="font-semibold text-blue underline">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
