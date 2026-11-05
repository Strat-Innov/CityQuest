import { describe, expect, it } from "vitest";
import { describeCheckIn } from "@/lib/check-in-messages";
import type { ClientCheckInStatus } from "@/lib/types";

const station = { number: 2, name: "Bridge of Echoes", location: "Iron Bridge", is_final: false };

describe("describeCheckIn", () => {
  it("announces unlocked rewards on success", () => {
    const message = describeCheckIn("checked_in", { station, rewards: [{ name: "Free espresso", partner: "Ferro Café" }] });
    expect(message.tone).toBe("success");
    expect(message.message).toContain("Free espresso unlocked");
  });

  it("celebrates quest completion", () => {
    expect(describeCheckIn("checked_in", { station, quest_complete: true }).title).toBe("Quest complete!");
  });

  it("explains the final-stop lock", () => {
    expect(describeCheckIn("locked", { station, remaining_before_final: 1 }).message).toContain("Finish 1 more stop ");
  });

  it("never claims a check-in was recorded on network errors", () => {
    const message = describeCheckIn("network_error");
    expect(message.canRetry).toBe(true);
    expect(message.message).toContain("hasn't been recorded");
  });

  it.each<ClientCheckInStatus>([
    "checked_in",
    "already_completed",
    "invalid_token",
    "inactive_station",
    "locked",
    "location_required",
    "too_far",
    "rate_limited",
    "unauthenticated",
    "network_error",
    "server_error",
    "location_denied",
    "location_unavailable",
  ])("has copy for %s", (status) => {
    const message = describeCheckIn(status, { station });
    expect(message.title.length).toBeGreaterThan(0);
    expect(message.message.length).toBeGreaterThan(0);
  });
});
