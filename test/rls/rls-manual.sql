-- =====================================================================
-- Regent RLS contract tests (MANUAL — run with psql against the local
-- Supabase stack; see test/rls/README.md). Prints PASS/FAIL per check.
-- Two synthetic users are created; their uuids are fixed and divisible:
--   A = 11111111-1111-1111-1111-111111111111 (owns the data)
--   B = 22222222-2222-2222-2222-222222222222 (the attacker)
-- Run after `supabase db reset` (applies supabase/schema.sql).
-- =====================================================================

\set ON_ERROR_STOP false

-- ---------- bootstrap synthetic users (local CLI only) ----------
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'rls-a@test.local', 'x', now(), now(), now(), '{}'),
       ('22222222-2222-2222-2222-222222222222', 'rls-b@test.local', 'x', now(), now(), now(), '{}')
on conflict (id) do nothing;

-- trigger should have created profiles + entitlements; upsert defensively (service role context here)
insert into public.profiles (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'rls-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'rls-b@test.local')
on conflict (id) do nothing;
insert into public.entitlements (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;
insert into public.shops (owner, name, tiktok_shop_id, mode) values
  ('11111111-1111-1111-1111-111111111111', 'RLS test shop', 'rls-shop-0001', 'demo')
on conflict do nothing;

-- ---------- seed A's fee anomalies as A (fixed ids so later sections can address them) ----------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.fee_anomalies (id, shop_id, owner, order_id, fee_type, expected, charged, delta, citation, status)
values ('44444444-4444-4444-4444-444444444444',
        (select id from public.shops where owner = '11111111-1111-1111-1111-111111111111' limit 1),
        '11111111-1111-1111-1111-111111111111', 'X-RSL-1', 'referral', 6.00, 8.00, 2.00, 'RLS test citation', 'open')
on conflict (id) do nothing;
insert into public.fee_anomalies (id, shop_id, owner, order_id, fee_type, expected, charged, delta, citation, status)
values ('55555555-5555-5555-5555-555555555555',
        (select id from public.shops where owner = '11111111-1111-1111-1111-111111111111' limit 1),
        '11111111-1111-1111-1111-111111111111', 'X-RSL-2', 'shipping', 4.00, 8.00, 4.00, 'RLS test citation', 'open')
on conflict (id) do nothing;
commit;

-- ---------- 1) entitlements: no client writes ----------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.entitlements (id, plan) values
      ('33333333-3333-3333-3333-333333333333', 'growth');
    raise notice 'FAIL  entitlements insert allowed';
  exception when others then
    raise notice 'PASS  entitlements insert denied (%)', sqlerrm;
  end;
  begin
    update public.entitlements set recovered_lifetime = 999999 where id = '11111111-1111-1111-1111-111111111111';
    raise notice 'FAIL  entitlements update allowed';
  exception when others then
    raise notice 'PASS  entitlements update denied';

  end;
end $$;
rollback;

-- ---------- 2) entitlements: owner-scoped read ----------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.entitlements;
  if n = 1 then raise notice 'PASS  entitlements read own only (saw % rows)', n;
  else raise notice 'FAIL  entitlements read expected 1 own row, saw %', n; end if;
end $$;
rollback;

-- ---------- 3) client cannot claim someone else's fees ----------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
do $$
declare affected int;
begin
  update public.fee_anomalies set recovered_amount = 999, status = 'recovered'
    where id = '44444444-4444-4444-4444-444444444444';
  get diagnostics affected = row_count;
  if affected = 0 then raise notice 'PASS  B cannot touch A''s fee anomalies';
  else raise notice 'FAIL  B updated A''s fee row (% rows)', affected; end if;
  begin
    insert into public.fee_anomalies (id, shop_id, owner, order_id, fee_type, expected, charged, delta, citation, status)
    values ('66666666-6666-6666-6666-666666666666',
            (select id from public.shops limit 1), '11111111-1111-1111-1111-111111111111',
            'X-B', 'referral', 1, 1, 1, 'x', 'open');
    raise notice 'FAIL  B could insert a row impersonating A';
  exception when others then
    raise notice 'PASS  forged-owner insert denied (%)', sqlerrm;
  end;
end $$;
rollback;

-- ---------- 4) recover_fee RPC: ownership + idempotency ----------
begin;
set local role authenticated; -- B calls for A's fee
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.recover_fee('44444444-4444-4444-4444-444444444444', 'try');
    raise notice 'FAIL  recover_fee succeeded for non-owner';
  exception when others then
    if sqlerrm like '%not your fee row%' then
      raise notice 'PASS  recover_fee rejects non-owner';
    else
      raise notice 'FAIL  recover_fee wrong error (%)', sqlerrm;
    end if;
  end;
end $$;
rollback;

begin;
set local role authenticated; -- A calls for own fee
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
declare amount numeric; lifetime numeric;
begin
  amount := public.recover_fee('44444444-4444-4444-4444-444444444444', 'ok');
  if amount = 2.00 then raise notice 'PASS  recover_fee returned stored delta (2.00)';
  else raise notice 'FAIL  recover_fee expected 2.00, got %', amount; end if;

  select recovered_lifetime into lifetime from public.entitlements
    where id = '11111111-1111-1111-1111-111111111111';
  if lifetime = 2.00 then raise notice 'PASS  recovered_lifetime bumped server-side';
  else raise notice 'FAIL  recovered_lifetime expected 2.00, got %', lifetime; end if;

  amount := public.recover_fee('44444444-4444-4444-4444-444444444444', 'repeat');
  if amount = 0 then raise notice 'PASS  recover_fee is idempotent (second call → 0)';
  else raise notice 'FAIL  recover_fee second call returned % (expected 0)', amount; end if;
end $$;
rollback;

-- ---------- 5) webhook_events is server-only ----------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.webhook_events (id, event_type) values ('test-evt-1', 'subscription.active');
    raise notice 'FAIL  webhook_events insert allowed for authenticated';
  exception when others then
    raise notice 'PASS  webhook_events write denied';
  end;
end $$;
rollback;

-- ---------- 6) profiles expose only user-editable columns ----------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
declare n int;
begin
  update public.profiles set full_name = 'RLS A2' where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  if n = 1 then raise notice 'PASS  profile self-update works';
  else raise notice 'FAIL  profile self-update touched % rows', n; end if;

  select count(*) into n from public.profiles;
  if n = 1 then
    raise notice 'PASS  profiles read own only';
  else
    raise notice 'FAIL  profiles read saw % rows (expected 1)', n;
  end if;
end $$;
rollback;

-- ---------- cleanup ----------
delete from public.fee_anomalies where id in ('44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666');
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222');
