"use client";

import { useState, useTransition } from "react";
import { rotateStationToken } from "@/app/admin/actions";
import { Notice } from "@/components/ui/Notice";

/**
 * Generates the NFC sticker URL for a station. The URL contains a secret
 * token that is shown exactly once; generating a new one disables the old sticker.
 */
export function TokenPanel({ stationId, hasToken, rotatedAtLabel }: { stationId: string; hasToken: boolean; rotatedAtLabel: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    if (hasToken && !confirming && !url) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await rotateStationToken(stationId);
      if (result.url) setUrl(result.url);
      else setError(result.error ?? "Could not generate a token.");
    });
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Copy failed. Select the URL and copy it manually.");
    }
  };

  return (
    <section className="card" aria-labelledby="token-heading">
      <h2 id="token-heading" className="text-lg font-bold">
        NFC sticker
      </h2>
      <p className="hint">
        {hasToken || url
          ? `Token active${rotatedAtLabel && !url ? ` since ${rotatedAtLabel}` : ""}. Generating a new one immediately disables the current sticker.`
          : "No token yet. Generate one, then write the URL to the sticker as an NFC URL (URI) record."}
      </p>

      {url ? (
        <div className="mt-4">
          <Notice tone="warning">
            Copy this URL now. It is shown only once and cannot be recovered. Treat it like a password: anyone with it
            can check in to this station.
          </Notice>
          <label htmlFor="nfc-url" className="field-label">
            Sticker URL
          </label>
          <input id="nfc-url" readOnly value={url} className="field font-mono !text-sm" onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="btn btn-ghost" onClick={copy}>
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {confirming ? (
        <Notice tone="warning">The current sticker will stop working. Press the button again to confirm.</Notice>
      ) : null}

      <button type="button" className={`btn ${confirming ? "btn-danger" : ""} sm:w-auto sm:px-8`} onClick={generate} disabled={pending}>
        {pending ? "Generating…" : confirming ? "Yes, replace the token" : hasToken || url ? "Generate new token" : "Generate NFC token"}
      </button>
    </section>
  );
}
