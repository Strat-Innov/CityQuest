import { GiftIcon, NfcIcon, StarIcon } from "@/components/ui/icons";
import { RewardCollectButton } from "@/components/quest/RewardCollectButton";
import { formatCompletedAt, formatDateTime } from "@/lib/format";
import type { Progress } from "@/lib/types";

/** "Your Journey" timeline from the prototype, with NFC check-in guidance. */
export function JourneyList({ progress, timeZone }: { progress: Progress; timeZone: string }) {
  const participantId = progress.profile.participant_id;
  const remaining = progress.remaining_before_final;

  return (
    <>
      <h2 className="mb-1 mt-[34px] text-center text-2xl font-bold tracking-[-0.01em]">Your Journey</h2>
      <p className="text-center text-sm text-muted">Tap your phone on the NFC sticker at each stop to check in.</p>
      <ol className="relative mt-[18px] list-none p-0 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-0.5 before:bg-line">
        {progress.stations.map((station) => {
          const done = Boolean(station.completed_at);
          const rewards = progress.rewards.filter((reward) => reward.station_number === station.number);
          const dotTone = station.is_final
            ? done
              ? "border-blue bg-blue text-white"
              : "border-blue bg-white text-blue"
            : done
              ? "border-green bg-green text-white"
              : "border-line bg-white text-muted";

          return (
            <li key={station.number} className="relative mb-3.5 flex gap-3.5">
              <span
                className={`z-[1] grid h-10 w-10 flex-none place-items-center rounded-full border-2 font-bold ${dotTone}`}
                aria-hidden="true"
              >
                {done ? "✓" : station.number}
              </span>
              <div className={`stop-card ${station.locked ? "opacity-65" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold">
                      <span className="sr-only">Stop {station.number}: </span>
                      {station.name}
                    </h3>
                    <div className="mt-0.5 text-[13px] text-muted">{station.location}</div>
                  </div>
                  {done && station.completed_at ? (
                    <span className="pill pill-ready" title={formatDateTime(station.completed_at, timeZone)}>
                      Done {formatCompletedAt(station.completed_at, timeZone)}
                    </span>
                  ) : (
                    <span className="pill pill-lock">{station.locked ? "Locked" : station.is_active ? "To do" : "Closed"}</span>
                  )}
                </div>
                {station.mission ? <p className="mt-2 text-sm leading-[1.45] text-body">{station.mission}</p> : null}

                {rewards.map((reward) => (
                  <div key={reward.name} className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-white/80 p-2.5">
                    <span className="ico !h-9 !w-9 !rounded-[10px] !bg-blue-soft">
                      {reward.is_grand ? <StarIcon className="h-[18px] w-[18px]" /> : <GiftIcon className="h-[18px] w-[18px]" />}
                    </span>
                    <div className="flex-1 text-[13px] text-muted">
                      <strong className="block text-sm text-ink">{reward.name}</strong>
                      {reward.is_grand ? "Grand reward" : reward.partner ? `Reward from ${reward.partner}` : "Reward"}
                    </div>
                  </div>
                ))}

                {done ? (
                  rewards.map((reward) =>
                    reward.status === "redeemed" ? (
                      <button key={reward.name} type="button" className="btn btn-ghost" disabled>
                        {rewards.length > 1 ? `${reward.name} redeemed` : "Reward redeemed"}
                      </button>
                    ) : reward.status === "earned" ? (
                      <RewardCollectButton
                        key={reward.name}
                        rewardName={reward.name}
                        partner={reward.partner}
                        location={reward.location}
                        participantId={participantId}
                        label={rewards.length > 1 ? `Collect ${reward.name}` : "Show reward"}
                        className="btn btn-ghost"
                      />
                    ) : null,
                  )
                ) : station.locked ? (
                  <button type="button" className="btn" disabled>
                    Finish {remaining} more stop{remaining === 1 ? "" : "s"} to unlock
                  </button>
                ) : station.is_active ? (
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-blue-soft p-2.5 text-[13px] text-blue">
                    <NfcIcon className="h-5 w-5 flex-none" />
                    <span>When you arrive, tap your phone on the NFC sticker at this stop.</span>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
