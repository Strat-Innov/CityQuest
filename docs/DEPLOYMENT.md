# Deployment guide

The app is hosted on **Vercel**. All data (accounts, stations, check-ins, rewards) lives in
**Supabase**. Follow the steps in order.

## What you need to provide

| Value | Where it comes from | Used as |
|---|---|---|
| Supabase project URL | Supabase → Project Settings → API | `NEXT_PUBLIC_SUPABASE_URL` |
| Supabase anon / publishable key | Supabase → Project Settings → API | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Production domain | Vercel, or your own domain | `NEXT_PUBLIC_SITE_URL` |
| Event time zone | e.g. `Asia/Manila` | `APP_TIME_ZONE` |
| Organiser name, privacy contact email, retention days | Your organisation | `ORGANIZER_NAME`, `PRIVACY_CONTACT_EMAIL`, `DATA_RETENTION_DAYS` |

The **service-role key is not used**. Do not add it to Vercel.

## 1. Supabase project

1. Create a project at <https://supabase.com>. Pick the region closest to the event.
2. Apply the schema. Use either:
   - **Supabase CLI** (recommended):
     ```bash
     npx supabase login
     ```
     ```bash
     npx supabase link --project-ref <your-project-ref>
     ```
     ```bash
     npx supabase db push
     ```
   - **or the SQL editor:** paste and run `supabase/migrations/20261105000000_city_quest_schema.sql`.
3. Load the six original stations and rewards by running `supabase/seed.sql` in the SQL editor.

## 2. Supabase Auth settings

In **Authentication → Sign In / Providers → Email**:
- Keep **Email** enabled and **Confirm email** turned on (recommended).

In **Authentication → URL Configuration**:
- **Site URL:** `https://<your-production-domain>`
- **Redirect URLs:** add `https://<your-production-domain>/auth/confirm**` and
  `http://localhost:3000/auth/confirm**`. The `**` lets the `?next=` return path through.

In **Authentication → Emails → Confirm signup**, change the link so confirmation works even when the
email is opened on a different device or browser:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

> `{{ .RedirectTo }}` is the app's `/auth/confirm?next=…` URL. It carries the page to return to,
> such as the NFC stop the participant tapped. The default template also works, but only when the
> link is opened in the same browser that registered. `/auth/confirm` accepts both formats.

**Email sending:** Supabase's built-in email sender is limited to a few emails per hour and is meant
for testing. Before launch, add your own SMTP sender in **Authentication → Emails → SMTP Settings**.
Free tiers from Resend, Brevo and similar providers are usually enough for an event.

## 3. Create the first admin

Admins and staff register through the app like everyone else, then you promote them.

1. Open the deployed app and register with the admin's email.
2. In the Supabase SQL editor, run:

```sql
update public.profiles set role = 'admin' where email = 'admin@yourdomain.com';
```

For booth staff, use `role = 'staff'`. To revoke access, use `role = 'participant'`.

> Accounts created from the Supabase dashboard ("Add user") are rejected. The registration trigger
> requires the name, contact number and privacy consent that the app's form collects.

## 4. Vercel

1. Push this repository to GitHub, then in Vercel choose **Add New → Project** and import it.
   The framework is detected as Next.js; keep the default build settings.
2. **If you connected the Vercel ↔ Supabase integration**, it has already created
   `NEXT_PUBLIC_SUPABASE_URL` and a key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` or
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). The app accepts either key name, so don't add them again.
   `NEXT_PUBLIC_SITE_URL` defaults to the project's Vercel production domain. Set it explicitly
   once you use a custom domain.

   Otherwise, under **Settings → Environment Variables**, add the variables from `.env.example` for
   **Production** (and **Preview** if you use preview deployments):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
   NEXT_PUBLIC_SITE_URL=https://<your-production-domain>
   APP_TIME_ZONE=Asia/Manila
   ORGANIZER_NAME=...
   PRIVACY_CONTACT_EMAIL=...
   DATA_RETENTION_DAYS=90
   ```
3. Choose the **Config** type (not Secret) for `NEXT_PUBLIC_*` variables. They are public by design.
4. Deploy (or **Redeploy** after changing variables, because `NEXT_PUBLIC_*` values are fixed at build
   time). If something is missing, the site shows a setup page naming the variables to fix.

### Production domain

1. In Vercel **Settings → Domains**, add your domain and follow the DNS instructions.
2. Set `NEXT_PUBLIC_SITE_URL` to exactly that origin (`https://`, no trailing slash) and redeploy.
3. Update the Supabase **Site URL** and **Redirect URLs** to match.

**Choose the domain before writing the stickers.** NFC stickers contain the full URL, so changing the
domain later means rewriting every sticker. A custom domain is safer than a `*.vercel.app` one.

## 5. NFC stickers

**Stickers:** NTAG213 or NTAG215, about 144 bytes of user memory is plenty. On metal surfaces, use
on-metal (anti-metal) stickers.

For each station:

1. In the admin console, open **Stations → (station) → Generate NFC token**.
2. Copy the URL shown, e.g. `https://cityquest.example.com/nfc/Xb2…`. **It is shown only once.** If
   you lose it, generate a new one; the old sticker stops working.
3. With a free app such as **NXP TagWriter** (Android/iOS) or **NFC Tools**:
   - Write a single **URI / URL record** with the full URL.
   - Tap the sticker with a phone and confirm it opens the check-in page.
   - **Lock the tag (make it read-only)** so it can't be overwritten at the booth. Locking is
     permanent.
4. Label each sticker privately with its stop number, so you can tell them apart before they're placed.

If a sticker URL leaks, for example in a photo posted online, generate a new token and rewrite or
replace that one sticker.

## 6. Launch checklist

Run on at least one **iPhone** (iOS 14+, NFC reading works from the lock screen or Control Center) and
one **Android** phone (NFC turned on, screen unlocked):

- [ ] Register a new participant. The confirmation email arrives, the link opens the app signed in,
      and My Pass shows the name, contact number and a `CQ-XXXXX` ID.
- [ ] Sign out, tap a sticker. The app asks you to sign in and then records the check-in automatically.
- [ ] Tap the same sticker again: "Already checked in".
- [ ] Tap stop 6 before finishing 1–5: "Not unlocked yet".
- [ ] Deactivate a station in admin and tap it: "Stop not open". Then re-activate it.
- [ ] Sign in on a second phone: same progress.
- [ ] As staff, look up the participant ID, redeem a reward, then try again: "Already redeemed".
- [ ] As a participant, open `/admin`: page not found.
- [ ] Check that all six stickers open the production domain, not a preview URL.

## Operations

- **Time zone:** check-in and redemption times are shown in `APP_TIME_ZONE`.
- **Logs:** check-in rejections and server errors appear in Vercel → Logs as JSON lines. Tokens and
  passwords are never logged.
- **Audit:** `public.audit_logs` records check-ins, redemptions, token generation and every
  station/reward change, with the acting account. `public.check_in_attempts` records every tap
  attempt and its outcome.
- **Data retention:** after the event, delete participant data in line with your privacy notice.
  Deleting users in Supabase → Authentication cascades to their profile and check-ins.
  Staff accounts that redeemed rewards must keep their profile until the redemptions are deleted.
