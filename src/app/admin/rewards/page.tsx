import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, StatusPill } from "@/components/admin/fields";
import { Notice } from "@/components/ui/Notice";
import { requireRole } from "@/lib/auth";
import { REWARD_COLUMNS, type RewardRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rewards" };

type SearchParams = Promise<{ saved?: string }>;

type Row = RewardRow & {
  stations: { sort_order: number; station_name: string; is_final: boolean } | null;
  reward_redemptions: { count: number }[];
};

export default async function RewardsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["admin"], "/admin/rewards");
  const { saved } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rewards")
    .select(`${REWARD_COLUMNS}, stations(sort_order, station_name, is_final), reward_redemptions(count)`)
    .order("created_at");
  if (error) throw new Error(`Could not load rewards: ${error.message}`);
  const rewards = ((data ?? []) as unknown as Row[]).sort(
    (a, b) => (a.stations?.sort_order ?? 0) - (b.stations?.sort_order ?? 0),
  );

  return (
    <>
      <PageHeader
        title="Rewards"
        description="Each reward unlocks when a participant checks in at its station."
        action={
          <Link href="/admin/rewards/new" className="btn !mt-0 sm:w-auto sm:px-6">
            New reward
          </Link>
        }
      />
      {saved ? <Notice tone="success">Reward saved.</Notice> : null}
      <ul className="mt-5 space-y-2.5">
        {rewards.map((reward) => (
          <li key={reward.id}>
            <Link href={`/admin/rewards/${reward.id}`} className="stop-card flex flex-wrap items-center justify-between gap-3 hover:border-blue-soft">
              <div>
                <div className="font-bold">
                  {reward.reward_name}
                  {reward.stations?.is_final ? <span className="pill pill-blue ml-2">Grand</span> : null}
                </div>
                <div className="text-[13px] text-muted">
                  Stop {reward.stations?.sort_order} · {reward.stations?.station_name}
                  {reward.partner_name ? ` · ${reward.partner_name}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <StatusPill active={reward.is_active} />
                <span className="pill pill-used">{reward.reward_redemptions?.[0]?.count ?? 0} redeemed</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {rewards.length === 0 ? <p className="card text-sm text-muted">No rewards yet.</p> : null}
    </>
  );
}
