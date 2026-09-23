begin;
alter table public.nisha_sajal_rsvps
  add column contact_email text,
  add column email_status text not null default 'pending' check (email_status in ('pending', 'sending', 'sent', 'failed')),
  add column email_sent_at timestamptz,
  add column email_provider_id text,
  add column email_attempted_at timestamptz;

-- Keep the original validated guest writer private behind the email-aware entry point.
alter function public.submit_nisha_sajal_rsvp(uuid, jsonb, text) rename to save_nisha_sajal_guests;
revoke all on function public.save_nisha_sajal_guests(uuid, jsonb, text) from public, anon, authenticated;

create function public.submit_nisha_sajal_rsvp(
  p_submission_id uuid, p_guests jsonb, p_email text, p_song_request text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; clean_email text; saved_email text;
begin
  clean_email := lower(btrim(p_email));
  if clean_email is null or char_length(clean_email) > 254 or clean_email ~ '[,;<>()":]' or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid email address';
  end if;
  result := public.save_nisha_sajal_guests(p_submission_id, p_guests, p_song_request);
  select contact_email into saved_email from public.nisha_sajal_rsvps where id=p_submission_id for update;
  if saved_email is not null and saved_email <> clean_email then
    raise exception using errcode = '22023', message = 'This reply ID is already in use';
  end if;
  update public.nisha_sajal_rsvps set contact_email=clean_email where id=p_submission_id and contact_email is null;
  return result;
end $$;
revoke all on function public.submit_nisha_sajal_rsvp(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.submit_nisha_sajal_rsvp(uuid, jsonb, text, text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
