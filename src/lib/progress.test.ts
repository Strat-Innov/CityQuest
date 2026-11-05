import { describe, expect, it } from "vitest";
import { railFill, summarize } from "@/lib/progress";
import type { Progress, RewardProgress, StationProgress } from "@/lib/types";

function station(number: number, done: boolean, extra: Partial<StationProgress> = {}): StationProgress {
  return {
    number,
    name: `Stop ${number}`,
    location: "Somewhere",
    mission: "",
    is_final: number === 6,
    is_active: true,
    completed_at: done ? "2026-11-05T01:00:00Z" : null,
    locked: false,
    ...extra,
  };
}

function reward(number: number, status: RewardProgress["status"]): RewardProgress {
  return {
    station_number: number,
    station_name: `Stop ${number}`,
    location: "Somewhere",
    name: `Reward ${number}`,
    description: "",
    partner: "Partner",
    is_grand: number === 6,
    status,
    earned_at: null,
    redeemed_at: null,
  };
}

function progress(doneCount: number, redeemedCount = 0): Progress {
  const stations = [1, 2, 3, 4, 5, 6].map((n) =>
    station(n, n <= doneCount, n === 6 ? { locked: doneCount < 5 } : {}),
  );
  const rewards = [1, 2, 3, 4, 5, 6].map((n) =>
    reward(n, n <= redeemedCount ? "redeemed" : n <= doneCount ? "earned" : "locked"),
  );
  return {
    profile: { participant_id: "CQ-AB12C", full_name: "Maya Ortiz", contact_number: "0917", role: "participant", created_at: "" },
    stations,
    rewards,
    remaining_before_final: Math.max(0, 5 - doneCount),
  };
}

describe("summarize", () => {
  it("matches the prototype's demo state (2 done, 1 redeemed)", () => {
    const summary = summarize(progress(2, 1));
    expect(summary).toMatchObject({ completed: 2, total: 6, remaining: 4, earned: 2, redeemed: 1, questComplete: false });
    expect(summary.nextStation?.number).toBe(3);
    expect(summary.nextReward?.name).toBe("Reward 3");
  });

  it("skips the locked final stop when choosing the next reward", () => {
    const p = progress(0);
    p.stations = p.stations.map((s) => (s.number < 6 ? { ...s, completed_at: s.number === 5 ? null : "x" } : s));
    expect(summarize(p).nextStation?.number).toBe(5);
  });

  it("reports quest completion with the grand reward", () => {
    const summary = summarize(progress(6));
    expect(summary.questComplete).toBe(true);
    expect(summary.nextStation).toBeNull();
    expect(summary.grandReward?.name).toBe("Reward 6");
  });
});

describe("railFill", () => {
  it("follows the prototype formula", () => {
    expect(railFill(0, 6)).toBe(0);
    expect(railFill(1, 6)).toBe(0);
    expect(railFill(2, 6)).toBe(20);
    expect(railFill(6, 6)).toBe(100);
    expect(railFill(1, 1)).toBe(0);
  });
});
