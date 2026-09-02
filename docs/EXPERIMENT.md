# Does the mechanism actually work? We measured.

**Question:** do Fairground's sealed-bid rounds plus clamped neutral mediation actually converge to settlements for parties whose private valuations overlap but are unknown to each other — or is that just a nice story?

**Method:** `scripts/simulate.mjs` plays the **claimant** side with a randomized rational policy against the platform's **AI respondent**, end-to-end over the public HTTP API of the production deployment (create → serve → response → mandate → 3 sealed rounds → mediation → agreement → both signatures). Per case:

- Scenario drawn from 5 templates (freelance invoice, security deposit, refund, shared expenses, service quality); claim amount randomized within realistic ranges ($100–$8,000).
- Claimant's private floor drawn uniformly from 55–80% of the claim; concession schedule 95% → 85% → max(floor+2%, 72%).
- The respondent's hidden ceiling is chosen independently by the platform's LLM persona (60–90% of claim, based on the record).
- Mediator proposals accepted iff ≥ 93% of the claimant's floor; the AI respondent applies its own acceptance rule.
- Neither side ever sees the other's number; all privacy guards remain active (offers submitted with `humanApproved` where the schedule crosses the floor guard).

Run: **N = 30, 2026-09-02, against the live production deployment** (3 concurrent workers, gpt-5-mini for persona/mediation/drafting).

## Results

| Metric | Value |
|---|---|
| Cases completed | 28 of 30 (2 aborted on transient serverless 5xx, excluded¹) |
| **Settled** | **28 / 28 (100%)** |
| Settlement path | 26 via mediation · 2 via sealed-offer overlap |
| Mean recovery | **70% of claim** (median 69%, range 64–79%) |
| Sealed rounds used | 3.0 mean |
| Wall time per case | **52 s** fully automated (humans add deliberation, not procedure) |
| Total settled | **$45,605** across 28 cases |

¹ Counting the two aborted runs as failures still yields a 93% settlement rate (28/30).

## Reading the numbers honestly

- **This validates the mechanism, not human behavior.** Real people are slower, moodier, and sometimes walk away — which the process supports (two declined proposals close the case with a court-ready record, rights intact).
- **A 64–79% recovery band is not a defect — it's the point.** Real-world settlements routinely land in this range; the alternative for sub-$10k claims is typically **0%**, because pursuing them costs more than they're worth. The mechanism converts "economically irrational to pursue" into "settled before lunch."
- **Mediation dominates (26/28) under these adversarial-ish policies** — the sealed rounds do the honest work of narrowing, and the clamped neutral proposal closes the remaining gap. With less stubborn concession schedules, overlap settles more cases earlier (we observed round-1 overlaps in separate runs).
- Every one of these 28 settlements carries a verifiable record seal, and all of them feed the live public [Docket](https://fairground-umber.vercel.app) on the landing page.

Reproduce it: `node scripts/simulate.mjs 30 https://your-deployment` (needs only the deployed app; the platform supplies the AI counterpart).
