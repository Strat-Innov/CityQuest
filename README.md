# City Quest

A mobile-first quest app for a city-wide event. Participants register for a digital pass, visit
booths across the city and **tap an NFC sticker** at each one to record their progress. Each stop
unlocks a reward, and booth staff redeem rewards against the participant's ID.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth) · Vercel
- **No app install** and no Web NFC: each sticker holds an ordinary HTTPS URL, which iOS and Android
  open in the browser.
- **No service-role key:** every privileged rule runs inside Postgres (RLS and `SECURITY DEFINER`
  functions), with the signed-in user's own session.

## How it works

```
 NFC sticker ──tap──► https://<domain>/nfc/<token>
                              │  (not signed in → /login?next=/nfc/<token> → back here)
                              ▼
                  POST /api/check-in {token}
                              │  same-origin check, input validation, session check
                              ▼
            public.check_in(token)  ← Postgres function, runs as the participant
              ├─ rate limit (10/min, 20 invalid/hour per participant)
              ├─ sha256(token) → station   (unknown → invalid_token)
              ├─ station inactive          → inactive_station
              ├─ already checked in        → already_completed
              ├─ final stop before 1–5     → locked
              ├─ optional geofence         → location_required / too_far
              ├─ INSERT check_in (UNIQUE profile+station)
              └─ log attempt + audit entry
```

| Role | Can do |
|---|---|
| `participant` | Own pass, own progress, NFC check-ins |
| `staff` | Look up participants by name/ID, redeem earned rewards |
| `admin` | Everything staff can do, plus the dashboard, stations, NFC tokens, rewards and the redemption log |

### Quest rules (kept from the original prototype)
- Six stops. Stops 1–5 can be done in any order.
- Stop 6 (Observatory Finale) is the **final stop**. It unlocks only after every other active stop.
- Each stop unlocks its own reward, and the final stop's reward is the grand reward.
- Each stop counts once per participant.
- Rewards are redeemed by staff, never by the participant.

## Project layout

```
src/
  app/
    (participant)/quest, pass      Quest and My Pass tabs (original two-tab design)
    (auth)/login, register, ...    Sign-in, registration, privacy notice
    nfc/[token]                    NFC landing page → check-in flow
    api/check-in                   Check-in endpoint (POST)
    auth/confirm                   Email-confirmation callback
    admin/...                      Staff/admin console
  components/                      UI (quest/, admin/, nfc/, ui/)
  lib/                             env, auth guards, data access, validation, formatting
  middleware.ts                    Session refresh + sign-in redirect
supabase/
  migrations/                      Schema, RLS, functions (single source of truth for rules)
  seed.sql                         The six original stations and rewards
  tests/                           SQL integration tests
docs/
  DEPLOYMENT.md                    Supabase + Vercel + NFC sticker setup
  SECURITY.md                      Threat model, NFC limits, NTAG 424 DNA upgrade path
```

## Local development

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project URL and anon key (see `docs/DEPLOYMENT.md`), then:

```bash
npm run dev
```

## Quality checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run test:db
```

`npm run test:db` creates a throw-away local PostgreSQL 15+ cluster, applies the migration and seed,
and runs `supabase/tests/city_quest.test.sql`. That covers registration, token hashing, RLS denials,
every check-in outcome, rate limiting, token rotation, redemption and the admin stats.

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.
