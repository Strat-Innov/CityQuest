-- Integration tests for the City Quest schema, functions and RLS policies.
-- Run with:  npm run test:db   (see scripts/test-db.sh)
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser)
-- ---------------------------------------------------------------------------
insert into public.stations (sort_order, station_name, location_name, description, is_final)
select n, 'Station ' || n, 'Place ' || n, 'Mission ' || n, n = 6
from generate_series(1, 6) n;

insert into public.rewards (station_id, reward_name, partner_name)
select id, 'Reward ' || sort_order, 'Partner ' || sort_order from public.stations;

-- Station 7: inactive. Station 8: geofenced (Greenwich), not final.
insert into public.stations (sort_order, station_name, location_name, is_active)
values (7, 'Closed Station', 'Nowhere', false);

-- Registration through the auth trigger.
insert into auth.users (email, raw_user_meta_data) values
  ('p1@example.test', '{"full_name":"  Maya   Ortiz ","contact_number":"+63 917 555 0101","privacy_consent":true}'),
  ('p2@example.test', '{"full_name":"Leo Tan","contact_number":"09175550102","privacy_consent":true}'),
  ('staff@example.test', '{"full_name":"Booth Staff","contact_number":"09175550103","privacy_consent":true}'),
  ('admin@example.test', '{"full_name":"Quest Admin","contact_number":"09175550104","privacy_consent":true}');

update public.profiles set role = 'staff' where email = 'staff@example.test';
update public.profiles set role = 'admin' where email = 'admin@example.test';

create temporary table ids as
select
  (select id from auth.users where email = 'p1@example.test') as p1,
  (select id from auth.users where email = 'p2@example.test') as p2,
  (select id from auth.users where email = 'staff@example.test') as staff,
  (select id from auth.users where email = 'admin@example.test') as admin;
grant select on ids to authenticated;

create temporary table tokens (sort_order int primary key, token text);
grant select, insert, update on tokens to authenticated;

-- ---------------------------------------------------------------------------
\echo '1. Registration creates a profile with a server-generated Participant ID'
-- ---------------------------------------------------------------------------
do $$
declare p public.profiles;
begin
  select * into p from public.profiles where email = 'p1@example.test';
  assert p.participant_id ~ '^CQ-[A-HJ-KMNP-Z2-9]{5}$', 'participant id format: ' || p.participant_id;
  assert p.full_name = 'Maya Ortiz', 'name normalised: ' || p.full_name;
  assert p.role = 'participant', 'default role';
  assert p.privacy_consent_at is not null, 'consent recorded';
  assert (select count(distinct participant_id) from public.profiles) = 4, 'ids unique';
end $$;

do $$
begin
  begin
    insert into auth.users (email, raw_user_meta_data)
    values ('noconsent@example.test', '{"full_name":"No Consent","contact_number":"09175550199"}');
    raise exception 'registration without consent should fail';
  exception when check_violation then null;
  end;
  begin
    insert into auth.users (email, raw_user_meta_data)
    values ('badphone@example.test', '{"full_name":"Bad Phone","contact_number":"call me","privacy_consent":true}');
    raise exception 'registration with invalid phone should fail';
  exception when check_violation then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
\echo '2. Admin generates NFC tokens (only the hash is stored)'
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', (select admin::text from ids), false);
set role authenticated;
insert into tokens select s.sort_order, public.rotate_station_token(s.id)
  from public.stations s;
reset role;

do $$
begin
  assert (select count(*) from tokens where token ~ '^[A-Za-z0-9_-]{32}$') = 7, 'token format';
  assert not exists (select 1 from public.stations s join tokens t on s.nfc_token_hash = t.token),
    'plaintext token must not be stored';
  assert (select count(*) from public.audit_logs where action = 'rotate_nfc_token') = 7, 'rotation audited';
end $$;

-- Geofence station 8 (needs a token too).
insert into public.stations (sort_order, station_name, location_name, latitude, longitude, geofence_radius_m)
values (8, 'Geo Station', 'Greenwich', 51.4779, -0.0015, 100);
select set_config('request.jwt.claim.sub', (select admin::text from ids), false);
set role authenticated;
insert into tokens select 8, public.rotate_station_token((select id from public.stations where sort_order = 8));
reset role;

