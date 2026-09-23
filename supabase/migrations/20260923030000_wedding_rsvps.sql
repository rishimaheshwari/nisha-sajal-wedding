begin;

create table public.nisha_sajal_rsvps (
  id uuid primary key,
  created_at timestamptz not null default now(),
  primary_name text not null,
  named_guests integer not null check (named_guests between 1 and 100),
  attending_guests integer not null check (attending_guests between 0 and named_guests),
  additional_guests integer not null check (additional_guests between 0 and named_guests - 1),
  song_request text not null default '' check (char_length(song_request) <= 2000),
  payload_hash text not null
);

create table public.nisha_sajal_rsvp_guests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.nisha_sajal_rsvps(id) on delete cascade,
  guest_order integer not null check (guest_order between 1 and 100),
  full_name text not null check (char_length(full_name) between 1 and 200),
  attending boolean not null,
  events text[] not null,
  unique (submission_id, guest_order),
  check (events <@ array['haldi', 'sangeet', 'wedding']::text[]),
  check ((attending and cardinality(events) between 1 and 3) or (not attending and cardinality(events) = 0))
);

alter table public.nisha_sajal_rsvps enable row level security;
alter table public.nisha_sajal_rsvp_guests enable row level security;
revoke all on public.nisha_sajal_rsvps, public.nisha_sajal_rsvp_guests from public, anon, authenticated;
grant all on public.nisha_sajal_rsvps, public.nisha_sajal_rsvp_guests to service_role;

-- No public table policies: the validated submission function is the only guest entry point.
create function public.submit_nisha_sajal_rsvp(
  p_submission_id uuid,
  p_guests jsonb,
  p_song_request text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest jsonb;
  clean_name text;
  name_key text;
  seen_names text[] := '{}';
  event_names text[];
  is_attending boolean;
  clean_guests jsonb := '[]'::jsonb;
  clean_song text;
  request_hash text;
  existing_hash text;
  inserted_id uuid;
  guest_index integer := 0;
  attendee_count integer := 0;
  additional_count integer := 0;
begin
  if p_submission_id is null or jsonb_typeof(p_guests) is distinct from 'array'
     or jsonb_array_length(p_guests) not between 1 and 100
     or p_song_request is null or char_length(p_song_request) > 2000 then
    raise exception using errcode = '22023', message = 'Invalid RSVP';
  end if;
  clean_song := btrim(p_song_request);
  for guest in select value from jsonb_array_elements(p_guests) loop
    guest_index := guest_index + 1;
    if jsonb_typeof(guest) is distinct from 'object'
       or jsonb_typeof(guest->'name') is distinct from 'string'
       or jsonb_typeof(guest->'attending') is distinct from 'boolean'
       or jsonb_typeof(guest->'events') is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Invalid guest';
    end if;
    clean_name := btrim(regexp_replace(normalize(guest->>'name', NFKC), '\s+', ' ', 'g'));
    if char_length(clean_name) not between 1 and 200 or clean_name ~ '[[:cntrl:]]' then
      raise exception using errcode = '22023', message = 'Invalid guest name';
    end if;
    name_key := lower(clean_name);
    if name_key = any(seen_names) then
      raise exception using errcode = '22023', message = 'Repeated guest name';
    end if;
    seen_names := array_append(seen_names, name_key);
    is_attending := (guest->>'attending')::boolean;
    if exists (select 1 from jsonb_array_elements(guest->'events') as e(value)
               where jsonb_typeof(e.value) <> 'string' or e.value #>> '{}' not in ('haldi', 'sangeet', 'wedding')) then
      raise exception using errcode = '22023', message = 'Invalid event';
    end if;
    select coalesce(array_agg(e order by array_position(array['haldi', 'sangeet', 'wedding'], e)), '{}'::text[])
      into event_names from (select distinct jsonb_array_elements_text(guest->'events') as e) as selected;
    if cardinality(event_names) <> jsonb_array_length(guest->'events')
       or (is_attending and cardinality(event_names) = 0)
       or (not is_attending and cardinality(event_names) <> 0) then
      raise exception using errcode = '22023', message = 'Invalid event choices';
    end if;
    if is_attending then
      attendee_count := attendee_count + 1;
      if guest_index > 1 then additional_count := additional_count + 1; end if;
    end if;
    clean_guests := clean_guests || jsonb_build_array(jsonb_build_object('name', clean_name, 'attending', is_attending, 'events', to_jsonb(event_names)));
  end loop;

  request_hash := encode(sha256(convert_to(jsonb_build_object('guests', clean_guests, 'song', clean_song)::text, 'UTF8')), 'hex');
  insert into public.nisha_sajal_rsvps (id, primary_name, named_guests, attending_guests, additional_guests, song_request, payload_hash)
    values (p_submission_id, clean_guests->0->>'name', jsonb_array_length(clean_guests), attendee_count, additional_count, clean_song, request_hash)
    on conflict (id) do nothing returning id into inserted_id;
  if inserted_id is null then
    select payload_hash into existing_hash from public.nisha_sajal_rsvps where id = p_submission_id;
    if existing_hash is distinct from request_hash then
      raise exception using errcode = '22023', message = 'This reply ID is already in use';
    end if;
    return jsonb_build_object('ok', true, 'submission_id', p_submission_id);
  end if;

  insert into public.nisha_sajal_rsvp_guests (submission_id, guest_order, full_name, attending, events)
    select p_submission_id, ordinality, value->>'name', (value->>'attending')::boolean,
      array(select jsonb_array_elements_text(value->'events'))
    from jsonb_array_elements(clean_guests) with ordinality;
  return jsonb_build_object('ok', true, 'submission_id', p_submission_id);
end;
$$;
revoke all on function public.submit_nisha_sajal_rsvp(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_nisha_sajal_rsvp(uuid, jsonb, text) to anon, authenticated, service_role;

-- Organizer-only totals; the view inherits the underlying tables' access rules.
create view public.nisha_sajal_event_counts with (security_invoker = true) as
select e.event, count(g.id)::integer as attending_guests
from unnest(array['haldi', 'sangeet', 'wedding']) as e(event)
left join public.nisha_sajal_rsvp_guests g on e.event = any(g.events)
group by e.event;
revoke all on public.nisha_sajal_event_counts from public, anon, authenticated;
grant select on public.nisha_sajal_event_counts to service_role;

notify pgrst, 'reload schema';
commit;
