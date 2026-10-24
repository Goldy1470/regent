-- Regent AI — Supabase schema
-- Run in Supabase SQL Editor (creates tables, RLS, and profile trigger)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text not null default 'Founder',
  plan text not null default 'free',
  dodo_customer_id text,
  dodo_subscription_id text,
  subscription_status text not null default 'free',
  recovered_lifetime numeric not null default 0,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  name text not null,
  tiktok_shop_id text not null unique,
  region text not null default 'US',
  mode text not null default 'demo',
  monthly_gmv numeric not null default 0,
  return_rate numeric not null default 0,
  suspension_risk int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_scans (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  title text not null,
  category text not null default 'General',
  input jsonb not null default '{}',
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

create table if not exists public.fee_anomalies (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops on delete cascade,
  owner uuid not null references auth.users on delete cascade,
  order_id text not null,
  fee_type text not null,
  expected numeric not null,
  charged numeric not null,
  delta numeric not null,
  status text not null default 'open',
  explanation text,
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

-- Row level security: each user owns exactly their rows
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.listing_scans enable row level security;
alter table public.alerts enable row level security;
alter table public.return_cases enable row level security;
alter table public.fee_anomalies enable row level security;
alter table public.sfrr_products enable row level security;
alter table public.recovery_events enable row level security;

create policy "profiles owner" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "shops owner" on public.shops for all using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "scans owner" on public.listing_scans for all using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "alerts owner" on public.alerts for all using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "returns owner" on public.return_cases for all using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "fees owner" on public.fee_anomalies for all using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "sfrr owner" on public.sfrr_products for all using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "recovery owner" on public.recovery_events for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Founder')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
