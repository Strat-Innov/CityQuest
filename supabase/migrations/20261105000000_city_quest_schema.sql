-- =============================================================================
-- City Quest — core schema
--
-- Security model
--   * Every table has Row Level Security enabled.
--   * Table privileges are granted explicitly (Supabase's broad default grants
--     are revoked first) so that column-level restrictions actually hold.
--   * Participants can never write progress directly: check-ins, redemptions
--     and NFC token generation only happen through SECURITY DEFINER functions
--     that read the caller from auth.uid() and enforce every business rule.
--   * The application never needs the service-role key.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Helpers that must not be callable through the REST API live in "private",
-- which is not in PostgREST's exposed schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('participant', 'staff', 'admin');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- One row per auth user. Created by the on_auth_user_created trigger only.
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  participant_id     text not null unique
                       check (participant_id ~ '^CQ-[A-Z0-9]{5}$'),
  full_name          text not null
                       check (char_length(btrim(full_name)) between 2 and 100),
  contact_number     text not null
                       check (contact_number ~ '^\+?[0-9(][0-9 ()-]{5,18}[0-9]$'),
  email              text not null check (char_length(email) <= 254),
  role               public.app_role not null default 'participant',
  privacy_consent_at timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index profiles_full_name_trgm_idx
  on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index profiles_role_idx on public.profiles (role);

-- A quest stop. sort_order is the public "stop number" (1..n).
create table public.stations (
  id                   uuid primary key default gen_random_uuid(),
  sort_order           integer not null unique check (sort_order between 1 and 999),
  station_name         text not null check (char_length(btrim(station_name)) between 2 and 100),
  location_name        text not null check (char_length(btrim(location_name)) between 2 and 150),
  description          text not null default '' check (char_length(description) <= 1000),
  -- The final station only unlocks after every other active station is done.
  is_final             boolean not null default false,
  -- SHA-256 (hex) of the NFC token. The plaintext token is never stored.
  nfc_token_hash       text unique check (nfc_token_hash ~ '^[0-9a-f]{64}$'),
  nfc_token_rotated_at timestamptz,
  -- Optional geofence. Either all three are set or none are.
  latitude             double precision check (latitude between -90 and 90),
  longitude            double precision check (longitude between -180 and 180),
  geofence_radius_m    integer check (geofence_radius_m between 25 and 5000),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint stations_geofence_complete check (
    (latitude is null and longitude is null and geofence_radius_m is null)
    or (latitude is not null and longitude is not null and geofence_radius_m is not null)
  )
);

-- At most one final (grand) station.
create unique index stations_single_final_idx on public.stations (is_final) where is_final;

create table public.check_ins (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  station_id        uuid not null references public.stations (id) on delete restrict,
  checked_in_at     timestamptz not null default now(),
  -- How the tap was validated. 'nfc_sun' is reserved for NTAG 424 DNA.
  validation_status text not null default 'nfc_token'
                      check (validation_status in ('nfc_token', 'nfc_token_location', 'nfc_sun')),
  constraint check_ins_profile_station_key unique (profile_id, station_id)
);

create index check_ins_station_idx on public.check_ins (station_id, checked_in_at desc);
create index check_ins_checked_in_at_idx on public.check_ins (checked_in_at desc);

-- Every check-in attempt (successful or not). Used for rate limiting and audit.
create table public.check_in_attempts (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  station_id  uuid references public.stations (id) on delete set null,
  outcome     text not null,
  -- Only the computed distance is kept, never raw coordinates.
  distance_m  integer,
  created_at  timestamptz not null default now()
);

create index check_in_attempts_profile_time_idx
  on public.check_in_attempts (profile_id, created_at desc);

create table public.rewards (
  id                 uuid primary key default gen_random_uuid(),
  station_id         uuid not null references public.stations (id) on delete restrict,
  reward_name        text not null check (char_length(btrim(reward_name)) between 2 and 100),
  reward_description text not null default '' check (char_length(reward_description) <= 500),
  -- Participating establishment that provides the reward.
  partner_name       text not null default '' check (char_length(partner_name) <= 100),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index rewards_station_idx on public.rewards (station_id);

create table public.reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null,
  reward_id   uuid not null,
  redeemed_at timestamptz not null default now(),
  redeemed_by uuid not null,
  constraint reward_redemptions_profile_id_fkey
    foreign key (profile_id) references public.profiles (id) on delete cascade,
  constraint reward_redemptions_reward_id_fkey
    foreign key (reward_id) references public.rewards (id) on delete restrict,
  constraint reward_redemptions_redeemed_by_fkey
    foreign key (redeemed_by) references public.profiles (id) on delete restrict,
  constraint reward_redemptions_profile_reward_key unique (profile_id, reward_id)
);

