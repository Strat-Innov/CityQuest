import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RedeemButton } from "@/components/admin/RedeemButton";
import { requireRole } from "@/lib/auth";
import { getParticipantForStaff } from "@/lib/data";
import { getEnv } from "@/lib/env";
import { formatDateTime, initials } from "@/lib/format";
import { summarize } from "@/lib/progress";
import { participantIdSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Participant" };

type Params = Promise<{ participantId: string }>;

export default async function ParticipantDetailPage({ params }: { params: Params }) {
  const { participantId: raw } = await params;
  await requireRole(["staff", "admin"], `/admin/participants/${raw}`);
  const parsed = participantIdSchema.safeParse(decodeURIComponent(raw));
  if (!parsed.success) notFound();

  const participant = await getParticipantForStaff(parsed.data);
  if (!participant) notFound();

  const { APP_TIME_ZONE } = getEnv();
  const summary = summarize(participant);
  const { profile } = participant;

  return (
    <>
      <Link href="/admin/participants" className="mt-6 inline-block text-sm font-semibold text-blue underline">
        ← All participants
      </Link>

      <section className="card flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 flex-none place-items-center rounded-full bg-blue text-2xl font-bold text-white" aria-hidden="true">
          {initials(profile.full_name)}
        </div>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold">{profile.full_name}</h1>
          <div className="font-mono text-lg font-bold tracking-[0.08em]">{profile.participant_id}</div>
          <div className="text-sm text-muted">
            {profile.contact_number} · {participant.email}
          </div>
        </div>
        <dl className="flex w-full gap-2 border-t border-line pt-4 text-center sm:w-auto sm:border-0 sm:pt-0">
          <div className="flex-1 sm:px-3">
            <dt className="text-xs text-muted">Stops done</dt>
            <dd className="text-[22px] font-bold">
              {summary.completed}/{summary.total}
            </dd>
          </div>
          <div className="flex-1 sm:px-3">
            <dt className="text-xs text-muted">Earned</dt>
            <dd className="text-[22px] font-bold">{summary.earned}</dd>
          </div>
          <div className="flex-1 sm:px-3">
            <dt className="text-xs text-muted">Redeemed</dt>
            <dd className="text-[22px] font-bold">{summary.redeemed}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-x-5 lg:grid-cols-2">
        <section className="card" aria-labelledby="rewards-heading">
          <h2 id="rewards-heading" className="text-lg font-bold">
            Rewards
          </h2>
          <p className="hint">Check the participant&apos;s ID and name before redeeming.</p>
          <ul className="mt-2">
            {participant.rewards.map((reward, index) => (
              <li key={reward.id} className={`py-3 ${index > 0 ? "border-t border-dashed border-line" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block">{reward.name}</strong>
                    <span className="text-[13px] text-muted">
                      Stop {reward.station_number} · {reward.partner || reward.station_name}
                    </span>
                  </div>
                  {reward.status === "locked" ? (
                    <span className="pill pill-lock">Locked</span>
                  ) : reward.status === "redeemed" ? (
                    <span className="pill pill-used">Redeemed</span>
                  ) : (
                    <span className="pill pill-ready">Earned</span>
                  )}
                </div>
                {reward.status === "redeemed" && reward.redeemed_at ? (
                  <p className="mt-1 text-xs text-muted">Redeemed {formatDateTime(reward.redeemed_at, APP_TIME_ZONE)}</p>
                ) : null}
                {reward.status !== "locked" && reward.id ? (
                  <RedeemButton
                    participantId={profile.participant_id}
                    rewardId={reward.id}
                    rewardName={reward.name}
                    redeemed={reward.status === "redeemed"}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="stations-heading">
          <h2 id="stations-heading" className="text-lg font-bold">
            Stations
          </h2>
          <ul className="mt-2">
            {participant.stations.map((station, index) => (
              <li
                key={station.number}
                className={`flex items-center justify-between gap-3 py-2.5 text-sm ${index > 0 ? "border-t border-dashed border-line" : ""}`}
              >
                <span>
                  <strong>Stop {station.number}</strong> · {station.name}
                </span>
                {station.completed_at ? (
                  <span className="pill pill-ready">{formatDateTime(station.completed_at, APP_TIME_ZONE)}</span>
                ) : (
                  <span className="pill pill-lock">{station.locked ? "Locked" : "Not yet"}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
