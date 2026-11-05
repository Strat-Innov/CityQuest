"use client";

import { useState, useTransition } from "react";
import { redeemReward, type RedeemState } from "@/app/admin/actions";

const MESSAGES: Record<NonNullable<RedeemState["status"]>, string> = {
  redeemed: "Redeemed. Hand over the reward.",
  already_redeemed: "Already redeemed earlier. Do not hand over again.",
  not_earned: "Not earned yet. The participant hasn't checked in at this stop.",
  reward_unavailable: "This reward is not active.",
  participant_not_found: "Participant not found.",
  self_redemption: "You can't redeem rewards for your own account.",
  error: "Something went wrong. Try again.",
};

/**
 * Two-step confirm so staff don't redeem by accident.
 * Rendered for earned AND redeemed rewards so it stays mounted when the page
 * re-renders after a redemption, keeping the confirmation message visible.
 */
export function RedeemButton({
  participantId,
  rewardId,
  rewardName,
  redeemed,
}: {
  participantId: string;
  rewardId: string;
  rewardName: string;
  redeemed: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<RedeemState | null>(null);
  const [pending, startTransition] = useTransition();

  if (result?.status) {
    const ok = result.status === "redeemed";
    return (
      <p role="status" className={`mt-2 rounded-xl px-3 py-2 text-sm font-semibold ${ok ? "bg-green-soft text-green" : "bg-amber-soft text-amber"}`}>
        {MESSAGES[result.status]}
      </p>
    );
  }

  if (redeemed) return null;

  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        className={`btn !mt-0 ${confirming ? "btn-danger" : ""}`}
        disabled={pending}
        aria-label={confirming ? `Confirm redeeming ${rewardName}` : `Redeem ${rewardName}`}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          startTransition(async () => setResult(await redeemReward(participantId, rewardId)));
        }}
      >
        {pending ? "Redeeming…" : confirming ? "Confirm hand-over" : "Redeem"}
      </button>
      {confirming && !pending ? (
        <button type="button" className="btn btn-ghost !mt-0" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      ) : null}
    </div>
  );
}
