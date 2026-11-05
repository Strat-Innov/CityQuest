import { z } from "zod";

/** Shared input validation. Mirrors the database CHECK constraints. */

export const PHONE_PATTERN = /^\+?[0-9(][0-9 ()-]{5,18}[0-9]$/;
export const NFC_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
export const PARTICIPANT_ID_PATTERN = /^CQ-[A-Z0-9]{5}$/;

const fullName = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Enter your full name.")
      .max(100, "Name must be 100 characters or fewer."),
  );

const contactNumber = z
  .string()
  .trim()
  .refine((value) => PHONE_PATTERN.test(value), "Enter a valid contact number, e.g. +63 917 555 0101.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "Contact number must have 7 to 15 digits.");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

export const registerSchema = z.object({
  fullName,
  contactNumber,
  email,
  // Supabase (bcrypt) ignores bytes beyond 72.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
  consent: checkbox.refine((value) => value, "You must agree to the privacy notice to register."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const checkInRequestSchema = z
  .object({
    token: z.string().regex(NFC_TOKEN_PATTERN),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine(
    (value) => (value.latitude === undefined) === (value.longitude === undefined),
    "Latitude and longitude must be provided together.",
  );

export const participantIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PARTICIPANT_ID_PATTERN, "Participant IDs look like CQ-AB12C.");

const optionalNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .pipe(z.number(message).min(min, message).max(max, message).optional());

export const stationFormSchema = z
  .object({
    sortOrder: z.coerce
      .number("Enter a stop number.")
      .int("Stop number must be a whole number.")
      .min(1, "Stop number must be 1 or more.")
      .max(999),
    stationName: z.string().trim().min(2, "Enter a station name.").max(100),
    locationName: z.string().trim().min(2, "Enter a location.").max(150),
    description: z.string().trim().max(1000, "Mission must be 1000 characters or fewer."),
    isFinal: checkbox,
    isActive: checkbox,
    latitude: optionalNumber(-90, 90, "Latitude must be between -90 and 90."),
    longitude: optionalNumber(-180, 180, "Longitude must be between -180 and 180."),
    geofenceRadiusM: optionalNumber(25, 5000, "Radius must be between 25 and 5000 metres."),
  })
  .superRefine((value, ctx) => {
    const set = [value.latitude, value.longitude, value.geofenceRadiusM].filter(
      (field) => field !== undefined,
    ).length;
    if (set !== 0 && set !== 3) {
      ctx.addIssue({
        code: "custom",
        path: ["geofenceRadiusM"],
        message: "Fill in latitude, longitude and radius together, or leave all three empty.",
      });
    }
  });

export const rewardFormSchema = z.object({
  stationId: z.uuid("Choose a station."),
  rewardName: z.string().trim().min(2, "Enter a reward name.").max(100),
  rewardDescription: z.string().trim().max(500, "Description must be 500 characters or fewer."),
  partnerName: z.string().trim().max(100, "Establishment must be 100 characters or fewer."),
  isActive: checkbox,
});

export const redeemSchema = z.object({
  participantId: participantIdSchema,
  rewardId: z.uuid(),
});

/** Converts zod issues into a flat { field: message } map (first message wins). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

/** Reads FormData entries as plain strings (files and missing keys become undefined). */
export function formValues(formData: FormData, keys: readonly string[]): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};
  for (const key of keys) {
    const value = formData.get(key);
    values[key] = typeof value === "string" ? value : undefined;
  }
  return values;
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
