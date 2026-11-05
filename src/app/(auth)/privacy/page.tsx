import type { Metadata } from "next";
import Link from "next/link";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy notice" };
// Reads runtime configuration, so it is rendered per request.
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const { ORGANIZER_NAME, PRIVACY_CONTACT_EMAIL, DATA_RETENTION_DAYS } = getEnv();

  return (
    <>
      <h1 className="h1">Privacy notice</h1>
      <p className="lead">How City Quest uses your information.</p>
      <section className="card space-y-4 text-sm leading-relaxed text-body">
        <div>
          <h2 className="text-base font-bold text-ink">Who we are</h2>
          <p>City Quest is run by {ORGANIZER_NAME}, who is responsible for your information.</p>
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">What we collect</h2>
          <ul className="ml-5 list-disc">
            <li>Your full name, contact number and email address.</li>
            <li>The stops you check in at and when, and the rewards you collect.</li>
            <li>
              If a stop asks you to confirm your location, only the distance between you and that stop is recorded,
              never your coordinates.
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">Why we use it</h2>
          <ul className="ml-5 list-disc">
            <li>To create your account and digital pass.</li>
            <li>To record your quest progress and unlock rewards.</li>
            <li>
              To let authorised booth staff confirm your identity when handing over rewards. They can see your name,
              contact number and Participant ID.
            </li>
            <li>To prevent misuse, such as repeated or shared check-ins.</li>
          </ul>
          <p className="mt-2">
            Your contact number is used only for this event. It is not verified, sold or used for marketing.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">How long we keep it</h2>
          <p>We delete participant records {DATA_RETENTION_DAYS} days after the event ends.</p>
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">Your choices</h2>
          <p>
            You can ask to see, correct or delete your information at any time
            {PRIVACY_CONTACT_EMAIL ? (
              <>
                {" "}
                by emailing{" "}
                <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="font-semibold text-blue underline">
                  {PRIVACY_CONTACT_EMAIL}
                </a>
              </>
            ) : (
              " by contacting the event organisers"
            )}
            .
          </p>
        </div>
      </section>
      <Link href="/register" className="btn btn-ghost">
        Back to registration
      </Link>
    </>
  );
}
