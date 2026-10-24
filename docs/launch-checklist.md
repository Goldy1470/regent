# Launch checklist

## 1. Database (Supabase) — one time

- [ ] Create project (us-east or nearest to sellers).
- [ ] Auth → enable Email provider; set redirect URLs for the deployed domain.
- [ ] SQL editor → run `supabase/schema.sql` **in full** (idempotent; creates tables, RLS,
      SECURITY DEFINER RPCs, signup trigger).
- [ ] Confirm `handle_new_user` trigger exists; create a test account and verify a row
      appeared in `profiles` + `entitlements` (plan `free`).
- [ ] Copy `Project URL`, `anon key`, `service_role key` (Settings → API).

## 2. Environment variables (Vercel → Project → Settings → Env)

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (server) | never `NEXT_PUBLIC_`; webhooks + entitlements fail without it |
| `DODO_MODE` | ✅ | `test` first, `live` at launch |
| `DODO_API_KEY` | ✅ | from Dodo |
| `DODO_WEBHOOK_KEY` | ✅ live | **production fails closed without it** (500 on all webhook calls) |
| `DODO_PRODUCT_STARTER` / `_STARTER_ANNUAL` / `_GROWTH` / `_GROWTH_ANNUAL` | ✅ | four product IDs |
| `OPENAI_API_KEY` | optional | offline engine is the fallback; LLM improves drafts |
| `NEXT_PUBLIC_APP_URL` | ✅ live | e.g. `https://regent.example` — used for checkout return URLs |

## 3. Dodo Payments

- [ ] Account in Test Mode; create 4 products exactly at $29 / $290 / $59 / $590.
- [ ] Webhook endpoint → `https://<domain>/api/dodo/webhook`, events: `subscription.active`,
      `subscription.updated`, `subscription.cancelled`, `subscription.expired`,
      `subscription.payment_failed`, `payment.succeeded`; copy the signing key into
      `DODO_WEBHOOK_KEY`.
- [ ] Sign up with the test account → checkout → paid → confirm `entitlements.plan` flipped
      via the webhook (Billing page shows active).
- [ ] Cancel in the Dodo portal → confirm `cancelled`.
- [ ] Enable dunning/retry email settings in Dodo (we surface `past_due` from the webhook).

## 4. App correctness (walk the funnel on the prod deploy)

- [ ] Signup → onboarding → dashboard renders with FREE plan labeled.
- [ ] `/app/audit`: upload `test/fixtures/settlement-us.csv` → **$21.58** leaked, 4 anomalies,
      evidence rows appear in `/app/fees` *on the test account* (then delete the test row set),
      audit counted against Free's 1-audit cap.
- [ ] `/app/scan`: benign copy ("Secure closure… pet treats") does NOT flag medical claims;
      "Treats acne in 7 days" DOES flag, with the matched citation.
- [ ] Recovery button on a fee row → `recover_fee` RPC moves status to `recovered` and bumps
      `entitlements.recovered_lifetime` server-side.
- [ ] Free caps: 6th scan and 2nd audit return 402 with upgrade copy.
- [ ] Demo shop labeled DEMO in the shell; no demo rows in `audit_imports`.

## 5. Hygiene

- [ ] `npm run build` green, CI green on `main`.
- [ ] `/shield-icon.svg` loads at the deployed origin (Dodo checkout branding).
- [ ] No `Revenue Shield AI` strings anywhere (search the repo).
- [ ] HTTPS enforced; no PII in logs (check a webhook request end-to-end).

## 6. Live-mode switches (flip in this order)

1. Dodo → Live; create live product IDs; update envs → redeploy.
2. Swap webhook endpoint config to live; verify a real $ subscription end-to-end with your own card.
3. Buy the domain; set `NEXT_PUBLIC_APP_URL`; update Supabase auth redirect URLs.

## 7. Then

- Start design-partner outreach (`docs/research.md`), 10 sellers.
- Watch `product_events` daily for the funnel.
- 30-day gate review → criteria in `docs/plan.md`. Pass keeps the roadmap; fail → pivot memo.
