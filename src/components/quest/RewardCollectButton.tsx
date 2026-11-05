"use client";

import { useCallback, useId, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface RewardCollectButtonProps {
  rewardName: string;
  partner: string;
  location: string;
  participantId: string;
  label: string;
  className: string;
}

/**
 * Replaces the prototype's "Show reward code" sheet. The participant shows
 * their Participant ID; staff confirm the redemption on their own device.
 * There is deliberately no participant-side "mark as redeemed" button.
 */
export function RewardCollectButton({ rewardName, partner, location, participantId, label, className }: RewardCollectButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);
  const place = location.split(" · ")[0] ?? location;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <BottomSheet open={open} onClose={close} labelledBy={titleId}>
        {partner ? <div className="eyebrow">{partner}</div> : null}
        <h3 id={titleId} className="mt-1 text-xl font-bold">
          {rewardName}
        </h3>
        <p className="hint">
          Show your Participant ID to staff at {place}. They will confirm the reward on their device.
        </p>
        <div className="code-box" aria-label={`Participant ID ${participantId}`}>
          {participantId}
        </div>
        <button type="button" className="btn btn-ghost" onClick={close}>
          Close
        </button>
      </BottomSheet>
    </>
  );
}
