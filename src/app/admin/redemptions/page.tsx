import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/fields";
import { requireRole } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Redemptions" };

interface RedemptionRow {
  id: string;
  redeemed_at: string;
  participant: { participant_id: string; full_name: string } | null;
  staff: { full_name: string; participant_id: string } | null;
  rewards: { reward_name: string; partner_name: string } | null;
}

export default async function RedemptionsPage() {
  await requireRole(["admin"], "/admin/redemptions");
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("reward_redemptions")
    .select(
      "id, redeemed_at, participant:profiles!reward_redemptions_profile_id_fkey(participant_id, full_name), staff:profiles!reward_redemptions_redeemed_by_fkey(full_name, participant_id), rewards(reward_name, partner_name)",
      { count: "exact" },
    )
    .order("redeemed_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load redemptions: ${error.message}`);
  const rows = (data ?? []) as unknown as RedemptionRow[];
  const { APP_TIME_ZONE } = getEnv();

  return (
    <>
      <PageHeader
        title="Redemptions"
        description={`${(count ?? 0).toLocaleString("en")} rewards handed over${(count ?? 0) > rows.length ? `, latest ${rows.length} shown` : ""}.`}
      />
      <ul className="mt-5 space-y-2.5">
        {rows.map((row) => (
          <li key={row.id} className="stop-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold">{row.rewards?.reward_name}</div>
              <div className="text-[13px] text-muted">{row.rewards?.partner_name}</div>
            </div>
            <div className="text-sm sm:text-right">
              {row.participant ? (
                <Link href={`/admin/participants/${row.participant.participant_id}`} className="font-semibold hover:underline">
                  {row.participant.full_name} <span className="font-mono text-muted">{row.participant.participant_id}</span>
                </Link>
              ) : null}
              <div className="text-xs text-muted">
                {formatDateTime(row.redeemed_at, APP_TIME_ZONE)} · by {row.staff?.full_name ?? "unknown"}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="card text-sm text-muted">No rewards redeemed yet.</p> : null}
    </>
  );
}