-- ---------------------------------------------------------------------------
\echo '3. Participants cannot read or write privileged data directly'
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', (select p1::text from ids), false);
set role authenticated;
do $$
begin
  assert (select count(*) from public.profiles) = 1, 'participant sees only own profile';
  assert (select count(*) from public.stations) = 0, 'participant cannot list stations';
  assert (select count(*) from public.rewards) = 0, 'participant cannot list rewards';
  assert (select count(*) from public.audit_logs) = 0, 'participant cannot read audit log';

  begin
    perform nfc_token_hash from public.stations;
    raise exception 'token hash must not be selectable';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.check_ins (profile_id, station_id)
    values (auth.uid(), (select id from public.stations limit 1));
    raise exception 'direct check-in insert must fail';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'role escalation must fail';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set participant_id = 'CQ-AAAAA' where id = auth.uid();
    raise exception 'participant id update must fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.reward_redemptions (profile_id, reward_id, redeemed_by)
    values (auth.uid(), (select id from public.rewards limit 1), auth.uid());
    raise exception 'self-redemption insert must fail';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.rotate_station_token(gen_random_uuid());
    raise exception 'participant must not rotate tokens';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_dashboard_stats();
    raise exception 'participant must not read stats';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.redeem_reward('CQ-AAAAA', gen_random_uuid());
    raise exception 'participant must not redeem';
  exception when insufficient_privilege then null;
  end;

  begin
    perform private.progress_for(auth.uid(), true);
    raise exception 'private helpers must not be callable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role anon;
do $$
begin
  begin
    perform public.check_in('x');
    raise exception 'anon must not call check_in';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.profiles;
    raise exception 'anon must not read profiles';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ---------------------------------------------------------------------------
\echo '4. NFC check-in rules'
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', (select p1::text from ids), false);
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.check_in('not-a-real-token-but-long-enough');
  assert r->>'status' = 'invalid_token', 'unknown token: ' || r;
  assert r->'station' is null, 'invalid token discloses nothing';

  r := public.check_in('short');
  assert r->>'status' = 'invalid_token', 'malformed token';

  r := public.check_in(null);
  assert r->>'status' = 'invalid_token', 'null token';

  r := public.check_in((select token from tokens where sort_order = 7));
  assert r->>'status' = 'inactive_station', 'inactive: ' || r;

  r := public.check_in((select token from tokens where sort_order = 6));
  assert r->>'status' = 'locked', 'final locked: ' || r;
  assert (r->>'remaining_before_final')::int = 6, 'six remaining (1-5 and geofenced 8)';

  r := public.check_in((select token from tokens where sort_order = 2));
  assert r->>'status' = 'checked_in', 'station 2: ' || r;
  assert r->'rewards'->0->>'name' = 'Reward 2', 'reward unlocked';
  assert (r->>'completed')::int = 1, 'completed count';

  r := public.check_in((select token from tokens where sort_order = 2));
  assert r->>'status' = 'already_completed', 'duplicate: ' || r;
  assert r->>'checked_in_at' is not null, 'duplicate returns original timestamp';

  assert (select count(*) from public.check_ins) = 1, 'participant sees own single check-in';
end $$;

-- Geofence
do $$
declare r jsonb;
begin
  r := public.check_in((select token from tokens where sort_order = 8));
  assert r->>'status' = 'location_required', 'geofence needs location: ' || r;
  r := public.check_in((select token from tokens where sort_order = 8), 51.5072, -0.1276);
  assert r->>'status' = 'too_far', 'central London is too far: ' || r;
  r := public.check_in((select token from tokens where sort_order = 8), 51.4781, -0.0012);
  assert r->>'status' = 'checked_in', 'within 100 m: ' || r;
end $$;
reset role;

do $$
begin
  assert (select validation_status from public.check_ins c join public.stations s on s.id = c.station_id
           where s.sort_order = 8) = 'nfc_token_location', 'location validation recorded';
  assert (select distance_m from public.check_in_attempts where outcome = 'too_far') > 1000, 'distance logged';
  assert (select count(*) from public.audit_logs where action = 'check_in') = 2, 'check-ins audited';
end $$;
-- Reset the rate-limit window so the following steps are not throttled.
delete from public.check_in_attempts;

