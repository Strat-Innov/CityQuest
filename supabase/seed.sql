-- City Quest — initial catalog, carried over from the original prototype.
-- Stations 1-5 can be completed in any order; station 6 is the final stop and
-- unlocks only after every other active station is complete.
--
-- NFC tokens are NOT seeded. After running this, open Admin → Stations and
-- press "Generate NFC token" for each station, then write the URL to its sticker.
--
-- Safe to run more than once: existing stations (by stop number) are skipped.

with seed (sort_order, station_name, location_name, description, is_final,
           reward_name, partner_name, reward_description) as (
  values
    (1, 'The Clocktower Cipher', 'Old Town · Clocktower steps',
        'Decode the cipher carved under the clock face and tell the host the hidden word.', false,
        'Brass Key Pin', 'Old Town Guild', 'A collectible brass key pin from the Old Town Guild.'),
    (2, 'Bridge of Echoes', 'Iron Bridge · east end',
        'Take a photo that recreates the 1920s postcard at the bridge booth.', false,
        'Free espresso', 'Ferro Café', 'One free espresso at Ferro Café.'),
    (3, 'Market Barter', 'Market Square · Stall 14',
        'Trade your starter token for three ingredients without spending money.', false,
        'Saffron spice tin', 'Stall 14', 'A tin of saffron from Stall 14.'),
    (4, 'Garden Riddle', 'Botanical Park · glasshouse',
        'Find the plant that answers the riddle on your quest card.', false,
        'Rare seed packet', 'Park Conservancy', 'A packet of rare seeds from the Park Conservancy.'),
    (5, 'Harbor Signal', 'Docks · Pier 3',
        'Spell the quest phrase using the signal flags on the harbor mast.', false,
        'Ferry day pass', 'Harbor Lines', 'A one-day ferry pass from Harbor Lines.'),
    (6, 'Observatory Finale', 'Observatory Hill',
        'Unlocks after your first five stops. Light the lantern to finish the quest.', true,
        'Lantern Medallion', 'Grand reward', 'The City Quest grand reward for completing every stop.')
),
inserted as (
  insert into public.stations (sort_order, station_name, location_name, description, is_final)
  select sort_order, station_name, location_name, description, is_final from seed
  on conflict (sort_order) do nothing
  returning id, sort_order
)
insert into public.rewards (station_id, reward_name, partner_name, reward_description)
select i.id, s.reward_name, s.partner_name, s.reward_description
  from inserted i join seed s using (sort_order);
