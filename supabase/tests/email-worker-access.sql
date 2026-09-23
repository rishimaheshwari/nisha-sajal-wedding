-- Private queue test. All fixtures, worker credentials and state changes roll back.
begin;
insert into public.nisha_sajal_email_worker(singleton,key_hash,enabled)
values(true,encode(sha256(convert_to(repeat('test-only-',8),'UTF8')),'hex'),true)
on conflict(singleton) do update set key_hash=excluded.key_hash,enabled=true;
set local role anon;
do $$
declare
 id uuid := 'e36a57e5-22bc-4c87-98f6-fba85e612115';
 guests jsonb := '[{"name":"Queue QA Guest","attending":true,"events":["haldi","wedding"]}]';
begin
 begin perform * from public.nisha_sajal_email_worker; raise exception 'Worker secret readable'; exception when insufficient_privilege then null; end;
 begin perform public.claim_nisha_sajal_emails('wrong-key',1); raise exception 'Unauthorized queue read'; exception when insufficient_privilege then null; end;
 begin perform public.complete_nisha_sajal_email('wrong-key',id,id,true); raise exception 'Unauthorized completion'; exception when insufficient_privilege then null; end;
 begin perform public.save_nisha_sajal_guests(id,guests,''); raise exception 'Private writer exposed'; exception when insufficient_privilege then null; end;
 begin perform public.submit_nisha_sajal_rsvp(id,guests,'a@example.com,b@example.com',''); raise exception 'Multiple email recipients accepted'; exception when invalid_parameter_value then null; end;
 perform public.submit_nisha_sajal_rsvp(id,guests,'queue-qa@example.com','');
 begin perform public.submit_nisha_sajal_rsvp(id,guests,'changed@example.com',''); raise exception 'Email changed on replay'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.nisha_sajal_rsvps set created_at='1900-01-01' where id='e36a57e5-22bc-4c87-98f6-fba85e612115';
set local role anon;
do $$
declare jobs jsonb; job jsonb; token uuid; id uuid := 'e36a57e5-22bc-4c87-98f6-fba85e612115';
begin
 if public.claim_nisha_sajal_emails(repeat('test-only-',8),0) <> '[]'::jsonb then raise exception 'Connection check claimed mail'; end if;
 jobs := public.claim_nisha_sajal_emails(repeat('test-only-',8),1);
 job := jobs->0;
 if job->>'id' <> id::text or job->>'email' <> 'queue-qa@example.com' or job->'guests'->0->>'name' <> 'Queue QA Guest' then raise exception 'Wrong queue job'; end if;
 token := (job->>'claim_token')::uuid;
 begin perform public.complete_nisha_sajal_email(repeat('test-only-',8),id,id,true); raise exception 'Invalid claim accepted'; exception when invalid_parameter_value then null; end;
 perform public.complete_nisha_sajal_email(repeat('test-only-',8),id,token,true);
 begin perform public.complete_nisha_sajal_email(repeat('test-only-',8),id,token,true); raise exception 'Completion replay accepted'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.nisha_sajal_rsvps where id='e36a57e5-22bc-4c87-98f6-fba85e612115' and email_status='sent' and email_attempts=1 and email_sent_at is not null) then raise exception 'Delivery status not saved'; end if;
end $$;
rollback;
select 'PASS: queue authentication, private access, email validation, claim token and completion. No emails sent; fixtures rolled back.' as result;