-- Complete stations 1-5 then the final.
select set_config('request.jwt.claim.sub', (select p1::text from ids), false);
set role authenticated;
do $$
declare r jsonb; n int;
begin
  foreach n in array array[1, 3, 4, 5] loop
    r := public.check_in((select token from tokens where sort_order = n));
    assert r->>'status' = 'checked_in', 'station ' || n || ': ' || r;
  end loop;
end $$;
reset role;
delete from public.check_in_attempts;

select set_config('request.jwt.claim.sub', (select p1::text from ids), false);
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.check_in((select token from tokens where sort_order = 6));
  assert r->>'status' = 'checked_in', 'final unlocked: ' || r;
  assert (r->>'quest_complete')::boolean, 'quest complete: ' || r;
end $$;

-- ---------------------------------------------------------------------------
\echo '5. Progress document'
-- ---------------------------------------------------------------------------
do $$
declare p jsonb;
begin
  p := public.get_my_progress();
  assert p->'profile'->>'full_name' = 'Maya Ortiz', 'profile in progress';
  assert jsonb_array_length(p->'stations') = 7, 'active stations (1-6, 8): ' || jsonb_array_length(p->'stations');
  assert (select count(*) from jsonb_array_elements(p->'stations') s where s->>'completed_at' is not null) = 7,
    'all completed';
  assert (select count(*) from jsonb_array_elements(p->'rewards') r where r->>'status' = 'earned') = 6, 'six rewards earned';
  assert p::text not like '%"id"%', 'no internal ids exposed to participant';
  assert p::text not like '%nfc%', 'no token data exposed';
end $$;
reset role;

-- ---------------------------------------------------------------------------
\echo '6. Rate limiting'
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', (select p2::text from ids), false);
set role authenticated;
do $$
declare r jsonb; i int;
begin
  for i in 1..10 loop
    r := public.check_in('guessing-token-number-' || lpad(i::text, 4, '0'));
    assert r->>'status' = 'invalid_token', 'guess ' || i;
  end loop;
  r := public.check_in((select token from tokens where sort_order = 1));
  assert r->>'status' = 'rate_limited', 'per-minute limit: ' || r;
end $$;
reset role;

-- Old attempts drop out of the per-minute window but still count per hour.
update public.check_in_attempts set created_at = now() - interval '5 minutes';
insert into public.check_in_attempts (profile_id, outcome, created_at)
select (select p2 from ids), 'invalid_token', now() - interval '10 minutes' from generate_series(1, 10);

select set_config('request.jwt.claim.sub', (select p2::text from ids), false);
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.check_in((select token from tokens where sort_order = 1));
  assert r->>'status' = 'rate_limited', 'per-hour invalid limit: ' || r;
end $$;
reset role;
delete from public.check_in_attempts where profile_id = (select p2 from ids);

select set_config('request.jwt.claim.sub', (select p2::text from ids), false);
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.check_in((select token from tokens where sort_order = 1));
  assert r->>'status' = 'checked_in', 'allowed again: ' || r;
end $$;
reset role;

-- ---------------------------------------------------------------------------
\echo '7. Token rotation invalidates the old sticker'
-- ---------------------------------------------------------------------------
create temporary table old_token as select token from tokens where sort_order = 3;
grant select on old_token to authenticated;
select set_config('request.jwt.claim.sub', (select admin::text from ids), false);
set role authenticated;
update tokens set token = public.rotate_station_token((select id from public.stations where sort_order = 3))
 where sort_order = 3;
reset role;

select set_config('request.jwt.claim.sub', (select p2::text from ids), false);
set role authenticated;
do $$
declare r jsonb;
begin
  r := public.check_in((select token from old_token));
  assert r->>'status' = 'invalid_token', 'old token rejected: ' || r;
  r := public.check_in((select token from tokens where sort_order = 3));
  assert r->>'status' = 'checked_in', 'new token works: ' || r;
end $$;
reset role;

