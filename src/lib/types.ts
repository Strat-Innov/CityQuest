/** Shapes returned by the database RPC functions (see supabase/migrations). */

export type Role = "participant" | "staff" | "admin";
export type RewardStatus = "locked" | "earned" | "redeemed";

export interface ProgressProfile {
  participant_id: string;
  full_name: string;
  contact_number: string;
  role: Role;
  created_at: string;
}

export interface StationProgress {
  /** Internal id, only present in the staff view. */
  id?: string;
  number: number;
  name: string;
  location: string;
  mission: string;
  is_final: boolean;
  is_active: boolean;
  completed_at: string | null;
  locked: boolean;
}

export interface RewardProgress {
  /** Internal id, only present in the staff view. */
  id?: string;
  station_number: number;
  station_name: string;
  location: string;
  name: string;
  description: string;
  partner: string;
  is_grand: boolean;
  status: RewardStatus;
  earned_at: string | null;
  redeemed_at: string | null;
}

export interface Progress {
  profile: ProgressProfile;
  stations: StationProgress[];
  rewards: RewardProgress[];
  remaining_before_final: number;
}

export interface StaffParticipantView extends Progress {
  email: string;
}

export type CheckInStatus =
  | "checked_in"
  | "already_completed"
  | "invalid_token"
  | "inactive_station"
  | "locked"
  | "location_required"
  | "too_far"
  | "rate_limited"
  | "unauthenticated";

/** Statuses that only arise in the browser or API layer. */
export type ClientCheckInStatus =
  | CheckInStatus
  | "network_error"
  | "server_error"
  | "location_denied"
  | "location_unavailable";

export interface CheckInResult {
  status: CheckInStatus;
  station?: { number: number; name: string; location: string; is_final: boolean };
  rewards?: { name: string; partner: string }[];
  checked_in_at?: string | null;
  remaining_before_final?: number | null;
  completed?: number;
  total?: number;
  quest_complete?: boolean;
}

export type RedeemStatus =
  | "redeemed"
  | "already_redeemed"
  | "not_earned"
  | "reward_unavailable"
  | "participant_not_found"
  | "self_redemption";

export interface DashboardStats {
  participants: number;
  check_ins: number;
  completed_quests: number;
  rewards_earned: number;
  rewards_redeemed: number;
  per_station: { id: string; number: number; name: string; is_active: boolean; check_ins: number }[];
}
