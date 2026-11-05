import type { Metadata } from "next";
import Link from "next/link";
import { createStation } from "@/app/admin/actions";
import { PageHeader } from "@/components/admin/fields";
import { StationForm } from "@/components/admin/StationForm";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "New station" };

export default async function NewStationPage() {
  await requireRole(["admin"], "/admin/stations/new");
  return (
    <>
      <Link href="/admin/stations" className="mt-6 inline-block text-sm font-semibold text-blue underline">
        ← All stations
      </Link>
      <PageHeader title="New station" description="After saving, generate the NFC token for the sticker." />
      <StationForm action={createStation} submitLabel="Create station" />
    </>
  );
}
