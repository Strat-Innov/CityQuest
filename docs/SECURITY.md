# Security and privacy notes

## What static NFC stickers can and cannot prove

**Static NFC stickers do not prove physical presence.** A sticker holds a fixed URL. Anyone who reads
it with a phone, photographs it, or receives it in a message can open that URL from anywhere.

What this implementation does to discourage casual sharing:

| Control | Effect |
|---|---|
| 192-bit random token per station | URLs can't be guessed or enumerated |
| Only the SHA-256 hash is stored | A database leak doesn't reveal sticker URLs |
| Authenticated accounts required | Every check-in is tied to a registered person |
| One check-in per station per account (`UNIQUE`) | Sharing a URL helps someone at most once per stop |
| Rate limiting (10/min, 20 invalid/hour) | Slows token guessing and scripted abuse |
| Attempt log + audit log | Unusual patterns can be reviewed (many accounts, same minute, one station) |
| Token rotation | A leaked sticker can be invalidated in one click |
| Optional geofence per station | The browser must report a location within the radius |
| Final stop locked until 1–5 are done | Enforced on the server |

The geofence relies on the location the browser reports, which a determined person can spoof. Treat
it as a deterrent, not proof.

## Upgrade path: NTAG 424 DNA (Secure Unique NFC)

If stakeholders need stronger evidence of presence, replace the stickers at important stations with
**NTAG 424 DNA** tags configured for SUN/SDM. Each tap then produces a URL with a fresh encrypted
counter and a CMAC that can't be replayed or cloned without the tag's key.

The code is ready for this:

1. `check_ins.validation_status` already allows `'nfc_sun'`.
2. Add per-station columns `sun_key_encrypted` and `sun_last_counter`.
3. In `/api/check-in` (or a new `check_in_sun` SQL function), verify the CMAC and require
   `counter > sun_last_counter` before recording the check-in. Pass the tag's `picc_data` and `cmac`
   query parameters through from `/nfc/[token]` to the API.
4. Stations without SUN keep working with static tokens, so you can migrate one station at a time.

## Access control summary

- **RLS on every table.** Participants can read only their own profile, check-ins and redemptions.
  Staff can read participant records. Only admins can change stations and rewards.
- **No direct writes to progress.** `check_ins` and `reward_redemptions` have no INSERT/UPDATE grant.
  They are written only by `check_in()` and `redeem_reward()`, which check the caller themselves.
- **The token hash column is not readable** by any API role (column-level grants).
- **Participant ID and role can't be changed through the API.** No UPDATE grant exists on profiles,
  and a trigger blocks changes to `participant_id`.
- **No service-role key in the app.** A leaked Vercel environment exposes only the public anon key,
  which RLS already constrains.
- **Admin routes return 404** for non-staff users, and server actions re-check the role.
- **Check-in endpoint** requires a same-origin `Origin` header, a valid session and a well-formed
  token. Session cookies are `SameSite=Lax`.
- **Open-redirect protection:** `next=` return paths must be same-origin relative paths.
- **Security headers:** `X-Frame-Options: DENY`, `nosniff`, HSTS, a restrictive Permissions-Policy,
  and `Referrer-Policy: no-referrer` with `no-store` on `/nfc/*` so tokens don't leak through
  referrers or caches.

## Privacy

- **Data collected:** name, contact number, email, check-ins, redemptions. Privacy consent is required
  at registration, and its timestamp is stored.
- **Contact number:** shown on the participant's pass and to staff. It is not verified and not used
  for login.
- **Location:** requested only at geofenced stations, only after the participant presses
  "Share my location", and used once. Only the computed distance is stored, never coordinates.
- **Participant view:** never includes internal database IDs.
- **Before launch:** set `ORGANIZER_NAME`, `PRIVACY_CONTACT_EMAIL` and `DATA_RETENTION_DAYS`, and
  have the privacy notice at `/privacy` reviewed against local law (for example the Philippine Data
  Privacy Act or GDPR, whichever applies).
