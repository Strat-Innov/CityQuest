import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { requireProfile } from "@/lib/auth";
import { getMyProgress } from "@/lib/data";
import { initials } from "@/lib/format";
import { summarize } from "@/lib/progress";

export const metadata: Metadata = { title: "My Pass" };

export default async function PassPage() {
  await requireProfile("/pass");
  const progress = await getMyProgress();
  const { profile } = progress;
  const summary = summarize(progress);

  return (
    <>
      <h1 className="h1">My Pass</h1>
      <p className="lead">Show this pass to booth staff so they can confirm your identity and hand over your rewards.</p>

      <section className="card text-center" aria-label="Digital participant ID">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue text-2xl font-bold text-white"
          aria-hidden="true"
        >
          {initials(profile.full_name)}
        </div>
        <h2 className="mt-3 text-[22px] font-bold">{profile.full_name}</h2>
        <div className="mt-1 text-sm text-muted">{profile.contact_number}</div>

        <div className="mt-5 rounded-2xl bg-white px-3 py-4">
          <div className="eyebrow">Participant ID</div>
          <div className="mt-1 font-mono text-[28px] font-bold tracking-[0.12em] text-ink">{profile.participant_id}</div>
        </div>

        <div className="mt-5 flex border-t border-line pt-4">
          <div className="flex-1">
            <strong className="block text-[22px]">
              {summary.completed}/{summary.total}
            </strong>
            <span className="text-xs text-muted">Stops done</span>
          </div>
          <div className="flex-1">
            <strong className="block text-[22px]">{summary.earned}</strong>
            <span className="text-xs text-muted">Rewards earned</span>
          </div>
          <div className="flex-1">
            <strong className="block text-[22px]">{summary.redeemed}</strong>
            <span className="text-xs text-muted">Redeemed</span>
          </div>
        </div>
      </section>

      <form action={logout}>
        <button type="submit" className="link-subtle">
          Sign out
        </button>
      </form>
      <Link href="/privacy" className="mt-2 block text-center text-[13px] text-muted underline">
        Privacy notice
      </Link>
    </>
  );
}
