import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, StatusPill } from "@/components/admin/fields";
import { requireRole } from "@/lib/auth";
import { STATION_COLUMNS, type StationRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stations" };

export default async function StationsPage() {
  await requireRole(["admin"], "/admin/stations");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stations")
    .select(`${STATION_COLUMNS}, check_ins(count)`)
    .order("sort_order");
  if (error) throw new Error(`Could not load stations: ${error.message}`);
  const stations = (data ?? []) as unknown as (StationRow & { check_ins: { count: number }[] })[];

  return (
    <>
      <PageHeader
        title="Stations"
        description="Quest stops and their NFC stickers."
        action={
          <Link href="/admin/stations/new" className="btn !mt-0 sm:w-auto sm:px-6">
            New station
          </Link>
        }
      />
      <ul className="mt-5 space-y-2.5">
        {stations.map((station) => (
          <li key={station.id}>
            <Link href={`/admin/stations/${station.id}`} className="stop-card flex flex-wrap items-center justify-between gap-3 hover:border-blue-soft">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 flex-none place-items-center rounded-full border-2 font-bold ${
                    station.is_final ? "border-blue text-blue" : "border-line text-muted"
                  } bg-white`}
                  aria-hidden="true"
                >
                  {station.sort_order}
                </span>
                <div>
                  <div className="font-bold">
                    {station.station_name}
                    {station.is_final ? <span className="pill pill-blue ml-2">Final</span> : null}
                  </div>
                  <div className="text-[13px] text-muted">{station.location_name}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill active={station.is_active} />
                <span className={`pill ${station.nfc_token_rotated_at ? "pill-ready" : "pill-lock"}`}>
                  {station.nfc_token_rotated_at ? "NFC token set" : "No NFC token"}
                </span>
                {station.geofence_radius_m ? <span className="pill pill-blue">Location check</span> : null}
                <span className="pill pill-used">{station.check_ins?.[0]?.count ?? 0} check-ins</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {stations.length === 0 ? <p className="card text-sm text-muted">No stations yet. Create the first one.</p> : null}
    </>
  );
}