create index reward_redemptions_redeemed_at_idx on public.reward_redemptions (redeemed_at desc);
create index reward_redemptions_reward_idx on public.reward_redemptions (reward_id);
create index reward_redemptions_redeemed_by_idx on public.reward_redemptions (redeemed_by);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Private helpers
-- -----------------------------------------------------------------------------

create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('staff', 'admin'), false);
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false);
$$;

create or replace function private.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

-- CQ-XXXXX using an alphabet without look-alike characters (0/O, 1/I/L).
create or replace function private.generate_participant_id()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  bytes bytea;
  i integer;
begin
  loop
    bytes := extensions.gen_random_bytes(5);
    candidate := 'CQ-';
    for i in 0..4 loop
      candidate := candidate || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where participant_id = candidate);
  end loop;
  return candidate;
end;
$$;

-- Creates the profile when Supabase Auth creates a user.
-- Registration metadata is validated here as well as in the app, because
-- auth.signUp can be called directly with the public anon key.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_contact   text := btrim(coalesce(new.raw_user_meta_data ->> 'contact_number', ''));
  v_consent   boolean := coalesce((new.raw_user_meta_data ->> 'privacy_consent')::boolean, false);
begin
  if not v_consent then
    raise exception 'Privacy consent is required to register' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, participant_id, full_name, contact_number, email, privacy_consent_at)
  values (
    new.id,
    private.generate_participant_id(),
    regexp_replace(v_full_name, '\s+', ' ', 'g'),
    v_contact,
    lower(coalesce(new.email, '')),
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger stations_set_updated_at before update on public.stations
  for each row execute function private.set_updated_at();
create trigger rewards_set_updated_at before update on public.rewards
  for each row execute function private.set_updated_at();

-- Participant ID and role can never be changed through the API.
-- (Role changes are made by an operator in the SQL editor; see docs.)
create or replace function private.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.participant_id is distinct from old.participant_id then
    raise exception 'participant_id is immutable' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_identity before update on public.profiles
  for each row execute function private.protect_profile_identity();

-- Audit every station / reward change made by admins.
create or replace function private.audit_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes jsonb := '{}'::jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb)
      into v_changes
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value
       -- Token rotation is audited by rotate_station_token itself.
       and n.key not in ('updated_at', 'nfc_token_hash', 'nfc_token_rotated_at');
    if v_changes = '{}'::jsonb then
      return new;
    end if;
  end if;

  perform private.write_audit(
    lower(tg_op),
    tg_table_name,
    new.id::text,
    case when tg_op = 'INSERT' then to_jsonb(new) - 'nfc_token_hash' else v_changes end
  );
  return new;
end;
$$;

create trigger stations_audit after insert or update on public.stations
  for each row execute function private.audit_catalog_change();
create trigger rewards_audit after insert or update on public.rewards
  for each row execute function private.audit_catalog_change();

