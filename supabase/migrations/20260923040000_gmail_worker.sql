begin;
alter table public.nisha_sajal_rsvps add column email_attempts integer not null default 0,
 add column email_claim_token uuid, add column email_last_error text;
create table public.nisha_sajal_email_worker (
 singleton boolean primary key default true check (singleton),
 key_hash text not null check (char_length(key_hash)=64), enabled boolean not null default false
);
alter table public.nisha_sajal_email_worker enable row level security;
revoke all on public.nisha_sajal_email_worker from public, anon, authenticated;
grant all on public.nisha_sajal_email_worker to service_role;

create function public.claim_nisha_sajal_emails(p_worker_key text, p_limit integer default 10)
returns jsonb language plpgsql security definer set search_path='' as $$
declare reply record; batch jsonb := '[]'::jsonb; names jsonb; token uuid; claimed_emails text[] := '{}';
begin
 if p_worker_key is null or char_length(p_worker_key)<40 or not exists (
   select 1 from public.nisha_sajal_email_worker where singleton and enabled and key_hash=encode(sha256(convert_to(p_worker_key,'UTF8')),'hex')
 ) then raise exception using errcode='42501', message='Email worker unauthorized'; end if;
 if p_limit is null or p_limit not between 0 and 10 then raise exception using errcode='22023', message='Invalid batch size'; end if;
 if p_limit=0 then return batch; end if;
 for reply in
   select r.* from public.nisha_sajal_rsvps r
   where r.contact_email is not null and r.email_status <> 'sent' and r.email_attempts<5
     and (r.email_attempted_at is null or r.email_attempted_at<now()-interval '15 minutes')
     and (select count(*) from public.nisha_sajal_rsvps s where s.contact_email=r.contact_email and s.email_status='sent' and s.email_sent_at>now()-interval '24 hours')<3
   order by r.created_at limit 100 for update of r skip locked
 loop
   if reply.contact_email=any(claimed_emails) then continue; end if;
   token := gen_random_uuid();
   update public.nisha_sajal_rsvps set email_status='sending', email_attempted_at=now(), email_attempts=email_attempts+1,
     email_claim_token=token, email_last_error=null where id=reply.id;
   select jsonb_agg(jsonb_build_object('name',full_name,'attending',attending,'events',events) order by guest_order)
     into names from public.nisha_sajal_rsvp_guests where submission_id=reply.id;
   batch := batch || jsonb_build_array(jsonb_build_object('id',reply.id,'email',reply.contact_email,'claim_token',token,'guests',names));
   claimed_emails := array_append(claimed_emails,reply.contact_email);
   exit when jsonb_array_length(batch)>=p_limit;
 end loop;
 return batch;
end $$;
revoke all on function public.claim_nisha_sajal_emails(text,integer) from public,anon,authenticated;
grant execute on function public.claim_nisha_sajal_emails(text,integer) to anon,service_role;

create function public.complete_nisha_sajal_email(p_worker_key text,p_submission_id uuid,p_claim_token uuid,p_success boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_worker_key is null or char_length(p_worker_key)<40 or not exists (
   select 1 from public.nisha_sajal_email_worker where singleton and enabled and key_hash=encode(sha256(convert_to(p_worker_key,'UTF8')),'hex')
 ) then raise exception using errcode='42501',message='Email worker unauthorized'; end if;
 if p_success is null then raise exception using errcode='22023',message='Invalid email result'; end if;
 update public.nisha_sajal_rsvps set email_status=case when p_success then 'sent' else 'failed' end,
   email_sent_at=case when p_success then now() else null end,
   email_provider_id=case when p_success then 'gmail-apps-script' else null end,
   email_last_error=case when p_success then null else 'Gmail delivery attempt failed' end
 where id=p_submission_id and email_claim_token=p_claim_token and email_status='sending';
 if not found then raise exception using errcode='22023',message='Email claim expired'; end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.complete_nisha_sajal_email(text,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.complete_nisha_sajal_email(text,uuid,uuid,boolean) to anon,service_role;
notify pgrst,'reload schema';
commit;
