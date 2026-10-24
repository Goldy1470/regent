# Policy versions — how to update the rate card and rules

TikTok Shop's fees and listing rules change often. Regent treats policy knowledge as
**versioned data**, not prose in business logic. When TikTok changes something, you add a new
snapshot — you never edit the old one — so every past audit stays reproducible and every
future dispute letter cites the version that was true on the settle date.

## Where the data lives

| File | What it holds |
|---|---|
| `lib/policy/rate-card.ts` | `POLICIES: PolicyVersion[]` — referral tiers, refund-admin rule, return-cost split. Selected per settle date by `policyForDate()`. |
| `lib/policy/rules.ts` | Listing-claims corpus (`RULES`) + scanner. `RULESET_VERSION` stamps every scan result. |
| `lib/rules.ts` | Thin re-export so older imports keep working. |
| `test/fixtures/settlement-us.csv` | Realistic export used to lock engine semantics. |

## Update process (do this for every platform change)

1. **Source it.** Find the TikTok announcement page / Seller Center banner. Record the URL,
   the date you read it, and a screenshot in this folder (`<ticket>.png` next to this doc).
   No screenshot → do not ship the change.
2. **Add, never mutate.** Copy the last `PolicyVersion` entry, give it a new `id`
   (`US-2026-09` = effective Sept 2026), set `effective_from` to the change date, and set the
   *previous* entry's `effective_to` to that same date. `policyForDate()` then picks the right
   card per settlement row, so a July export is audited under the July card even in October.
3. **Update the engine expectations if semantics changed** (e.g. the cap), and add a fixture
   row that would be mis-audited under the old card.
4. **For listing rules:** add the new phrase rule with word boundaries (`\b` everywhere — see
   the `secure`/`treats` guard rails), bump `RULESET_VERSION`, and add a negative test case for
   the words it must NOT match.
5. **Run the suite.** `npm test` must pass; the fixture test encodes the dollars.
6. **Changelog below.** One row per change. This is also what you paste into dispute tickets.

## Changelog

| Version | Effective | Change | Source (fill in) |
|---|---|---|---|
| `US-2026-08` | 2026-08-01 | Standard referral 6% (was 8%). Builder-subcategories may differ — verify per category before disputing. | *TikTok fee announcement — add link* |
| `US-2026-07` | 2025-02-01 → 2026-08-01 | Standard referral 8%; refund admin fee = 20% of the refunded item's referral fee capped at $5/SKU (introduced Feb 2025); return-label default $7.50→data-change trail. | *Fee-history page — add link* |

## Engine invariants (locked by tests — do not break silently)

- **Referral: overcharges only.** Undercharges are skipped, never counted as "leakage".
- **Refund admin fee** = `min(20% × referral-on-refunded-item, $5)` per SKU.
- **Buyer-remorse return labels** charged to the seller are flagged as `return_cost` evidence
  (2026 split: buyer pays); seller-fault returns are not flagged.
- **Duplicate shipping**: the least-negative shipping line is treated as legitimate; the rest
  are flagged as duplicates.
- `leaked_total` = sum of overcharge deltas; every anomaly carries a **citation** naming the
  PolicyVersion and the exact rule/rate-card line.

## Hard rules for what ships

- Anything uncertain ships as "approximate — verify against your Seller Center page" language.
  Engine output is **evidence, not a guarantee**; no legal claims, no recovery promises.
- Dispute notes produced for the user must name the PolicyVersion id and the effective date.
- If TikTok reports a number that disagrees with an export *within the same version window*
  (e.g. a reported 6% that was actually 8% in a transition month), keep both references and
  flag rows whose charged rate matches neither — that's the transition-month audit signature.
