import { describe, expect, it } from "vitest";
import {
  checkInRequestSchema,
  escapeLike,
  participantIdSchema,
  registerSchema,
  stationFormSchema,
} from "@/lib/validation";

const validRegistration = {
  fullName: "  Maya   Ortiz ",
  contactNumber: "+63 917 555 0101",
  email: " Maya@Example.com ",
  password: "correct-horse",
  consent: "on",
};

describe("registerSchema", () => {
  it("normalises valid input", () => {
    const result = registerSchema.parse(validRegistration);
    expect(result.fullName).toBe("Maya Ortiz");
    expect(result.email).toBe("maya@example.com");
    expect(result.consent).toBe(true);
  });

  it("requires consent", () => {
    const result = registerSchema.safeParse({ ...validRegistration, consent: undefined });
    expect(result.success).toBe(false);
  });

  it.each(["call me", "12345", "+1 (555) 01", "0917-555-0101-9999-9999"])("rejects contact number %s", (contactNumber) => {
    expect(registerSchema.safeParse({ ...validRegistration, contactNumber }).success).toBe(false);
  });

  it.each(["09175550101", "+63 917 555 0101", "(02) 8123-4567"])("accepts contact number %s", (contactNumber) => {
    expect(registerSchema.safeParse({ ...validRegistration, contactNumber }).success).toBe(true);
  });

  it("enforces password length", () => {
    expect(registerSchema.safeParse({ ...validRegistration, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegistration, password: "x".repeat(73) }).success).toBe(false);
  });
});

describe("checkInRequestSchema", () => {
  const token = "Ab3_dEf-GhIjKlMnOpQrStUvWxYz0123";

  it("accepts a token with or without coordinates", () => {
    expect(checkInRequestSchema.safeParse({ token }).success).toBe(true);
    expect(checkInRequestSchema.safeParse({ token, latitude: 14.5, longitude: 121 }).success).toBe(true);
  });

  it("rejects malformed tokens and partial coordinates", () => {
    expect(checkInRequestSchema.safeParse({ token: "short" }).success).toBe(false);
    expect(checkInRequestSchema.safeParse({ token: "a".repeat(30) + "/../" }).success).toBe(false);
    expect(checkInRequestSchema.safeParse({ token, latitude: 14.5 }).success).toBe(false);
    expect(checkInRequestSchema.safeParse({ token, latitude: 120, longitude: 0 }).success).toBe(false);
  });
});

describe("participantIdSchema", () => {
  it("normalises case and whitespace", () => {
    expect(participantIdSchema.parse(" cq-ab12c ")).toBe("CQ-AB12C");
  });
  it("rejects other formats", () => {
    expect(participantIdSchema.safeParse("CQ-1234").success).toBe(false);
    expect(participantIdSchema.safeParse("XX-ABCDE").success).toBe(false);
  });
});

describe("stationFormSchema", () => {
  const base = {
    sortOrder: "3",
    stationName: "Market Barter",
    locationName: "Market Square · Stall 14",
    description: "",
    isFinal: undefined,
    isActive: "on",
    latitude: "",
    longitude: "",
    geofenceRadiusM: "",
  };

  it("parses a station without a geofence", () => {
    const result = stationFormSchema.parse(base);
    expect(result).toMatchObject({ sortOrder: 3, isActive: true, isFinal: false, latitude: undefined });
  });

  it("requires all geofence fields together", () => {
    expect(stationFormSchema.safeParse({ ...base, latitude: "14.5" }).success).toBe(false);
    expect(
      stationFormSchema.safeParse({ ...base, latitude: "14.5", longitude: "121.0", geofenceRadiusM: "150" }).success,
    ).toBe(true);
  });

  it("validates ranges", () => {
    expect(stationFormSchema.safeParse({ ...base, sortOrder: "0" }).success).toBe(false);
    expect(
      stationFormSchema.safeParse({ ...base, latitude: "14.5", longitude: "121.0", geofenceRadiusM: "5" }).success,
    ).toBe(false);
  });
});

describe("escapeLike", () => {
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});
