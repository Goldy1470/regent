# Regent — v1 product plan

Paid SaaS for US TikTok Shop sellers ($10k–$300k GMV/mo) who have had a violation or suspect
fees/returns are eating margin. One AI agent that defends revenue: it scans listings, audits
settlements, and tracks account health.

## Wedge (v1 = ONLY these three)

| | Feature | Where |
|---|---|---|
| A | **Listing Guard** — draft listing scan against a versioned claims corpus + LLM; risk score, offending phrases, compliant rewrites | `/app/scan`, `lib/policy/rules.ts` |
| B | **Leak Audit** — upload settlement CSV/XLSX → column mapping → recompute every fee from the versioned rate card → overcharge evidence with citations, "how to dispute" note per line | `/app/audit`, `/app/fees`, `lib/ingest/*` |
| C | **Account Health tracker** — current score, recent violations, plain-language fix-first list; appeal drafts are a *secondary*, human-reviewed feature | `/app/violations`, `/app/dashboard` |

**Non-goals in v1** (do not build until success criteria are met): return-fraud scoring, SFRR
guardian, buyer blacklists, creator tools, success-fee billing. The existing demo pages still
render these from synthetic data, clearly labeled DEMO.

## Assumptions (falsifiable — each one can kill the thesis)

1. **Fees leak ≥ 5× the price.** If the average design-partner leak (overcharges, refund-admin
   cap violations, duplicate shipping, buyer-remorse labels) is under ~$145/mo at Starter, the
   wedge fails. Test: the geometry of the first 10 audits.
2. **Sellers can export settlement files.** Seller Center → Finance → Settlements export works
   for everyone in the ICP. If a shop cannot, do not chase its data.
3. **Manual dispute filing is acceptable in v1.** Evidence per line + a plain-language note.
   Auto-filing needs TikTok OAuth (phase 2). If disputes require API writes, plan again.
4. **The 2026 rate card is right.** Referral 6% (Aug 2026, was 8%), refund admin = 20% of the
   refunded item's referral fee capped at $5/SKU, buyer pays buyer-remorse return shipping.
   Versioned, dated, and cited — never folklore. See `docs/policy-versions.md`.
5. **Dodo Payments covers checkout + portal + dunning.** Fail-closed webhook; `past_due` on
   payment failures; Growth keeps access until period end per Dodo's retention settings.
6. **CSV-first keeps us out of the API review queue.** TikTok Shop Open API access (In-house
   developer → custom app) is a phase-2 design-partner track, not a launch dependency.

## Pricing (hypothesis v3 — test, don't sanctify)

- **Free**: 1 Leak Audit/mo on a real export, 5 Listing Guard scans, health tracker read-only.
  No card. This is the "see what you lost" truth moment.
- **Starter $29/mo** (annual $290): unlimited scans, 30 audits/mo, appeal/dispute drafting, 1 shop.
- **Growth $59/mo** (annual $590): 3 shops, weekly auto-audit + alerts, priority evidence packets.
- **Annual = 2 months free.** Monthly ↔ annual products are separate Dodo SKUs
  (`DODO_PRODUCT_*` + `*_ANNUAL`); the webhook stamps the entitlements period.
- **No success fee in v1.** Flat subscription only; every recovered dollar is the seller's.
  Revisit upside-sharing only after trust exists (30+ days, paying customers).

## Validation plan (run in parallel with the build)

- Landing carries "Upload your settlement file, see what you lost" → signup → `/app/audit`.
- Funnel events (no PII): `signup → upload_started → upload_mapped → audit_viewed →
  checkout_started → portal_opened`, written to `product_events`.
- Recruit 10 design-partner sellers (script + tracker: `docs/research.md`).
- **30-day success criteria**: 10 completed audits, 3 paying customers, average leak ≥ 5× the
  monthly price. **If not met: report why and propose a pivot — do not add features.**

## Risks and mitigations

