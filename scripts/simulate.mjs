// Mechanism experiment: plays the claimant side with a randomized rational
// policy against the platform's AI respondent, end-to-end over the public
// HTTP API (create → serve → sealed rounds → mediation → signatures), and
// measures whether the sealed-bid + mediation mechanism actually settles.
//
//   node scripts/simulate.mjs [N] [BASE]
//
// Honest framing: this validates the MECHANISM (do structured sealed rounds
// plus clamped mediation converge for parties with overlapping-but-unknown
// valuations?), not human behavior.
const N = Number(process.argv[2] ?? 30);
const B = process.argv[3] ?? "https://fairground-umber.vercel.app";
const CONCURRENCY = 3;

const SCENARIOS = [
  { category: "freelance_invoice", title: "Unpaid freelance invoice", summary: "Delivered contracted design work; the final invoice is months overdue despite reminders.", lo: 400, hi: 5000 },
  { category: "security_deposit", title: "Withheld security deposit", summary: "Landlord withheld the deposit citing damage; tenant holds a signed clean move-out checklist.", lo: 500, hi: 3000 },
  { category: "purchase_dispute", title: "Refund never issued", summary: "Item returned within the window; the promised refund was never processed.", lo: 100, hi: 1500 },
  { category: "shared_expenses", title: "Unsettled shared expenses", summary: "Former roommate has not paid their share of final utilities and rent.", lo: 200, hi: 2000 },
  { category: "services_quality", title: "Incomplete renovation work", summary: "Contractor left agreed work unfinished after being paid a deposit.", lo: 800, hi: 8000 },
];

const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
const post = async (url, body) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
};
const getView = async (id, k) => (await (await fetch(`${B}/api/case/${id}?k=${k}`)).json()).view;

async function runCase(i) {
  const t0 = Date.now();
  const sc = SCENARIOS[i % SCENARIOS.length];
  const claim = Math.round(rnd(sc.lo, sc.hi) / 10) * 10;
  const floor = Math.round(claim * rnd(0.55, 0.8));       // claimant's private valuation
  const offers = [
    Math.round(claim * 0.95),
    Math.round(claim * 0.85),
    Math.max(Math.round(floor * 1.02), Math.round(claim * 0.72)),
  ];

  const created = await post(`${B}/api/case`, { title: sc.title, summary: sc.summary, amount: claim, category: sc.category, vsAi: true });
  const { caseId: id, yourKey: k } = created;
  const act = (body) => post(`${B}/api/case/${id}/action?k=${k}`, body);
  const ai = (task) => post(`${B}/api/case/${id}/ai?k=${k}`, { task });

  await act({ type: "send_to_respondent" });
  await ai("opponent_step");                               // respondent files
  await act({ type: "set_mandate", limit: floor });

  let rounds = 0;
  for (const amount of offers) {
    let v = await getView(id, k);
    if (v.phase !== "negotiation") break;
    rounds++;
    await act({ type: "submit_offer", amount: Math.max(amount, floor), humanApproved: true });
    await ai("opponent_step");                             // respondent's sealed bid
  }

  for (let p = 0; p < 2; p++) {                            // up to two mediator proposals
    let v = await getView(id, k);
    if (v.phase !== "mediation") break;
    const prop = (await ai("mediator_propose")).proposal;
    if (!prop) break;
    const decision = prop.amount >= Math.round(floor * 0.93) ? "accept" : "decline";
    await act({ type: "respond_proposal", decision });
    await ai("opponent_step");                             // respondent responds
  }

  let v = await getView(id, k);
  if (v.phase === "agreement") {
    await ai("draft_agreement");
    await act({ type: "sign", name: "Simulated Claimant" });
    await ai("opponent_step");                             // countersign
    v = await getView(id, k);
  }

  const settled = v.phase === "resolved";
  return {
    scenario: sc.category, claim, floor, rounds,
    settled, via: v.settledVia ?? "-", amount: v.settledAmount ?? 0,
    recovery: settled ? v.settledAmount / claim : 0,
    seconds: Math.round((Date.now() - t0) / 1000),
  };
}

const results = [];
let next = 0;
async function worker(w) {
  while (next < N) {
    const i = next++;
    try {
      const r = await runCase(i);
      results.push(r);
      console.log(`[${results.length}/${N}] ${r.settled ? "SETTLED" : "closed "} ${r.scenario} claim=$${r.claim} → $${r.amount} (${Math.round(r.recovery * 100)}%) via ${r.via}, ${r.rounds} rounds, ${r.seconds}s`);
    } catch (e) {
      console.log(`[case ${i}] ERROR: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, w) => worker(w)));

const settled = results.filter(r => r.settled);
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const byVia = {};
for (const r of settled) byVia[r.via] = (byVia[r.via] ?? 0) + 1;

console.log("\n══════════ RESULTS ══════════");
console.log(`cases run:            ${results.length}`);
console.log(`settled:              ${settled.length} (${Math.round(settled.length / results.length * 100)}%)`);
console.log(`settlement paths:     ${Object.entries(byVia).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`mean recovery:        ${Math.round(mean(settled.map(r => r.recovery)) * 100)}% of claim`);
console.log(`median recovery:      ${Math.round(median(settled.map(r => r.recovery)) * 100)}% of claim`);
console.log(`mean sealed rounds:   ${mean(results.map(r => r.rounds)).toFixed(1)}`);
console.log(`mean wall time:       ${Math.round(mean(results.map(r => r.seconds)))}s per case (fully automated)`);
console.log(`dollars settled:      $${settled.reduce((s, r) => s + r.amount, 0).toLocaleString()}`);
