import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateStation } from "@/app/admin/actions";
import { PageHeader, StatusPill } from "@/components/admin/fields";
import { StationForm } from "@/components/admin/StationForm";
import { TokenPanel } from "@/components/admin/TokenPanel";
import { Notice } from "@/components/ui/Notice";
import { requireRole } from "@/lib/auth";
import { STATION_COLUMNS, type StationRow } from "@/lib/data";
import { getEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Station" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ created?: string; saved?: string }>;

interface CheckInRow {
  id: string;
  checked_in_at: string;
  validation_status: string;
  profiles: { participant_id: string; full_name: string } | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StationDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const flags = await searchParams;
  await requireRole(["admin"], `/admin/stations/${id}`);
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: station, error }, { data: history, count, error: historyError }] = await Promise.all([
    supabase.from("stations").select(STATION_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("check_ins")
      .select("id, checked_in_at, validation_status, profiles(participant_id, full_name)", { count: "exact" })
      .eq("station_id", id)
      .order("checked_in_at", { ascending: false })
      .limit(100),
  ]);
  if (error) throw new Error(`Could not load station: ${error.message}`);
  if (historyError) throw new Error(`Could not load check-ins: ${historyError.message}`);
  if (!station) notFound();

  const row = station as unknown as StationRow;
  const checkIns = (history ?? []) as unknown as CheckInRow[];
  const { APP_TIME_ZONE } = getEnv();

  return (
    <>
      <Link href="/admin/stations" className="mt-6 inline-block text-sm font-semibold text-blue underline">
        ← All stations
      </Link>
      <PageHeader
        title={`Stop ${row.sort_order} · ${row.station_name}`}
        description={row.location_name}
        action={<StatusPill active={row.is_active} />}
      />
      {flags.created ? <Notice tone="success">Station created. Now generate its NFC token.</Notice> : null}
      {flags.saved ? <Notice tone="success">Changes saved.</Notice> : null}

      <div className="grid gap-x-5 lg:grid-cols-[1fr_380px]">
        <div>
          <StationForm action={updateStation.bind(null, row.id)} station={row} submitLabel="Save changes" />
        </div>
        <div>
          <TokenPanel
            stationId={row.id}
            hasToken={Boolean(row.nfc_token_rotated_at)}
            rotatedAtLabel={row.nfc_token_rotated_at ? formatDateTime(row.nfc_token_rotated_at, APP_TIME_ZONE) : null}
          />
          <section className="card" aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-bold">
              Check-in history
            </h2>
            <p className="hint">
              {(count ?? 0).toLocaleString("en")} total{(count ?? 0) > checkIns.length ? `, latest ${checkIns.length} shown` : ""}
            </p>
            <ul className="mt-2">
              {checkIns.map((checkIn, index) => (
                <li key={checkIn.id} className={`py-2.5 text-sm ${index > 0 ? "border-t border-dashed border-line" : ""}`}>
                  {checkIn.profiles ? (
                    <Link href={`/admin/participants/${checkIn.profiles.participant_id}`} className="font-semibold hover:underline">
                      {checkIn.profiles.full_name}
                    </Link>
                  ) : (
                    <span className="font-semibold">Deleted participant</span>
                  )}
                  <div className="text-xs text-muted">
                    <span className="font-mono">{checkIn.profiles?.participant_id}</span> ·{" "}
                    {formatDateTime(checkIn.checked_in_at, APP_TIME_ZONE)}
                    {checkIn.validation_status === "nfc_token_location" ? " · location verified" : ""}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
