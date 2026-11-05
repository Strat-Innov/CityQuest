import type { Metadata } from "next";
import Link from "next/link";
import { JourneyList } from "@/components/quest/JourneyList";
import { ProgressCard } from "@/components/quest/ProgressCard";
import { RewardsWallet } from "@/components/quest/RewardsWallet";
import { isStaff, requireProfile } from "@/lib/auth";
import { getMyProgress } from "@/lib/data";
import { getEnv } from "@/lib/env";
import { countWord } from "@/lib/format";
import { summarize } from "@/lib/progress";

export const metadata: Metadata = { title: "Quest" };

export default async function QuestPage() {
  const profile = await requireProfile("/quest");
  const progress = await getMyProgress();
  const summary = summarize(progress);
  const { APP_TIME_ZONE } = getEnv();

  return (
    <>
      <h1 className="h1">City Quest</h1>
      <p className="lead">
        Complete missions at {countWord(summary.total)} stops across the city, in any order. Every stop unlocks its own reward.
      </p>

      {isStaff(profile.role) ? (
        <Link href="/admin" className="btn btn-ghost">
          Open staff console
        </Link>
      ) : null}

      <ProgressCard summary={summary} stations={progress.stations} />
      <RewardsWallet
        rewards={progress.rewards}
        participantId={progress.profile.participant_id}
        earned={summary.earned}
        redeemed={summary.redeemed}
      />
      <JourneyList progress={progress} timeZone={APP_TIME_ZONE} />
    </>
  );
}
