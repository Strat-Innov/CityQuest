"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/admin/actions";
import { Checkbox, TextArea } from "@/components/admin/fields";
import { FormField } from "@/components/ui/FormField";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { RewardRow } from "@/lib/data";

type RewardAction = (prev: FormState, formData: FormData) => Promise<FormState>;

export function RewardForm({
  action,
  reward,
  stations,
  submitLabel,
}: {
  action: RewardAction;
  reward?: RewardRow;
  stations: { id: string; sort_order: number; station_name: string; is_active: boolean }[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const value = (key: string, fallback: string | undefined) => state.values?.[key] ?? fallback ?? "";

  return (
    <form action={formAction} noValidate className="card">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div>
        <label htmlFor="field-stationId" className="field-label">
          Unlocked by station
        </label>
        <select
          id="field-stationId"
          name="stationId"
          className="field"
          required
          defaultValue={value("stationId", reward?.station_id)}
          aria-invalid={errors.stationId ? true : undefined}
          aria-describedby={errors.stationId ? "field-stationId-error" : undefined}
        >
          <option value="" disabled>
            Choose a station
          </option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              Stop {station.sort_order} · {station.station_name}
              {station.is_active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
        {errors.stationId ? (
          <p id="field-stationId-error" className="field-error">
            {errors.stationId}
          </p>
        ) : null}
      </div>
      <FormField
        label="Reward name"
        name="rewardName"
        required
        maxLength={100}
        defaultValue={value("rewardName", reward?.reward_name)}
        error={errors.rewardName}
      />
      <FormField
        label="Participating establishment"
        name="partnerName"
        maxLength={100}
        placeholder="Ferro Café"
        defaultValue={value("partnerName", reward?.partner_name)}
        error={errors.partnerName}
      />
      <TextArea
        label="Description"
        name="rewardDescription"
        maxLength={500}
        defaultValue={value("rewardDescription", reward?.reward_description)}
        error={errors.rewardDescription}
      />
      <Checkbox
        label="Active (can be earned and redeemed)"
        name="isActive"
        defaultChecked={state.values ? state.values.isActive === "on" : (reward?.is_active ?? true)}
        error={errors.isActive}
      />
      <SubmitButton pendingLabel="Saving…" className="btn mt-6 sm:w-auto sm:px-8">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
