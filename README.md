# Regent

**Regent protects TikTok Shop sellers' revenue.** Upload last month's settlement export and
Regent recomputes every fee against a versioned policy rate card — referral, refund admin,
return labels, shipping — and shows exactly where TikTok charged more than policy says it
should, with the evidence to dispute it. Plus Listing Guard (word-boundary claims scanner) and
an Account Health tracker with human-reviewed appeal drafts.

> One AI agent that fights every fight TikTok picks. In v1: evidence, never promises —
> no scraping, no credential collection, no success fee.

<p>
  <img alt="npm test" src="https://img.shields.io/badge/tests-29%20passing-brightgreen" />
  <img alt="CI" src="https://img.shields.io/badge/CI-GitHub_Actions-blue" />
  <img alt="engine" src="https://img.shields.io/badge/Next.js-14-black" />
</p>

## The v1 wedge

| | Feature | Entry |
|---|---|---|
| A | **Listing Guard** — versioned claims corpus (word-boundary regexes; LLM as advisory layer). Risk score, offending phrase, rewrite. | `/app/scan` |
| B | **Leak Audit** — CSV/XLSX settlement upload → column mapping → fee recompute → overcharge evidence with policy citations + "how to dispute" note. | `/app/audit` → evidence in `/app/fees` |
| C | **Account Health** — score, violations, fix-first list; appeal drafts always behind a review gate. | `/app/violations`, `/app/dashboard` |

Non-goals in v1: return-fraud scoring, SFRR guardian, buyer blacklists, creator tools,
success-fee billing. The remaining demo pages are labeled **DEMO** and never mix with real
uploads (`shops.mode` + upload-only `audit_imports`).

## Pricing (v3, hypothesis under test)

| Plan | Price | What you get |
|---|---|---|
| **Free** | $0 | 1 Leak Audit + 5 listing scans / mo, health tracker — no card |
| **Starter** | $29/mo · $290/yr | unlimited scans, 30 audits/mo, appeal drafts, 1 shop |
| **Growth** | $59/mo · $590/yr | 3 shops, weekly auto-audit + alerts, priority evidence packs |

Annual = 2 months free, separate Dodo SKUs (`DODO_PRODUCT_*_ANNUAL`). **0% success fee in v1.**
Billing runs on [Dodo Payments](https://dodopayments.com) (checkout, hosted customer portal,
dunning emails surfaced as `past_due`).

## Policy knowledge is versioned data

`lib/policy/rate-card.ts` holds dated snapshots (`US-2026-08`: referral 6%, refund admin =
20% of the refunded item's referral fee capped at $5/SKU; `US-2026-07`: referral 8%).
`policyForDate(settle_date)` picks the right card per row, so July's export is audited under
July's card. Every anomaly carries a citation naming the version + rule. Update process and
changelog: **[docs/policy-versions.md](docs/policy-versions.md)**.

## Quickstart

```bash
npm install

# 1) Supabase: create a project, then run supabase/schema.sql in the SQL editor
#    (one file, idempotent: tables + RLS + recovery RPCs + signup trigger)

# 2) envs
cp .env.example .env.local   # fill it in (checklist inside)

# 3) run
npm run dev                  # http://localhost:3000
```

The app is mock/environment safe: with no Supabase envs, pages render demo data and labeled
placeholders; checkout and webhooks require real envs and report missing config inline.

## Tests & CI

```bash
npm test          # vitest: rules corpus, rate card math, parsers, mapping, webhook patch mapping, plan caps
npm run typecheck # tsc --noEmit
npm run lint
```

CI (`.github/workflows/ci.yml`) runs typecheck → lint → test → build on every push/PR.
Test fixture: `test/fixtures/settlement-us.csv` locks the engine dollars ($21.58 leaked:
Aug-6% referral overcharge of $2.00, refund-admin over-cap $8.08, duplicate shipping $4.00,
buyer-remorse label $7.50).

RLS policy tests are SQL-level and need a live database — see `test/rls/`.
**They have not been executed against a real project yet** (no Supabase env configured in
this working copy).

## Security model (read before touching billing)

- `profiles` = user-editable columns only. Plan/subscription/`recovered_lifetime` live in the
  `entitlements` table; client writes are revoked (grants + no RLS write policies); reads are
  RLS-scoped to own row.
- Service-role client (`lib/supabase/admin.ts`) is `"server-only"`; the key has no
  `NEXT_PUBLIC_` prefix.
- Webhook (`/api/dodo/webhook`): signature always verified when `DODO_WEBHOOK_KEY` exists and
  **production fails closed without it**; idempotent via `webhook_events` (standardwebhooks
  `webhook-id`); unresolved events free their id so Dodo's retry can resolve later.
- Recovery moves money only through SECURITY DEFINER RPCs (`recover_fee`, `recover_return`)
  that read amounts from stored rows — request bodies can't assert amounts.
- One entitlements helper (`lib/entitlements.ts`) gates every metered route; usage is counted
  head-row per YYYY-MM from the tables themselves.
- All mutating API inputs zod-validated; AI routes rate-limited; funnel events carry no PII.

## Deployment

Full steps: **[docs/launch-checklist.md](docs/launch-checklist.md)** (supabase schema, env
checklist, Dodo products/webhook/portal validation, funnel walk, live-mode switches).

Short version: Supabase (schema + keys) → Vercel (import repo, set envs) → Dodo (products +
webhook) → walk the funnel with a test account → flip to live mode.

## Docs

- [docs/plan.md](docs/plan.md) — wedge, assumptions, risks (incl. TikTok ToS/API), pivot rule
- [docs/research.md](docs/research.md) — 10 design-partner script + 30-day scoreboard
- [docs/policy-versions.md](docs/policy-versions.md) — update the rate card correctly
- [docs/launch-checklist.md](docs/launch-checklist.md) — deploy + env checklist
- [test/rls/](test/rls) — RLS test SQL (manual run)

## Status / what is *not* verified yet

- RLS policy SQL written but not executed against a live Supabase project.
- Webhook signature + `product_events` verified only by unit logic, not against Dodo's live API.
- TikTok OAuth ingestion is **phase 2** (design partners); CSV/XLSX ingestion is the shipped path.