-- Full progress document for one participant. Single source of truth for the
-- quest rules used by both the participant UI and the staff view.
create or replace function private.progress_for(p_profile_id uuid, p_include_ids boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_result jsonb;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if not found then
    return null;
  end if;

  with visible_stations as (
    -- Active stations, plus inactive ones the participant already completed.
    select s.*, c.checked_in_at
      from public.stations s
      left join public.check_ins c on c.station_id = s.id and c.profile_id = p_profile_id
     where s.is_active or c.id is not null
  ),
  remaining as (
    select count(*) as n
      from visible_stations
     where is_active and not is_final and checked_in_at is null
  ),
  visible_rewards as (
    select r.*, vs.sort_order, vs.station_name, vs.location_name, vs.is_final,
           vs.checked_in_at, rr.redeemed_at
      from public.rewards r
      join visible_stations vs on vs.id = r.station_id
      left join public.reward_redemptions rr on rr.reward_id = r.id and rr.profile_id = p_profile_id
     where r.is_active or rr.id is not null
  )
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'participant_id', v_profile.participant_id,
      'full_name', v_profile.full_name,
      'contact_number', v_profile.contact_number,
      'role', v_profile.role,
      'created_at', v_profile.created_at
    ),
    'stations', coalesce((
      select jsonb_agg(jsonb_build_object(
               'number', vs.sort_order,
               'name', vs.station_name,
               'location', vs.location_name,
               'mission', vs.description,
               'is_final', vs.is_final,
               'is_active', vs.is_active,
               'completed_at', vs.checked_in_at,
               'locked', vs.is_final and vs.checked_in_at is null and (select n from remaining) > 0
             ) || case when p_include_ids then jsonb_build_object('id', vs.id) else '{}'::jsonb end
             order by vs.sort_order)
        from visible_stations vs
    ), '[]'::jsonb),
    'remaining_before_final', (select n from remaining),
    'rewards', coalesce((
      select jsonb_agg(jsonb_build_object(
               'station_number', vr.sort_order,
               'station_name', vr.station_name,
               'location', vr.location_name,
               'name', vr.reward_name,
               'description', vr.reward_description,
               'partner', vr.partner_name,
               'is_grand', vr.is_final,
               'status', case
                           when vr.redeemed_at is not null then 'redeemed'
                           when vr.checked_in_at is not null and vr.is_active then 'earned'
                           else 'locked'
                         end,
               'earned_at', vr.checked_in_at,
               'redeemed_at', vr.redeemed_at
             ) || case when p_include_ids then jsonb_build_object('id', vr.id) else '{}'::jsonb end
             order by vr.sort_order, vr.reward_name)
        from visible_rewards vr
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Public RPC functions (exposed through PostgREST, callable by signed-in users)
-- -----------------------------------------------------------------------------

-- The signed-in participant's own progress.
create or replace function public.get_my_progress()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.progress_for(auth.uid(), false);
$$;

-- Record an NFC check-in for the signed-in participant.
-- Returns a JSON object whose "status" is one of:
--   checked_in, already_completed, invalid_token, inactive_station, locked,
--   location_required, too_far, rate_limited, unauthenticated
create or replace function public.check_in(
  p_token text,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_max_attempts_per_minute constant integer := 10;
  c_max_invalid_per_hour    constant integer := 20;

  v_uid        uuid := auth.uid();
  v_station    public.stations;
  v_status     text;
  v_distance   integer;
  v_validation text := 'nfc_token';
  v_check_in   public.check_ins;
  v_remaining  integer;
  v_station_json jsonb;
  v_rewards    jsonb;
  v_completed  integer;
  v_total      integer;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  -- Serialise concurrent attempts by the same participant so the rate limit
  -- and duplicate checks below cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- Rate limiting (per participant).
  if (select count(*) from public.check_in_attempts
       where profile_id = v_uid and created_at > now() - interval '1 minute') >= c_max_attempts_per_minute
     or (select count(*) from public.check_in_attempts
          where profile_id = v_uid and outcome = 'invalid_token'
            and created_at > now() - interval '1 hour') >= c_max_invalid_per_hour
  then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  -- Token lookup (constant format check first; tokens are URL-safe base64).
  if p_token is not null and p_token ~ '^[A-Za-z0-9_-]{20,128}$' then
    select * into v_station
      from public.stations
     where nfc_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  end if;

  if v_station.id is null then
    v_status := 'invalid_token';
  elsif not v_station.is_active then
    v_status := 'inactive_station';
  elsif exists (select 1 from public.check_ins
                 where profile_id = v_uid and station_id = v_station.id) then
    v_status := 'already_completed';
  else
    -- Progression rule: the final station unlocks after all other active stations.
    if v_station.is_final then
      select count(*) into v_remaining
        from public.stations s
       where s.is_active and not s.is_final
         and not exists (select 1 from public.check_ins c
                          where c.station_id = s.id and c.profile_id = v_uid);
      if v_remaining > 0 then
        v_status := 'locked';
      end if;
    end if;

    -- Optional geofence.
    if v_status is null and v_station.geofence_radius_m is not null then
      if p_latitude is null or p_longitude is null
         or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
        v_status := 'location_required';
      else
        v_distance := round(2 * 6371000 * asin(sqrt(
            power(sin(radians(p_latitude - v_station.latitude) / 2), 2)
          + cos(radians(v_station.latitude)) * cos(radians(p_latitude))
          * power(sin(radians(p_longitude - v_station.longitude) / 2), 2)
        )));
        if v_distance > v_station.geofence_radius_m then
          v_status := 'too_far';
        else
          v_validation := 'nfc_token_location';
        end if;
      end if;
    end if;

    if v_status is null then
      insert into public.check_ins (profile_id, station_id, validation_status)
      values (v_uid, v_station.id, v_validation)
      on conflict on constraint check_ins_profile_station_key do nothing
      returning * into v_check_in;

      v_status := case when v_check_in.id is null then 'already_completed' else 'checked_in' end;
    end if;
  end if;

  insert into public.check_in_attempts (profile_id, station_id, outcome, distance_m)
  values (v_uid, v_station.id, v_status, v_distance);

  if v_status = 'checked_in' then
    perform private.write_audit('check_in', 'station', v_station.id::text,
      jsonb_build_object('validation_status', v_validation));
  end if;

  if v_station.id is null then
    return jsonb_build_object('status', v_status);
  end if;

  v_station_json := jsonb_build_object(
    'number', v_station.sort_order,
    'name', v_station.station_name,
    'location', v_station.location_name,
    'is_final', v_station.is_final
  );

  -- Do not disclose anything else about inactive stations.
  if v_status = 'inactive_station' then
    return jsonb_build_object('status', v_status, 'station', v_station_json);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('name', r.reward_name, 'partner', r.partner_name)
                            order by r.reward_name), '[]'::jsonb)
    into v_rewards
    from public.rewards r
   where r.station_id = v_station.id and r.is_active;

  select count(*) filter (where c.id is not null), count(*)
    into v_completed, v_total
    from public.stations s
    left join public.check_ins c on c.station_id = s.id and c.profile_id = v_uid
   where s.is_active;

  return jsonb_build_object(
    'status', v_status,
    'station', v_station_json,
    'rewards', v_rewards,
    'checked_in_at', coalesce(v_check_in.checked_in_at,
      (select c.checked_in_at from public.check_ins c
        where c.profile_id = v_uid and c.station_id = v_station.id)),
    'remaining_before_final', v_remaining,
    'completed', v_completed,
    'total', v_total,
    'quest_complete', v_total > 0 and v_completed = v_total
  );
end;
$$;

-- Staff/admin: full progress for one participant, looked up by Participant ID.
create or replace function public.staff_get_participant(p_participant_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if not private.is_staff() then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  select id into v_profile_id
    from public.profiles
   where participant_id = upper(btrim(p_participant_id));

  if v_profile_id is null then
    return null;
  end if;

  return private.progress_for(v_profile_id, true)
    || jsonb_build_object('email', (select email from public.profiles where id = v_profile_id));
end;
$$;

-- Staff/admin: redeem an earned reward on behalf of a participant.
-- Returns {"status": redeemed | already_redeemed | not_earned | reward_unavailable | participant_not_found | self_redemption}
create or replace function public.redeem_reward(p_participant_id text, p_reward_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id   uuid := auth.uid();
  v_profile_id uuid;
  v_reward     public.rewards;
  v_redemption public.reward_redemptions;
begin
  if not private.is_staff() then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  select id into v_profile_id
    from public.profiles
   where participant_id = upper(btrim(p_participant_id));
  if v_profile_id is null then
    return jsonb_build_object('status', 'participant_not_found');
  end if;

  if v_profile_id = v_staff_id then
    return jsonb_build_object('status', 'self_redemption');
  end if;

  select * into v_reward from public.rewards where id = p_reward_id;
  if v_reward.id is null or not v_reward.is_active then
    return jsonb_build_object('status', 'reward_unavailable');
  end if;

  if not exists (select 1 from public.check_ins
                  where profile_id = v_profile_id and station_id = v_reward.station_id) then
    return jsonb_build_object('status', 'not_earned');
  end if;

  insert into public.reward_redemptions (profile_id, reward_id, redeemed_by)
  values (v_profile_id, v_reward.id, v_staff_id)
  on conflict on constraint reward_redemptions_profile_reward_key do nothing
  returning * into v_redemption;

  if v_redemption.id is null then
    return jsonb_build_object(
      'status', 'already_redeemed',
      'redeemed_at', (select redeemed_at from public.reward_redemptions
                       where profile_id = v_profile_id and reward_id = v_reward.id)
    );
  end if;

  perform private.write_audit('redeem', 'reward', v_reward.id::text,
    jsonb_build_object('participant_id', upper(btrim(p_participant_id)), 'redemption_id', v_redemption.id));

  return jsonb_build_object('status', 'redeemed', 'redeemed_at', v_redemption.redeemed_at);
end;
$$;

-- Admin: generate a new NFC token for a station. Returns the plaintext token
-- exactly once; only its hash is stored. Any previous token stops working.
create or replace function public.rotate_station_token(p_station_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not private.is_admin() then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  -- 24 random bytes -> 32 URL-safe base64 characters (192 bits of entropy).
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');

  update public.stations
     set nfc_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
         nfc_token_rotated_at = now()
   where id = p_station_id;

  if not found then
    raise exception 'Station not found' using errcode = 'no_data_found';
  end if;

  perform private.write_audit('rotate_nfc_token', 'station', p_station_id::text);
  return v_token;
end;
$$;

-- Admin: monitoring dashboard figures.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_active_stations integer;
begin
  if not private.is_admin() then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  select count(*) into v_active_stations from public.stations where is_active;

  return jsonb_build_object(
    'participants', (select count(*) from public.profiles where role = 'participant'),
    'check_ins', (select count(*) from public.check_ins),
    'completed_quests', (
      select count(*) from (
        select c.profile_id
          from public.check_ins c
          join public.stations s on s.id = c.station_id and s.is_active
         group by c.profile_id
        having count(*) = v_active_stations and v_active_stations > 0
      ) done
    ),
    'rewards_earned', (
      select count(*)
        from public.check_ins c
        join public.rewards r on r.station_id = c.station_id and r.is_active
    ),
    'rewards_redeemed', (select count(*) from public.reward_redemptions),
    'per_station', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id,
               'number', s.sort_order,
               'name', s.station_name,
               'is_active', s.is_active,
               'check_ins', (select count(*) from public.check_ins c where c.station_id = s.id)
             ) order by s.sort_order)
        from public.stations s
    ), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.get_my_progress() from public, anon;
revoke all on function public.check_in(text, double precision, double precision) from public, anon;
revoke all on function public.staff_get_participant(text) from public, anon;
revoke all on function public.redeem_reward(text, uuid) from public, anon;
revoke all on function public.rotate_station_token(uuid) from public, anon;
revoke all on function public.admin_dashboard_stats() from public, anon;

-- Functions referenced by RLS policies must be executable by the caller.
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.current_app_role() to authenticated;

grant execute on function public.get_my_progress() to authenticated;
grant execute on function public.check_in(text, double precision, double precision) to authenticated;
grant execute on function public.staff_get_participant(text) to authenticated;
grant execute on function public.redeem_reward(text, uuid) to authenticated;
grant execute on function public.rotate_station_token(uuid) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- Read access (rows are filtered by RLS below). anon gets nothing.
grant select on public.profiles to authenticated;
grant select on public.check_ins to authenticated;
grant select on public.reward_redemptions to authenticated;
grant select on public.rewards to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.check_in_attempts to authenticated;
-- nfc_token_hash is deliberately excluded.
grant select (id, sort_order, station_name, location_name, description, is_final,
              nfc_token_rotated_at, latitude, longitude, geofence_radius_m,
              is_active, created_at, updated_at)
  on public.stations to authenticated;

-- Catalog writes (admins only, enforced by RLS). Token hash is never writable.
grant insert (sort_order, station_name, location_name, description, is_final,
              latitude, longitude, geofence_radius_m, is_active)
  on public.stations to authenticated;
grant update (sort_order, station_name, location_name, description, is_final,
              latitude, longitude, geofence_radius_m, is_active)
  on public.stations to authenticated;
grant insert (station_id, reward_name, reward_description, partner_name, is_active)
  on public.rewards to authenticated;
grant update (station_id, reward_name, reward_description, partner_name, is_active)
  on public.rewards to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.stations           enable row level security;
alter table public.check_ins          enable row level security;
alter table public.check_in_attempts  enable row level security;
alter table public.rewards            enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.audit_logs         enable row level security;

create policy "Own profile or staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy "Staff read stations" on public.stations
  for select to authenticated using ((select private.is_staff()));
create policy "Admins create stations" on public.stations
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update stations" on public.stations
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Staff read rewards" on public.rewards
  for select to authenticated using ((select private.is_staff()));
create policy "Admins create rewards" on public.rewards
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update rewards" on public.rewards
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Own check-ins or staff" on public.check_ins
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_staff()));

create policy "Own redemptions or staff" on public.reward_redemptions
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_staff()));

create policy "Admins read check-in attempts" on public.check_in_attempts
  for select to authenticated using ((select private.is_admin()));

create policy "Admins read audit log" on public.audit_logs
  for select to authenticated using ((select private.is_admin()));
