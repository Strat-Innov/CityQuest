import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, StatusPill } from "@/components/admin/fields";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { getDashboardStats } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const current = await getCurrentProfile();
  // Staff land on participant lookup; the dashboard is admin-only.
  if (current?.role === "staff") redirect("/admin/participants");
  await requireRole(["admin"], "/admin");

  const stats = await getDashboardStats();
  const max = Math.max(1, ...stats.per_station.map((station) => station.check_ins));
  const tiles = [
    { label: "Registered participants", value: stats.participants },
    { label: "Station check-ins", value: stats.check_ins },
    { label: "Completed quests", value: stats.completed_quests },
    { label: "Rewards earned", value: stats.rewards_earned },
    { label: "Rewards redeemed", value: stats.rewards_redeemed },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Live participation across the quest." />
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="card !mt-5 !p-4">
            <div className="eyebrow !text-[11px]">{tile.label}</div>
            <div className="mt-2 text-[34px] font-bold leading-none tracking-[-0.03em]">{tile.value.toLocaleString("en")}</div>
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="per-station-heading">
        <h2 id="per-station-heading" className="text-lg font-bold">
          Participation per station
        </h2>
        {stats.per_station.length === 0 ? (
          <p className="hint">No stations yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {stats.per_station.map((station) => (
              <li key={station.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/stations/${station.id}`} className="font-semibold hover:underline">
                    Stop {station.number} · {station.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    {!station.is_active ? <StatusPill active={false} /> : null}
                    <strong className="tabular-nums">{station.check_ins.toLocaleString("en")}</strong>
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-line" aria-hidden="true">
                  <div className="h-2 rounded-full bg-blue" style={{ width: `${(station.check_ins / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
