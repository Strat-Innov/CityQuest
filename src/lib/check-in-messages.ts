import type { CheckInResult, ClientCheckInStatus } from "@/lib/types";

export type Tone = "success" | "info" | "warning" | "error";

export interface CheckInMessage {
  tone: Tone;
  title: string;
  message: string;
  /** Whether a retry can reasonably succeed. */
  canRetry: boolean;
}

/** Participant-facing copy for every check-in outcome. */
export function describeCheckIn(
  status: ClientCheckInStatus,
  result?: Pick<CheckInResult, "station" | "remaining_before_final" | "quest_complete" | "rewards">,
): CheckInMessage {
  const stop = result?.station ? `Stop ${result.station.number} · ${result.station.name}` : "this stop";
  switch (status) {
    case "checked_in": {
      if (result?.quest_complete) {
        return {
          tone: "success",
          title: "Quest complete!",
          message: `You've checked in at ${stop}. Every stop is done. Well done, explorer!`,
          canRetry: false,
        };
      }
      const rewards = result?.rewards ?? [];
      return {
        tone: "success",
        title: "Mission done",
        message:
          rewards.length > 0
            ? `You've checked in at ${stop}. ${rewards.map((reward) => reward.name).join(", ")} unlocked.`
            : `You've checked in at ${stop}.`,
        canRetry: false,
      };
    }
    case "already_completed":
      return {
        tone: "info",
        title: "Already checked in",
        message: `You've already completed ${stop}. Each stop counts once.`,
        canRetry: false,
      };
    case "locked": {
      const remaining = result?.remaining_before_final ?? 0;
      return {
        tone: "warning",
        title: "Not unlocked yet",
        message: `Finish ${remaining} more stop${remaining === 1 ? "" : "s"} to unlock ${stop}, then tap again.`,
        canRetry: false,
      };
    }
    case "invalid_token":
      return {
        tone: "error",
        title: "Sticker not recognised",
        message: "This NFC sticker isn't part of City Quest, or it has been replaced. Ask the booth host for help.",
        canRetry: false,
      };
    case "inactive_station":
      return {
        tone: "warning",
        title: "Stop not open",
        message: `${stop} isn't accepting check-ins right now. Please check back later.`,
        canRetry: false,
      };
    case "location_required":
      return {
        tone: "info",
        title: "Confirm your location",
        message:
          "This stop asks you to confirm you're nearby. Your location is checked once and isn't stored. Only the distance to the stop is recorded.",
        canRetry: true,
      };
    case "too_far":
      return {
        tone: "warning",
        title: "You seem too far away",
        message: `Your location doesn't match ${stop}. Move closer to the booth and tap the sticker again.`,
        canRetry: true,
      };
    case "location_denied":
      return {
        tone: "warning",
        title: "Location permission needed",
        message:
          "This stop needs your location to check in. Allow location access for this site in your browser settings, then try again.",
        canRetry: true,
      };
    case "location_unavailable":
      return {
        tone: "warning",
        title: "Couldn't get your location",
        message: "We couldn't determine your location. Make sure location services are on, then try again.",
        canRetry: true,
      };
    case "rate_limited":
      return {
        tone: "warning",
        title: "Too many attempts",
        message: "You've tried to check in too often. Wait a minute and tap the sticker again.",
        canRetry: true,
      };
    case "unauthenticated":
      return {
        tone: "info",
        title: "Sign in to check in",
        message: "Sign in to your City Quest account to record this stop.",
        canRetry: false,
      };
    case "network_error":
      return {
        tone: "error",
        title: "No connection",
        message: "We couldn't reach City Quest. Check your connection and try again. Your check-in hasn't been recorded yet.",
        canRetry: true,
      };
    case "server_error":
    default:
      return {
        tone: "error",
        title: "Something went wrong",
        message: "We couldn't record your check-in. Please try again in a moment.",
        canRetry: true,
      };
  }
}
