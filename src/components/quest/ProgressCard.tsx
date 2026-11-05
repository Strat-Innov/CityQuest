import { GiftIcon, StarIcon } from "@/components/ui/icons";
import type { ProgressSummary } from "@/lib/progress";
import type { StationProgress } from "@/lib/types";

/** "Missions complete" card from the prototype, driven by server data. */
export function ProgressCard({ summary, stations }: { summary: ProgressSummary; stations: StationProgress[] }) {
  const { completed, total, remaining, earned, nextStation, nextReward, grandReward } = summary;
  const span = Math.max(total - 1, 1);

  return (
    <section className="card" aria-labelledby="progress-label">
      <div className="eyebrow" id="progress-label">
        Missions complete
      </div>
      <div className="mt-2 text-[56px] font-bold leading-none tracking-[-0.04em]">
        {completed}
        <small className="text-[22px] font-semibold tracking-normal text-muted"> / {total}</small>
      </div>
      <p className="mt-2 text-[15px] text-muted">
        {remaining > 0
          ? `${remaining} more stop${remaining > 1 ? "s" : ""} to complete your quest.`
          : "Quest complete. Well done, explorer!"}
      </p>

      <div
        className="relative mx-1.5 mb-1.5 mt-[26px] h-[30px]"
        role="progressbar"
        aria-label="Quest progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
      >
        <div className="absolute left-0 right-0 top-3 h-1.5 rounded-md bg-line" />
        <div
          className="absolute left-0 top-3 h-1.5 rounded-md bg-blue transition-[width] duration-500"
          style={{ width: `${summary.railFillPercent}%` }}
        />
        {stations.map((station, index) => {
          const done = Boolean(station.completed_at);
          const tone = station.is_final
            ? done
              ? "border-blue bg-blue text-white"
              : "border-blue bg-white text-blue"
            : done
              ? "border-green bg-green text-white"
              : "border-line bg-white text-muted";
          return (
            <span
              key={station.number}
              className={`absolute top-0 -ml-[15px] grid h-[30px] w-[30px] place-items-center rounded-full border-2 text-xs font-bold ${tone}`}
              style={{ left: `${(index / span) * 100}%` }}
              aria-hidden="true"
            >
              {done ? "✓" : station.number}
            </span>
          );
        })}
      </div>
      <div className="-mx-1 mt-1 flex justify-between text-xs text-muted">
        <b className="text-green">
          {earned} reward{earned === 1 ? "" : "s"} unlocked
        </b>
        {grandReward ? <span>Grand reward</span> : null}
      </div>

      {nextStation && nextReward ? (
        <NextBlock
          icon={nextStation.is_final ? <StarIcon /> : <GiftIcon />}
          eyebrow="Next reward"
          title={nextReward.name}
          detail={`Stop ${nextStation.number} · ${nextStation.name}`}
        />
      ) : summary.questComplete && grandReward ? (
        <NextBlock
          icon={<StarIcon />}
          eyebrow="All rewards unlocked"
          title={`${grandReward.name} earned`}
          detail={`Collect it at ${grandReward.location}`}
        />
      ) : null}
    </section>
  );
}

function NextBlock({ icon, eyebrow, title, detail }: { icon: React.ReactNode; eyebrow: string; title: string; detail: string }) {
  return (
    <div className="mt-[18px] flex items-center gap-3 rounded-2xl bg-blue-soft p-3.5">
      <div className="ico">{icon}</div>
      <div>
        <div className="eyebrow !text-blue">{eyebrow}</div>
        <strong className="mt-0.5 block text-base">{title}</strong>
        <span className="text-[13px] text-muted">{detail}</span>
      </div>
    </div>
  );
}
