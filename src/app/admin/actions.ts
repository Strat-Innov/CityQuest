"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { errorContext, logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { RedeemStatus, Role } from "@/lib/types";
import {
  fieldErrors,
  formValues,
  redeemSchema,
  rewardFormSchema,
  stationFormSchema,
} from "@/lib/validation";

/**
 * Admin / staff server actions. Each one re-checks the caller's role here,
 * and the database independently enforces the same rules through RLS and
 * role checks inside its functions.
 */

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

async function assertRole(roles: readonly Role[]) {
  const profile = await getCurrentProfile();
  if (!profile || !roles.includes(profile.role)) {
    throw new Error("Not authorised");
  }
  return profile;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

function stationDbError(error: PostgrestLikeError, sortOrder: number): FormState {
  if (error.code === "23505" && error.message?.includes("stations_sort_order_key")) {
    return { fieldErrors: { sortOrder: `Stop number ${sortOrder} is already used by another station.` } };
  }
  if (error.code === "23505" && error.message?.includes("stations_single_final_idx")) {
    return { fieldErrors: { isFinal: "Another station is already the final stop. Unmark it first." } };
  }
  if (error.code === "42501") return { error: "You are not allowed to do that." };
  logger.error("station write failed", errorContext(error));
  return { error: "Could not save the station. Please try again." };
}

const STATION_KEYS = [
  "sortOrder",
  "stationName",
  "locationName",
  "description",
  "isFinal",
  "isActive",
  "latitude",
  "longitude",
  "geofenceRadiusM",
] as const;

function stationRow(data: ReturnType<typeof stationFormSchema.parse>) {
  return {
    sort_order: data.sortOrder,
    station_name: data.stationName,
    location_name: data.locationName,
    description: data.description,
    is_final: data.isFinal,
    is_active: data.isActive,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    geofence_radius_m: data.geofenceRadiusM ?? null,
  };
}

export async function createStation(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);
  const values = formValues(formData, STATION_KEYS);
  const parsed = stationFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("stations").insert(stationRow(parsed.data)).select("id").single();
  if (error || !data) return { ...stationDbError(error ?? {}, parsed.data.sortOrder), values };

  revalidatePath("/admin", "layout");
  redirect(`/admin/stations/${data.id}?created=1`);
}

export async function updateStation(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);
  const values = formValues(formData, STATION_KEYS);
  const parsed = stationFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("stations").update(stationRow(parsed.data)).eq("id", id);
  if (error) return { ...stationDbError(error, parsed.data.sortOrder), values };

  revalidatePath("/admin", "layout");
  redirect(`/admin/stations/${id}?saved=1`);
}

export interface TokenState {
  url?: string;
  error?: string;
}

/** Generates a new NFC token. The plaintext URL is returned once and never stored. */
export async function rotateStationToken(id: string): Promise<TokenState> {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_station_token", { p_station_id: id });
  if (error || typeof data !== "string") {
    logger.error("rotate_station_token failed", errorContext(error));
    return { error: "Could not generate a token. Please try again." };
  }
  revalidatePath(`/admin/stations/${id}`);
  revalidatePath("/admin/stations");
  return { url: `${getEnv().NEXT_PUBLIC_SITE_URL}/nfc/${data}` };
}

const REWARD_KEYS = ["stationId", "rewardName", "rewardDescription", "partnerName", "isActive"] as const;

function rewardRow(data: ReturnType<typeof rewardFormSchema.parse>) {
  return {
    station_id: data.stationId,
    reward_name: data.rewardName,
    reward_description: data.rewardDescription,
    partner_name: data.partnerName,
    is_active: data.isActive,
  };
}

function rewardDbError(error: PostgrestLikeError): FormState {
  if (error.code === "23503") return { fieldErrors: { stationId: "Choose an existing station." } };
  if (error.code === "42501") return { error: "You are not allowed to do that." };
  logger.error("reward write failed", errorContext(error));
  return { error: "Could not save the reward. Please try again." };
}

export async function createReward(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);
  const values = formValues(formData, REWARD_KEYS);
  const parsed = rewardFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("rewards").insert(rewardRow(parsed.data));
  if (error) return { ...rewardDbError(error), values };

  revalidatePath("/admin", "layout");
  redirect("/admin/rewards?saved=1");
}

export async function updateReward(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);
  const values = formValues(formData, REWARD_KEYS);
  const parsed = rewardFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("rewards").update(rewardRow(parsed.data)).eq("id", id);
  if (error) return { ...rewardDbError(error), values };

  revalidatePath("/admin", "layout");
  redirect("/admin/rewards?saved=1");
}

export interface RedeemState {
  status?: RedeemStatus | "error";
  redeemedAt?: string;
}

/** Staff confirm a reward hand-over for the participant standing in front of them. */
export async function redeemReward(participantId: string, rewardId: string): Promise<RedeemState> {
  await assertRole(["staff", "admin"]);
  const parsed = redeemSchema.safeParse({ participantId, rewardId });
  if (!parsed.success) return { status: "error" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_reward", {
    p_participant_id: parsed.data.participantId,
    p_reward_id: parsed.data.rewardId,
  });
  if (error || !data) {
    logger.error("redeem_reward failed", errorContext(error));
    return { status: "error" };
  }

  const result = data as { status: RedeemStatus; redeemed_at?: string };
  revalidatePath(`/admin/participants/${parsed.data.participantId}`);
  revalidatePath("/admin/redemptions");
  return { status: result.status, redeemedAt: result.redeemed_at };
}
