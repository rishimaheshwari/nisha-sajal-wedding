-- Disposable transaction: validates real database writes without leaving test replies.
begin;
set local role anon;
do $$
declare
  test_id uuid := 'f14ee6a0-4b28-4b50-9423-f056b7f5e191';
  guests jsonb := '[{"name":"QA Guest Alpha","attending":true,"events":["wedding","haldi"]},{"name":"QA Guest Beta","attending":true,"events":["wedding"]},{"name":"QA Guest Gamma","attending":false,"events":[]}]';
  invalid_guests jsonb;
  result jsonb;
begin
  result := public.submit_nisha_sajal_rsvp(test_id, guests, 'qa@example.com', 'Database transaction test');
  if result->>'ok' <> 'true' then raise exception 'Valid RSVP failed'; end if;
  result := public.submit_nisha_sajal_rsvp(test_id, guests, 'qa@example.com', 'Database transaction test');
  if result->>'ok' <> 'true' then raise exception 'Idempotent retry failed'; end if;
  begin
    perform public.submit_nisha_sajal_rsvp(test_id, guests, 'qa@example.com', 'Changed content');
    raise exception 'Changed reply reused an ID';
  exception when invalid_parameter_value then null; end;
  for invalid_guests in select value from jsonb_array_elements('[
    [],
    [{"name":"","attending":true,"events":["haldi"]}],
    [{"name":"QA","attending":true,"events":[]}],
    [{"name":"QA","attending":false,"events":["haldi"]}],
    [{"name":"QA","attending":true,"events":["unknown"]}],
    [{"name":"QA","attending":true,"events":["haldi","haldi"]}],
    [{"name":"QA","attending":"Yes","events":["haldi"]}],
    [{"name":"Test Guest","attending":false,"events":[]},{"name":"ＴＥＳＴ  GUEST","attending":false,"events":[]}]
  ]'::jsonb) loop
    begin
      perform public.submit_nisha_sajal_rsvp(gen_random_uuid(), invalid_guests, 'qa@example.com', '');
      raise exception 'Invalid RSVP was accepted';
    exception when invalid_parameter_value then null; end;
  end loop;
  begin perform * from public.nisha_sajal_rsvps; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.nisha_sajal_rsvp_guests; raise exception 'Anonymous guest read allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.nisha_sajal_event_counts; raise exception 'Anonymous counts read allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.nisha_sajal_rsvps(id) values(gen_random_uuid()); raise exception 'Direct insert allowed'; exception when insufficient_privilege then null; end;
  begin update public.nisha_sajal_rsvps set primary_name='Changed' where id=test_id; raise exception 'Anonymous update allowed'; exception when insufficient_privilege then null; end;
  begin delete from public.nisha_sajal_rsvp_guests where submission_id=test_id; raise exception 'Anonymous delete allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform * from public.nisha_sajal_rsvps; raise exception 'Authenticated read allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.nisha_sajal_rsvp_guests; raise exception 'Authenticated guest read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$
declare summary record;
begin
  select * into summary from public.nisha_sajal_rsvps where id='f14ee6a0-4b28-4b50-9423-f056b7f5e191';
  if summary.named_guests <> 3 or summary.attending_guests <> 2 or summary.additional_guests <> 1 then raise exception 'Incorrect party totals'; end if;
  if (select count(*) from public.nisha_sajal_rsvp_guests where submission_id=summary.id) <> 3 then raise exception 'Incorrect guest count'; end if;
  if (select count(*) from public.nisha_sajal_rsvp_guests where submission_id=summary.id and 'haldi'=any(events)) <> 1 then raise exception 'Incorrect Haldi count'; end if;
  if (select count(*) from public.nisha_sajal_rsvp_guests where submission_id=summary.id and 'wedding'=any(events)) <> 2 then raise exception 'Incorrect wedding count'; end if;
end $$;
rollback;
select 'PASS: valid write, per-event counts, retry idempotency, validation and private access. Test rows rolled back.' as result;
