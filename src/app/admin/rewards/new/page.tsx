import type { Metadata } from "next";
import Link from "next/link";
import { createReward } from "@/app/admin/actions";
import { PageHeader } from "@/components/admin/fields";
import { RewardForm } from "@/components/admin/RewardForm";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New reward" };

export default async function NewRewardPage() {
  await requireRole(["admin"], "/admin/rewards/new");
  const supabase = await createClient();
  const { data, error } = await supabase.from("stations").select("id, sort_order, station_name, is_active").order("sort_order");
  if (error) throw new Error(`Could not load stations: ${error.message}`);

  return (
    <>
      <Link href="/admin/rewards" className="mt-6 inline-block text-sm font-semibold text-blue underline">
        ← All rewards
      </Link>
      <PageHeader title="New reward" />
      <RewardForm action={createReward} stations={data ?? []} submitLabel="Create reward" />
    </>
  );
}
