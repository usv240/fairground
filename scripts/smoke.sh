#!/bin/sh
# Full lifecycle smoke test: practice case, negotiation → mediation → agreement → signed
B=http://localhost:3111
set -e

echo "── 1. create practice case"
CREATE=$(curl -s -X POST $B/api/case -H 'content-type: application/json' -d '{
  "title":"Unpaid logo design invoice",
  "summary":"I designed a logo package for a client, delivered all files on March 10, and the final invoice of $1,800 has been unpaid for 75 days despite three reminders.",
  "amount":1800,"category":"freelance_invoice","vsAi":true}')
ID=$(echo "$CREATE" | node -pe 'JSON.parse(require("fs").readFileSync(0)).caseId')
K=$(echo "$CREATE" | node -pe 'JSON.parse(require("fs").readFileSync(0)).yourKey')
echo "case=$ID key=$K"

echo "── 2. add evidence + serve"
curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
  -d '{"type":"add_evidence","title":"Signed contract, Feb 20","description":"Fixed fee $1,800, net-30 payment terms, signed by both parties.","kind":"contract"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).message'
curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
  -d '{"type":"send_to_respondent"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).message'

echo "── 3. AI opponent responds"
curl -s -X POST "$B/api/case/$ID/ai?k=$K" -H 'content-type: application/json' \
  -d '{"task":"opponent_step"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).acted'

echo "── 4. guard test: offer before mandate (expect refusal)"
curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
  -d '{"type":"submit_offer","amount":1700}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).error'

echo "── 5. set mandate, then mandate-guard test (offer below floor, expect refusal)"
curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
  -d '{"type":"set_mandate","limit":1400}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).message'
curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
  -d '{"type":"submit_offer","amount":1200}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).error'

echo "── 6. three sealed rounds (AI ceiling is 72% of 1800 = 1296, we stay high → mediation)"
for AMT in 1750 1650 1600; do
  curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
    -d "{\"type\":\"submit_offer\",\"amount\":$AMT}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).message'
  curl -s -X POST "$B/api/case/$ID/ai?k=$K" -H 'content-type: application/json' \
    -d '{"task":"opponent_step"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).acted'
done

echo "── 7. phase check + mediator proposal"
curl -s "$B/api/case/$ID?k=$K" | node -pe 'JSON.parse(require("fs").readFileSync(0)).view.phase'
curl -s -X POST "$B/api/case/$ID/ai?k=$K" -H 'content-type: application/json' \
  -d '{"task":"mediator_propose"}' | node -pe 'const r=JSON.parse(require("fs").readFileSync(0)); "proposal: $"+r.proposal.amount'

echo "── 8. both accept"
curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
  -d '{"type":"respond_proposal","decision":"accept"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).message'
curl -s -X POST "$B/api/case/$ID/ai?k=$K" -H 'content-type: application/json' \
  -d '{"task":"opponent_step"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).acted'

echo "── 9. draft + sign + countersign"
curl -s -X POST "$B/api/case/$ID/ai?k=$K" -H 'content-type: application/json' \
  -d '{"task":"draft_agreement"}' | node -pe 'const r=JSON.parse(require("fs").readFileSync(0)); "drafted, amount $"+r.agreement.amount'
curl -s -X POST "$B/api/case/$ID/action?k=$K" -H 'content-type: application/json' \
  -d '{"type":"sign","name":"Maya Alvarez"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).message'
curl -s -X POST "$B/api/case/$ID/ai?k=$K" -H 'content-type: application/json' \
  -d '{"task":"opponent_step"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).acted'

echo "── 10. final phase + role-privacy check (respondent view must not leak claimant offers/mandate)"
curl -s "$B/api/case/$ID?k=$K" | node -pe 'const v=JSON.parse(require("fs").readFileSync(0)).view; v.phase+" settled=$"+v.settledAmount'
echo "claimant-view offer count (own only):"
curl -s "$B/api/case/$ID?k=$K" | node -pe 'const v=JSON.parse(require("fs").readFileSync(0)).view; v.yourOffers.length+" offers, all by="+[...new Set(v.yourOffers.map(o=>o.by))].join()'
echo "wrong-key access (expect error):"
curl -s "$B/api/case/$ID?k=badkey" | node -pe 'JSON.parse(require("fs").readFileSync(0)).error'
echo "ALL DONE"
