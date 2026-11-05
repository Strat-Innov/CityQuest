"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/admin/actions";
import { Checkbox, TextArea } from "@/components/admin/fields";
import { FormField } from "@/components/ui/FormField";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { StationRow } from "@/lib/data";

type StationAction = (prev: FormState, formData: FormData) => Promise<FormState>;

export function StationForm({ action, station, submitLabel }: { action: StationAction; station?: StationRow; submitLabel: string }) {
  const [state, formAction] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const value = (key: string, fallback: string | number | null | undefined) =>
    state.values?.[key] ?? (fallback === null || fallback === undefined ? "" : String(fallback));
  const checked = (key: string, fallback: boolean) => (state.values ? state.values[key] === "on" : fallback);

  return (
    <form action={formAction} noValidate className="card">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div className="grid gap-x-4 sm:grid-cols-[120px_1fr]">
        <FormField
          label="Stop number"
          name="sortOrder"
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          required
          defaultValue={value("sortOrder", station?.sort_order)}
          error={errors.sortOrder}
        />
        <FormField
          label="Station name"
          name="stationName"
          required
          maxLength={100}
          defaultValue={value("stationName", station?.station_name)}
          error={errors.stationName}
        />
      </div>
      <FormField
        label="Location"
        name="locationName"
        required
        maxLength={150}
        placeholder="Old Town · Clocktower steps"
        defaultValue={value("locationName", station?.location_name)}
        error={errors.locationName}
      />
      <TextArea
        label="Mission"
        name="description"
        maxLength={1000}
        defaultValue={value("description", station?.description)}
        error={errors.description}
      />
      <Checkbox
        label="Active (accepting check-ins)"
        name="isActive"
        defaultChecked={checked("isActive", station?.is_active ?? true)}
        error={errors.isActive}
      />
      <Checkbox
        label="Final stop (unlocks after all other active stops)"
        name="isFinal"
        defaultChecked={checked("isFinal", station?.is_final ?? false)}
        error={errors.isFinal}
      />

      <fieldset className="mt-6 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Optional location check</legend>
        <p className="hint !mt-0">
          If set, participants must share their location when tapping this sticker and be within the radius. Only the
          distance is stored. Leave all three empty to disable. Indoor GPS can be inaccurate, so use 100 m or more.
        </p>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <FormField
            label="Latitude"
            name="latitude"
            inputMode="decimal"
            defaultValue={value("latitude", station?.latitude)}
            error={errors.latitude}
          />
          <FormField
            label="Longitude"
            name="longitude"
            inputMode="decimal"
            defaultValue={value("longitude", station?.longitude)}
            error={errors.longitude}
          />
          <FormField
            label="Radius (m)"
            name="geofenceRadiusM"
            inputMode="numeric"
            defaultValue={value("geofenceRadiusM", station?.geofence_radius_m)}
            error={errors.geofenceRadiusM}
          />
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Saving…" className="btn mt-6 sm:w-auto sm:px-8">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
