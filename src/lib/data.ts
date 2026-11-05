import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DashboardStats, Progress, StaffParticipantView } from "@/lib/types";

/**
 * Server-side data access. Every call runs as the signed-in user, so RLS and
 * the role checks inside the SQL functions apply.
 */

export async function getMyProgress(): Promise<Progress> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_progress");
  if (error) throw new Error(`get_my_progress failed: ${error.message}`);
  if (!data) throw new Error("Profile not found for the signed-in user.");
  return data as Progress;
}

export async function getParticipantForStaff(participantId: string): Promise<StaffParticipantView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_get_participant", { p_participant_id: participantId });
  if (error) throw new Error(`staff_get_participant failed: ${error.message}`);
  return (data as StaffParticipantView | null) ?? null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) throw new Error(`admin_dashboard_stats failed: ${error.message}`);
  return data as DashboardStats;
}

/** Explicit column list: the token hash is not readable and `*` would fail. */
export const STATION_COLUMNS =
  "id, sort_order, station_name, location_name, description, is_final, is_active, nfc_token_rotated_at, latitude, longitude, geofence_radius_m, created_at, updated_at";

export interface StationRow {
  id: string;
  sort_order: number;
  station_name: string;
  location_name: string;
  description: string;
  is_final: boolean;
  is_active: boolean;
  nfc_token_rotated_at: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
  created_at: string;
  updated_at: string;
}

export interface RewardRow {
  id: string;
  station_id: string;
  reward_name: string;
  reward_description: string;
  partner_name: string;
  is_active: boolean;
  created_at: string;
}

export const REWARD_COLUMNS =
  "id, station_id, reward_name, reward_description, partner_name, is_active, created_at";
