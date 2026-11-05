import type { Progress, RewardProgress, StationProgress } from "@/lib/types";

export interface ProgressSummary {
  completed: number;
  total: number;
  remaining: number;
  earned: number;
  redeemed: number;
  rewardCount: number;
  /** The next stop the participant can do (skips the locked final stop), as in the prototype. */
  nextStation: StationProgress | null;
  nextReward: RewardProgress | null;
  grandReward: RewardProgress | null;
  questComplete: boolean;
  /** Width of the progress rail fill, in percent. */
  railFillPercent: number;
}

/** Pure presentation helper. All rules are enforced by the database. */
export function summarize(progress: Progress): ProgressSummary {
  const stations = progress.stations.filter((station) => station.is_active || station.completed_at);
  const completed = stations.filter((station) => station.completed_at).length;
  const total = stations.length;
  const earned = progress.rewards.filter((reward) => reward.status !== "locked").length;
  const redeemed = progress.rewards.filter((reward) => reward.status === "redeemed").length;
  const nextStation =
    stations.find((station) => !station.completed_at && !station.locked && station.is_active) ?? null;
  const nextReward = nextStation
    ? (progress.rewards.find((reward) => reward.station_number === nextStation.number) ?? null)
    : null;
  const grandReward = progress.rewards.find((reward) => reward.is_grand) ?? null;

  return {
    completed,
    total,
    remaining: total - completed,
    earned,
    redeemed,
    rewardCount: progress.rewards.length,
    nextStation,
    nextReward,
    grandReward,
    questComplete: total > 0 && completed === total,
    railFillPercent: railFill(completed, total),
  };
}

/** Same formula as the prototype: the fill reaches the n-th node. */
export function railFill(completed: number, total: number): number {
  if (completed <= 0 || total <= 1) return 0;
  return Math.min(100, ((completed - 1) / (total - 1)) * 100);
}

export function rewardsForStation(progress: Progress, stationNumber: number): RewardProgress[] {
  return progress.rewards.filter((reward) => reward.station_number === stationNumber);
}