| Risk | Reality | Mitigation |
|---|---|---|
| **TikTok ToS / API access** | Scraping and credential collection are prohibited; public API review is slow. | CSV/XLSX upload ships first (zero approvals). OAuth = in-house custom app for design partners, least-privilege read scopes, tokens encrypted at rest, audit log. Never scrape. |
| **Rate-card error → false dispute evidence** | Policy changes often and regionally. | Versioned snapshots keyed by settle date; overcharge-only flagging; citations name the version (`US-2026-08`); "approximate, no guarantee" language everywhere; update process in `docs/policy-versions.md`. |
| **Rules corpus false positives** ("secure", pet "treats") | Regulatory regexes are brittle. | Word-boundary regexes, matched-phrase citations, tests lock the known false positives, LLM is advisory over the offline engine (merge favors citations). |
| **Dispute win-rate unknown** | Out of our control, varies by ticket. | We never promise recovery; status fields allow open → disputed → recovered; ledger is evidence, not a bounty. |
| **Dodo webhook outage/misconfig** | Losing a `renewed` event deactivates a paying user. | Fail-closed signature check in prod; idempotency ledger (`webhook_events`) frees the event id if the user can't yet be resolved so Dodo's retry re-resolves; portal link and refresh path documented in Billing. |
| **Money tampering by clients** | The whole product is numbers. | `entitlements` server-only (write grants revoked, service-role writes), recovery via SECURITY DEFINER RPCs reading stored rows (request bodies carry no amounts), ingest stores only server-computed values. |
| **Single-instance rate limiter** | In-memory limiter resets per instance/multi-region. | Acceptable at this traffic; swap store for Upstash before multi-region (noted in `lib/rate-limit.ts`). |
| **Demo/real data mixing** | Trust killer. | `shops.mode` + DEMO labels in shell/audit pages; `audit_imports` is upload-only; demo fixtures never write into audit tables. |

## Security model (non-negotiables, shipped)

- `profiles` = user-editable columns only (name, onboarding flag). Plan/subscription/lifetime
  totals live in `entitlements` — no client insert/update (grants revoked; RLS read-own only).
- Service-role client is server-only (`import "server-only"`), envs are `NEXT_PUBLIC`-free.
- Dodo webhook: signature always verified when `DODO_WEBHOOK_KEY` exists; production fails
  closed without it; idempotent via `webhook_events` (standardwebhooks `webhook-id`).
- All metered routes funnel through **one** helper: `lib/entitlements.ts` (counts head-rowed
  per YYYY-MM; nothing trusts the request).
- AI routes: zod-validated inputs, sliding-window rate limit, findings always carry the rule
  + matched phrase; "review before submitting" is the only filing path.
- RLS everywhere on owner-scoped tables. SQL-level RLS tests in `test/rls/` (manual run —
  see that folder's README; not yet executed against live Supabase).

## Build order as shipped (commits)

1. `chore` hygiene: stray `0` removed, `/shield-icon.svg` added, Dodo branding fixed.
2. `feat(policy+ingest)`: versioned rate card + word-boundary rules corpus; CSV/XLSX parser,
   column mapping, fee-recompute engine; 18 unit tests + realistic fixture.
3. `feat(security+app)`: schema v2 (entitlements/webhook_events/audit_imports/product_events +
   RPCs), service-role split, fail-closed idempotent webhook, entitlements gate, rate limits,
   ingest API + `/app/audit`, pricing v3 everywhere.
4. `test+ci`: webhook patch mapping, plan caps, mapping strictness, CI workflow.
5. Docs + deployment (this and the other files in `/docs`, README, `.env.example`).

## Phase 2 backlog (only after 30-day criteria pass)

TikTok Partner Center OAuth ingestion (custom app, encrypted tokens), weekly auto-audit cron
for Growth (Vercel Cron + `audit_imports`), outbound alert emails, multi-region rate limiting,
return-cost rules per refund-reason refinement, public app review submission.
