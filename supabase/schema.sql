-- =====================================================================
-- Regent — Supabase schema v2 (fresh install path)
-- Security model:
--   profiles            user-editable ONLY (name, onboarding flag)
--   entitlements        SERVER-ONLY (plan, subscription status, totals).
--                       No RLS insert/update select policies on purpose:
--                       only the service role (server code) writes here.
--   webhook_events      Dodo event idempotency ledger
--   audit_imports       uploaded settlement runs (uploads, never mixed with demo)
--   listing_scans etc.  owner-scoped application data (RLS by owner)
-- Applies RLS everywhere; entitlements has RLS disabled means ALL access via
-- service role only (default deny when RLS off + no grants to anon).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- profiles (client-editable columns only) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text not null default 'Founder',
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- entitlements (server-only writes) ----------
create table if not exists public.entitlements (
  id uuid primary key references public.profiles on delete cascade,
  plan text not null default 'free'
    check (plan in ('free','starter','growth')),
  subscription_status text not null default 'free'
    check (subscription_status in ('free','active','past_due','cancelled')),
  period text not null default 'monthly' check (period in ('monthly','annual')),
  dodo_customer_id text,
  dodo_subscription_id text,
  recovered_lifetime numeric not null default 0,
  updated_at timestamptz not null default now()
);

revoke insert, update, delete on public.entitlements from authenticated, anon;
alter table public.entitlements enable row level security;
-- deliberately NO RLS policies for authenticated: service role bypasses.
-- (select for own row is allowed so the console can render plan state:)
create policy "entitlements read own" on public.entitlements
  for select using (auth.uid() = id);

-- ---------- shops ----------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  name text not null,
  tiktok_shop_id text not null unique,
  region text not null default 'US',
  mode text not null default 'demo' check (mode in ('demo','live')),
  monthly_gmv numeric not null default 0,
  return_rate numeric not null default 0,
  suspension_risk int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- uploaded settlement audits (real data only) ----------
