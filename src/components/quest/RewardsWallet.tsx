"use client";

import { useState } from "react";
import { ChevronIcon } from "@/components/ui/icons";
import { RewardCollectButton } from "@/components/quest/RewardCollectButton";
import type { RewardProgress } from "@/lib/types";

/** Collapsible "My Rewards" wallet from the prototype. */
export function RewardsWallet({
  rewards,
  participantId,
  earned,
  redeemed,
}: {
  rewards: RewardProgress[];
  participantId: string;
  earned: number;
  redeemed: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card overflow-hidden !p-0">
      <button
        type="button"
        className="box-border flex w-full cursor-pointer items-center gap-2.5 px-5 py-4 text-left focus-visible:rounded-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue"
        aria-expanded={open}
        aria-controls="rewards-list"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex-1">
          <strong className="block text-base">My Rewards</strong>
          <span className="text-[13px] text-muted">
            {earned} of {rewards.length} earned · {redeemed} redeemed
          </span>
        </span>
        <span className="flex" aria-hidden="true">
          {rewards.map((reward) => (
            <i
              key={`${reward.station_number}-${reward.name}`}
              className={`-ml-1.5 h-6 w-6 rounded-full border-2 border-white ${reward.status === "locked" ? "bg-line" : "bg-green"}`}
            />
          ))}
        </span>
        <span className={`text-blue transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronIcon />
        </span>
      </button>
      <div id="rewards-list" hidden={!open} className="border-t border-line px-5 pb-3.5 pt-1.5">
        {rewards.length === 0 ? <p className="py-2.5 text-sm text-muted">No rewards yet.</p> : null}
        {rewards.map((reward, index) => (
          <div
            key={`${reward.station_number}-${reward.name}`}
            className={`flex items-center gap-2.5 py-2.5 text-sm ${index > 0 ? "border-t border-dashed border-line" : ""}`}
          >
            <span className="flex-1">
              {reward.name}
              <span className="block text-xs text-muted">
                {reward.partner || `Stop ${reward.station_number}`}
                {reward.description ? ` · ${reward.description}` : ""}
              </span>
            </span>
            {reward.status === "locked" ? (
              <span className="pill pill-lock">Locked</span>
            ) : reward.status === "redeemed" ? (
              <span className="pill pill-used">Redeemed</span>
            ) : (
              <RewardCollectButton
                rewardName={reward.name}
                partner={reward.partner}
                location={reward.location}
                participantId={participantId}
                label="Collect"
                className="pill pill-ready cursor-pointer border-0"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
