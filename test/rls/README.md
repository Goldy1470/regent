# RLS tests (SQL level) — manual run

Unit tests can't exercise row-level security, so the policies live here as SQL that asserts
the security contract directly. **Status: written, not yet executed** — this working copy has
no live Supabase project. Run before selling to anyone.

## Where to run

With the Supabase CLI local stack (can also work against a throwaway hosted project for the
sections that don't touch `auth.users`):

```bash
supabase start                       # local stack
supabase db reset                    # applies ./supabase/schema.sql fresh
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f test/rls/rls-manual.sql
```

Prints `PASS:` / `FAIL:` lines; exits non-zero only for hard config issues (psql semantics —
grep the output for FAIL).

Note: hosted Supabase SQL editor cannot run it because it writes test users into
`auth.users` (hosted instances forbid `security definer`-free catalog writes through SQL).

## What it asserts (the contract)

1. authenticated/anon have **no** write on `entitlements` (grants revoked, no policy).
2. authenticated can **read own** entitlements row; not another user's.
3. Client writes never move money: inserting/updating `fee_anomalies` with somebody else's
   `owner` is impossible; `recovered_amount` changes only via the RPC.
4. `recover_fee` raises `not your fee row` for the wrong owner and returns the stored delta
   for the right one, bumping `entitlements.recovered_lifetime` exactly once (idempotent on
   the fee row's status).
5. `webhook_events` is server-only (no grants to authenticated/anon).
6. `profiles` exposes only user-editable columns: owner can update `full_name`, cannot touch
   another user's row.
