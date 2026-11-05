import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateReward } from "@/app/admin/actions";
import { PageHeader } from "@/components/admin/fields";
import { RewardForm } from "@/components/admin/RewardForm";
import { requireRole } from "@/lib/auth";
import { REWARD_COLUMNS, type RewardRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit reward" };

type Params = Promise<{ id: string }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditRewardPage({ params }: { params: Params }) {
  const { id } = await params;
  await requireRole(["admin"], `/admin/rewards/${id}`);
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: reward, error }, { data: stations, error: stationsError }] = await Promise.all([
    supabase.from("rewards").select(REWARD_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("stations").select("id, sort_order, station_name, is_active").order("sort_order"),
  ]);
  if (error || stationsError) throw new Error(`Could not load reward: ${(error ?? stationsError)?.message}`);
  if (!reward) notFound();
  const row = reward as unknown as RewardRow;

  return (
    <>
      <Link href="/admin/rewards" className="mt-6 inline-block text-sm font-semibold text-blue underline">
        ← All rewards
      </Link>
      <PageHeader title={row.reward_name} description="Changes apply immediately to all participants." />
      <RewardForm action={updateReward.bind(null, row.id)} reward={row} stations={stations ?? []} submitLabel="Save changes" />
    </>
  );
}
