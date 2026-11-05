import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckInFlow } from "@/components/nfc/CheckInFlow";
import { PhoneFrame } from "@/components/ui/PhoneFrame";
import { getCurrentUser } from "@/lib/auth";
import { loginPath } from "@/lib/redirect";
import { NFC_TOKEN_PATTERN } from "@/lib/validation";

export const metadata: Metadata = { title: "Check in", referrer: "no-referrer" };

type Params = Promise<{ token: string }>;

/**
 * Landing page for NFC sticker URLs: https://<domain>/nfc/<token>
 * Signed-out participants are sent to login and returned here afterwards.
 * The check-in itself is decided by the server (POST /api/check-in).
 */
export default async function NfcPage({ params }: { params: Params }) {
  const { token } = await params;
  const wellFormed = NFC_TOKEN_PATTERN.test(token);

  if (wellFormed && !(await getCurrentUser())) {
    redirect(loginPath(`/nfc/${token}`));
  }

  return (
    <PhoneFrame>
      <h1 className="h1">City Quest</h1>
      <p className="lead">Stop check-in</p>
      <CheckInFlow token={wellFormed ? token : null} />
    </PhoneFrame>
  );
}