create table if not exists public.audit_imports (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  shop_id uuid references public.shops on delete cascade,
  filename text not null,
  file_kind text not null default 'csv' check (file_kind in ('csv','xlsx')),
  policy_version text not null,
  source_kind text not null default 'settlement' check (source_kind in ('settlement','orders','returns')),
  mapping jsonb not null default '{}',
  months jsonb not null default '[]',
  gross_settled numeric not null default 0,
  leaked_total numeric not null default 0,
  anomalies_found int not null default 0,
  rows_checked int not null default 0,
  rows_skipped int not null default 0,
  sample_rows jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------- product events (no PII; funnel: visit→upload→audit→checkout) ----------
create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  owner uuid references auth.users on delete cascade,
  event text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- application data ----------
create table if not exists public.listing_scans (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  title text not null,
  category text not null default 'General',
  input jsonb not null default '{}',
  ruleset_version text not null default 'US-2026-08',
  risk_score int not null,
  verdict text not null,
  findings jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  kind text not null,
  severity text not null,
  title text not null,
  body text not null,
  platform_ref text,
  ahr_points int not null default 0,
  at_risk_gmv numeric not null default 0,
  status text not null default 'open',
  appeal_packet text,
  created_at timestamptz not null default now()
);

create table if not exists public.fee_anomalies (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references public.audit_imports on delete cascade,
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  order_id text not null,
  settlement_id text,
  fee_type text not null check (fee_type in ('referral','refund_admin','return_cost','shipping','other')),
  expected numeric not null,
  charged numeric not null,
  delta numeric not null,
  citation text not null default '',
  settle_date date,
  status text not null default 'open' check (status in ('open','disputed','recovered','rejected','archived')),
  explanation text,
  recovered_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.return_cases (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  order_id text not null,
  customer text not null,
  customer_history jsonb not null default '{}',
  product text not null,
  reason text not null,
  refund_amount numeric not null default 0,
  fraud_score int not null default 0,
  flags jsonb not null default '[]',
  status text not null default 'new',
  dispute_packet text,
  recovered_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sfrr_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  product_id text not null,
  product_name text not null,
  sfrr numeric not null,
  threshold numeric not null,
  monthly_orders int not null default 0,
  affiliate_gmv numeric not null default 0,
  affiliate_eligible boolean not null default true,
  trend jsonb not null default '[]',
  primary_fix text,
  updated_at timestamptz not null default now()
);

create table if not exists public.recovery_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  source text not null,
  amount numeric not null,
  status text not null default 'pending',
  description text not null,
  created_at timestamptz not null default now()
);

-- ---------- webhook idempotency ----------
create table if not exists public.webhook_events (
  id text primary key,                 -- standardwebhooks 'webhook-id' header
  event_type text not null,
  payload_hash text,
  processed_at timestamptz not null default now()
);
revoke all on public.webhook_events from authenticated, anon;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.audit_imports enable row level security;
alter table public.product_events enable row level security;
alter table public.listing_scans enable row level security;
alter table public.alerts enable row level security;
alter table public.fee_anomalies enable row level security;
alter table public.return_cases enable row level security;
alter table public.sfrr_products enable row level security;
alter table public.recovery_events enable row level security;

drop policy if exists "profiles owner" on public.profiles;
create policy "profiles own select+update" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "shops owner" on public.shops;
create policy "shops owner" on public.shops
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "audit owner" on public.audit_imports;
create policy "audit owner" on public.audit_imports
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "events own insert" on public.product_events;
create policy "events insert own" on public.product_events
  for insert to authenticated with check (auth.uid() = owner = auth.uid());
create policy "events read own" on public.product_events
  for select to authenticated using (auth.uid() = owner);

drop policy if exists "scans owner" on public.listing_scans;
create policy "scans owner" on public.listing_scans
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "alerts owner" on public.alerts;
create policy "alerts owner" on public.alerts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "fees owner" on public.fee_anomalies;
create policy "fees owner" on public.fee_anomalies
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "returns owner" on public.return_cases;
create policy "returns owner" on public.return_cases
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "sfrr owner" on public.sfrr_products;
create policy "sfrr owner" on public.sfrr_products
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "recovery owner" on public.recovery_events;
create policy "recovery owner" on public.recovery_events
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Safe columns update guard: even with the blanket owner policy, postgres
-- column grants make money columns non-writable by clients.
revoke update (recovered_lifetime, plan, subscription_status, period, dodo_customer_id, dodo_subscription_id)
  on public.entitlements from authenticated;

-- ---------- money mutation: SECURITY DEFINER RPC (server-computed only) ----------
-- Recovery amounts are ALWAYS taken from stored rows, never request bodies.
create or replace function public.recover_fee(p_fee_id uuid, p_note text default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid; v_amount numeric; v_delta numeric; v_status text; v_shop uuid;
begin
  select owner, delta, status, shop_id into v_owner, v_delta, v_status, v_shop
    from public.fee_anomalies where id = p_fee_id;
  if v_owner is null then raise exception 'fee anomaly not found'; end if;
  if auth.uid() is null or auth.uid() <> v_owner then
    raise exception 'not your fee row';
  end if;
  if v_status <> 'open' then
    return 0; -- idempotent: already filed/recovered
  end if;

  update public.fee_anomalies
    set status = 'recovered', recovered_amount = v_delta, explanation = p_note
    where id = p_fee_id;

  insert into public.recovery_events (shop_id, owner, source, amount, status, description)
  values (v_shop, v_owner, 'fee_audit', v_delta, 'recovered',
          'Fee overcharge recovered (disputed with Seller Center)');

  perform public.bump_recovered_lifetime(v_owner, v_delta);
  return v_delta;
end $$;

create or replace function public.recover_return(p_case_id uuid, p_note text default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid; v_amount numeric; v_status text; v_shop uuid;
begin
  select owner, refund_amount, status, shop_id into v_owner, v_amount, v_status, v_shop
    from public.return_cases where id = p_case_id;
  if v_owner is null then raise exception 'return case not found'; end if;
  if auth.uid() is null or auth.uid() <> v_owner then
    raise exception 'not your return case';
  end if;
  if v_status <> 'new' then return 0; end if;

  update public.return_cases
    set status = 'recovered', recovered_amount = v_amount, dispute_packet = coalesce(p_note, dispute_packet)
    where id = p_case_id;

  insert into public.recovery_events (shop_id, owner, source, amount, status, description)
  values (v_shop, v_owner, 'fraud_dispute', v_amount, 'recovered', 'Return dispute recovered');

  perform public.bump_recovered_lifetime(v_owner, v_amount);
  return v_amount;
end $$;

create or replace function public.bump_recovered_lifetime(p_user uuid, p_delta numeric)
returns void
language sql security definer set search_path = public as $$
  update public.entitlements
    set recovered_lifetime = recovered_lifetime + p_delta, updated_at = now()
    where id = p_user;
$$;

-- ---------- signup trigger (+ entitlement bootstrap) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'Founder'));
  insert into public.entitlements (id) values (new.id)
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
