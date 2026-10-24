# Design-partner research — 10 sellers, then decide

Goal: validate the wedge *before* feature creep. Track every answer here. The 30-day gate is
**10 completed audits / 3 paying customers / average leak ≥ 5× monthly price** ($145+ at
Starter). If the gate fails, report why and propose a pivot — do not add features.

## Recruiting

Channels: r/TikTokshop threads (answer-free value first), seller Discords, agencies willing to
introduce clients, review profiles of people who bought appeal gigs on Fiverr. Pitch in ≤ 3
sentences, offer the free audit, never promise recovery.

**DM script**

> Building Regent — uploads your Seller Center settlement export and shows what TikTok charged
> above the policy rate card (referral %, refund admin, duplicate shipping, return labels),
> with evidence you can dispute. Free while in design-partner mode. Want me to audit your last
> settlement? Takes one upload, you keep the evidence either way.

**Intake call — the 10 questions**

1. Roughly how much GMV last month? (band it: 10–30k / 30–100k / 100–300k)
2. What went out the door in refunds/returns you didn't think you owed?
3. Name a settlement line from last month you didn't recognize. What turned out to be?
4. Do you know your referral rate right now? For which category?
5. What did your last (or current) violation do to revenue, for how long?
6. Who writes your appeals today — you, an agency, a gig? What did it cost?
7. What did you pay for tooling last month? Which tools, still renewing?
8. If it found $X/mo in overcharges, what's a fair monthly price to prevent it?
   (listen first — then anchor: $29 / $59)
9. Would you upload a settlement CSV monthly? What would stop you? (privacy, effort)
10. If the first audit found ≥ $145, would you pay $29 today? If not, what's missing?

Print answers verbatim below — no paraphrasing into wishful thinking.

## Tracker

| # | Seller (handle) | Source | GMV band | Paid fees last mo | Violation in last 90d | Knows referral rate | Writes appeals via | Tools spend | Willing upload price | Stated price anchor | Audit ran (y/n) | Leak found $ | Would pay $29? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | | | | | |
| 2 | | | | | | | | | | | | | | |
| 3 | | | | | | | | | | | | | | |
| 4 | | | | | | | | | | | | | | |
| 5 | | | | | | | | | | | | | | |
| 6 | | | | | | | | | | | | | | |
| 7 | | | | | | | | | | | | | | |
| 8 | | | | | | | | | | | | | | |
| 9 | | | | | | | | | | | | | | |
| 10 | | | | | | | | | | | | | | |

## 30-day scoreboard (fill weekly)

| Metric | Target | Week 1 | Week 2 | Week 3 | Week 4 |
|---|---|---|---|---|---|
| Completed audits (real files) | 10 | | | | |
| Paying customers | 3 | | | | |
| Average leak found / price | ≥ 5 | | | | |
| upload_started → audit_viewed conversion | ≥ 60% | | | | |
| audit_viewed → checkout_started | ≥ 15% | | | | |

## Pivot triggers

- Median stated price anchor ≤ $10 → reposition against bigger line items (returns) or switch
  the wedge to the appeal-writing side.
- ≥ 3 sellers refuse upload for privacy reasons → sell the agency/firm-rest-of-trust angle or
  add redaction-first UX before anything else.
- Leak < 5× price for the band we can reach → the fee-audit wedge is dead at $29; report it
  and pivot to violation-first (Account Health) framing where willingness-to-pay is proven by
  the appeal-gig market.

## Funnel note

Events tracked server-side in `product_events` (`signup → upload_started → upload_mapped →
audit_viewed → checkout_started → portal_opened`). Read them with:

```sql
select event, count(*) from product_events group by 1 order by 2 desc;
```
