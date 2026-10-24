# Regent

**The protection layer for TikTok Shop sellers.** Every competitor sells *more sales* (product scouting, creator discovery, profit dashboards). Regent sells **keeping the money you already make**: it watches the four things that quietly eat 20–30% of seller GMV, and actively fights them.

> Metrics sellers post about constantly (r/TikTokshop, Trustpilot, 2025–26): sudden "TT jail" violations with a 180-day AHR-point tail, return-fraud rates of 12–18%, fee charges that are "impossible to amend", and — since Oct 2025 — affiliate access gated on Seller-Fault Return Rate. No tool fights any of this. We do.

## The four shields

| Module | What it does | Revenue motion |
| --- | --- | --- |
| **Violation Shield** | AI scans every draft listing against the TikTok Shop claims corpus *before* it can strike you; auto-drafts appeal packets (AHR points, removals, account-risk reviews) when enforcement still lands. | Reinstated GMV → success fee |
| **Return Fraud Fighter** | Scores every refund claim (buyer claim history, carrier scans, listing evidence), builds the dispute packet, tracks the win. | Refund reversals → success fee |
| **Fee & Margin Auditor** | Reconciles settlement lines vs the published rate card: doubled return-admin fees, wrong referral tiers, phantom surcharges, rounding leaks. | Fee credits → success fee |
| **SFRR Guardian** | Per-product Seller-Fault Return Rate vs the affiliate-eligibility gate, with the concrete fix that pulls SKUs back into the affiliate program. | Keeps ad/revenue channel alive |

**Pricing = subscription + success fee on recovered funds** (Starter $49 + 10%, Scale $149 + 7%, Pro $399 + 5%). We only get paid extra when the seller gets paid — the anti-thesis of flat analytics seats.

## Stack

- **Next.js 14** (App Router, TS, Tailwind)
- **Supabase** (Postgres + Auth + RLS, schema in `supabase/schema.sql`)
- **Dodo Payments** (checkout + webhook subscription lifecycle)
- **OpenAI gpt-4o-mini** for generated packets — with a full offline rule-engine fallback so the app works demo-perfect with zero API keys

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill Supabase URL + anon key (OpenAI / Dodo optional)
```

1. Create a Supabase project → SQL Editor → paste `supabase/schema.sql` → run.
2. Auth -> URL config: add `http://localhost:3000/auth/callback` as redirect URL.
3. `npm run dev` → sign up → onboarding seeds a realistic demo shop → explore all four shields.

**With zero keys configured** the app runs entirely on the built-in engines (deterministic policy scan, template packets, mock settlement reconciliation). Add `OPENAI_API_KEY` to switch packet drafting to GPT-4o-mini. Add Dodo keys (`DODO_MODE=test`, `DODO_API_KEY`, `DODO_PRODUCT_*`, `DODO_WEBHOOK_KEY`) to enable real checkout flow.

## Dodo webhook setup

Point a webhook at `POST /api/dodo/webhook` with: `subscription.active`, `subscription.updated`, `subscription.cancelled`, `subscription.expired`, `subscription.payment_failed`, `payment.succeeded`. Signature (Standard Webhooks) verified with `DODO_WEBHOOK_KEY`. Missing key → unsigned mode for local testing.

## Phase 2 (post-MVP roadmap)

- **Live API mode** via TikTok Shop Open API (`/authorization`, `/product/listing`, `/order`, `/finance/settlement`) behind the same table contracts — demo mode already exercises the whole surface.
- Buyer-fingerprint blacklist shared across shops (network effect moat).
- Appeals-as-a-service agency desk on Pro tier (white-label packet exports + analyst follow-up).
- Escrow-style caption: automatic success-fee invoicing from the ledger via Dodo invoicing API.

## Honest-build notes

- TikTok Shop analytics/GMV numbers elsewhere in the market are scraped estimates; first-party-mode data (your own shop) is exact — that's why this product connects directly instead of scraping.
- AI drafts; humans approve. Refunds, claims and policy decisions always ship with a review step (per platform policy best practice).
