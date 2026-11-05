"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertIcon, CheckIcon, GiftIcon, LockIcon, NfcIcon, StarIcon } from "@/components/ui/icons";
import { describeCheckIn, type Tone } from "@/lib/check-in-messages";
import type { CheckInResult, ClientCheckInStatus } from "@/lib/types";

type Phase =
  | { kind: "checking" }
  | { kind: "locating" }
  | { kind: "done"; status: ClientCheckInStatus; result?: CheckInResult };

const TONE_STYLES: Record<Tone, { ring: string; icon: React.ReactNode }> = {
  success: { ring: "bg-green text-white", icon: <CheckIcon className="h-8 w-8" /> },
  info: { ring: "bg-blue-soft text-blue", icon: <NfcIcon className="h-8 w-8" /> },
  warning: { ring: "bg-amber-soft text-amber", icon: <LockIcon className="h-8 w-8" /> },
  error: { ring: "bg-danger-soft text-danger", icon: <AlertIcon className="h-8 w-8" /> },
};

export function CheckInFlow({ token }: { token: string | null }) {
  const [phase, setPhase] = useState<Phase>(
    token ? { kind: "checking" } : { kind: "done", status: "invalid_token" },
  );
  const started = useRef(false);

  const submit = useCallback(
    async (coords?: { latitude: number; longitude: number }) => {
      if (!token) return;
      setPhase({ kind: "checking" });
      let response: Response;
      try {
        response = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ...coords }),
          cache: "no-store",
        });
      } catch {
        setPhase({ kind: "done", status: "network_error" });
        return;
      }

      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent(`/nfc/${token}`)}`);
        return;
      }

      let result: CheckInResult | null = null;
      try {
        result = (await response.json()) as CheckInResult;
      } catch {
        // Fall through to server_error.
      }
      if (!result || typeof result.status !== "string" || response.status >= 500) {
        setPhase({ kind: "done", status: "server_error" });
        return;
      }
      setPhase({ kind: "done", status: result.status, result });
    },
    [token],
  );

  // Ask the server to validate this tap once the page loads (guarded against
  // React's double-invoked effects in development).
  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    void submit();
  }, [submit, token]);

  const shareLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPhase({ kind: "done", status: "location_unavailable" });
      return;
    }
    setPhase({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => void submit({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) =>
        setPhase({
          kind: "done",
          status: error.code === error.PERMISSION_DENIED ? "location_denied" : "location_unavailable",
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [submit]);

  if (phase.kind !== "done") {
    return (
      <section className="card text-center" aria-live="polite" aria-busy="true">
        <div className="mx-auto grid h-16 w-16 animate-pulse place-items-center rounded-full bg-blue-soft text-blue">
          <NfcIcon className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold">{phase.kind === "locating" ? "Checking your location…" : "Checking you in…"}</h2>
        <p className="hint">Keep this page open for a moment.</p>
      </section>
    );
  }

  const { status, result } = phase;
  const message = describeCheckIn(status, result);
  const tone = TONE_STYLES[message.tone];
  const needsLocation = ["location_required", "location_denied", "location_unavailable", "too_far"].includes(status);

  return (
    <>
      <section className="card text-center" aria-live="polite">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${tone.ring}`}>{tone.icon}</div>
        {result?.station ? (
          <div className="eyebrow mt-4">
            Stop {result.station.number} · {result.station.location}
          </div>
        ) : null}
        <h2 className="mt-1 text-[22px] font-bold">{message.title}</h2>
        <p className="mt-2 text-[15px] leading-normal text-muted">{message.message}</p>

        {status === "checked_in" && result?.rewards?.length
          ? result.rewards.map((reward) => (
              <div key={reward.name} className="mt-4 flex items-center gap-3 rounded-2xl bg-blue-soft p-3.5 text-left">
                <div className="ico">{result.station?.is_final ? <StarIcon /> : <GiftIcon />}</div>
                <div>
                  <div className="eyebrow !text-blue">Reward unlocked</div>
                  <strong className="mt-0.5 block text-base">{reward.name}</strong>
                  {reward.partner ? <span className="text-[13px] text-muted">{reward.partner}</span> : null}
                </div>
              </div>
            ))
          : null}

        {typeof result?.completed === "number" && typeof result.total === "number" && status !== "inactive_station" ? (
          <p className="mt-4 text-sm font-semibold text-green">
            {result.completed} / {result.total} stops complete
          </p>
        ) : null}

        {needsLocation && status !== "location_denied" ? (
          <button type="button" className="btn" onClick={shareLocation}>
            {status === "location_required" ? "Share my location" : "Try again with my location"}
          </button>
        ) : message.canRetry ? (
          <button
            type="button"
            className="btn"
            onClick={() => (status === "location_denied" ? shareLocation() : void submit())}
          >
            Try again
          </button>
        ) : null}
      </section>

      <Link href="/quest" className={`btn ${status === "checked_in" ? "" : "btn-ghost"}`}>
        View my quest
      </Link>
      {status === "checked_in" || status === "already_completed" ? (
        <Link href="/pass" className="btn btn-ghost">
          Show my pass
        </Link>
      ) : null}
    </>
  );
}