-- ---------------------------------------------------------------------------
\echo '8. Staff redemption'
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', (select staff::text from ids), false);
set role authenticated;
do $$
declare r jsonb; pid text; p2id text; detail jsonb;
begin
  select participant_id into pid from public.profiles where email = 'p1@example.test';
  select participant_id into p2id from public.profiles where email = 'p2@example.test';

  assert (select count(*) from public.profiles) = 4, 'staff sees all profiles';

  detail := public.staff_get_participant(lower(pid));
  assert detail->'profile'->>'participant_id' = pid, 'lookup is case-insensitive';
  assert detail->'rewards'->0->>'id' is not null, 'staff view includes reward ids';

  assert public.staff_get_participant('CQ-ZZZZZ') is null, 'unknown participant';

  r := public.redeem_reward(p2id, (select r2.id from public.rewards r2 join public.stations s on s.id = r2.station_id
                                     where s.sort_order = 6));
  assert r->>'status' = 'not_earned', 'p2 has not earned the grand reward: ' || r;

  r := public.redeem_reward(pid, (select r2.id from public.rewards r2 join public.stations s on s.id = r2.station_id
                                    where s.sort_order = 6));
  assert r->>'status' = 'redeemed', 'redeem grand: ' || r;

  r := public.redeem_reward(pid, (select r2.id from public.rewards r2 join public.stations s on s.id = r2.station_id
                                    where s.sort_order = 6));
  assert r->>'status' = 'already_redeemed', 'duplicate redemption: ' || r;

  r := public.redeem_reward('CQ-ZZZZZ', gen_random_uuid());
  assert r->>'status' = 'participant_not_found', 'unknown participant: ' || r;

  r := public.redeem_reward((select participant_id from public.profiles where id = auth.uid()), gen_random_uuid());
  assert r->>'status' = 'self_redemption', 'staff cannot redeem for themselves: ' || r;

  begin
    perform public.admin_dashboard_stats();
    raise exception 'staff must not read admin stats';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.rotate_station_token((select id from public.stations limit 1));
    raise exception 'staff must not rotate tokens';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.stations set is_active = false where sort_order = 1;
    assert not found, 'staff update must affect no rows';
  end;
end $$;
reset role;

do $$
begin
  assert (select redeemed_by from public.reward_redemptions)
       = (select staff from ids), 'redeemed_by recorded';
  assert (select count(*) from public.audit_logs where action = 'redeem') = 1, 'redemption audited';
  assert (select is_active from public.stations where sort_order = 1), 'station unchanged by staff';
end $$;

select set_config('request.jwt.claim.sub', (select p1::text from ids), false);
set role authenticated;
do $$
declare p jsonb;
begin
  p := public.get_my_progress();
  assert (select r->>'status' from jsonb_array_elements(p->'rewards') r where (r->>'is_grand')::boolean) = 'redeemed',
    'participant sees redemption';
end $$;
reset role;

-- ---------------------------------------------------------------------------
\echo '9. Admin catalog management and stats'
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', (select admin::text from ids), false);
set role authenticated;
do $$
declare s jsonb; new_id uuid;
begin
  insert into public.stations (sort_order, station_name, location_name) values (9, 'Pop-up', 'Square')
  returning id into new_id;
  update public.stations set is_active = false where id = new_id;
  insert into public.rewards (station_id, reward_name) values (new_id, 'Pop-up prize');

  begin
    update public.stations set is_final = true where sort_order = 1;
    raise exception 'second final station must fail';
  exception when unique_violation then null;
  end;

  s := public.admin_dashboard_stats();
  assert (s->>'participants')::int = 2, 'participants: ' || s;
  assert (s->>'check_ins')::int = 9, 'check-ins: ' || s;
  assert (s->>'completed_quests')::int = 1, 'completed quests: ' || s;
  assert (s->>'rewards_redeemed')::int = 1, 'redeemed: ' || s;
  assert (s->>'rewards_earned')::int = 8, 'earned (6 for p1, 2 for p2): ' || s;
  assert jsonb_array_length(s->'per_station') = 9, 'per station';
end $$;
reset role;

do $$
begin
  assert (select count(*) from public.audit_logs where entity_type = 'stations' and action = 'update' and actor_id = (select admin from ids)) = 1,
    'station change audited';
  assert (select count(*) from public.audit_logs where entity_type = 'stations' and action = 'insert' and actor_id = (select admin from ids)) = 2,
    'station creation audited (Geo Station fixture + Pop-up, both with the admin claim set)';
  assert not exists (select 1 from public.audit_logs where metadata ? 'nfc_token_hash'), 'hash never in audit';
end $$;

\o
\echo 'ALL DATABASE TESTS PASSED'
