import { NextRequest, NextResponse } from "next/server";
import { DisputeCase } from "@/lib/types";
import { saveCase, newId, recordResolution } from "@/lib/store";
import { log, resolveRoundIfComplete } from "@/lib/machine";
import { opponentPersona, draftAgreement } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/demo { preset } — one-click staged demo cases (all practice mode).
//   "invoice"  → rich claim + evidence, ready to serve            (instant)
//   "deposit"  → already served & disputed, sealed rounds open    (~5s, LLM persona)
//   "resolved" → fast-forwarded to a signed, sealed settlement    (instant)

function baseCase(input: {
  title: string; category: DisputeCase["category"]; amount: number;
  summary: string; timeline?: string; desiredOutcome?: string;
}): DisputeCase {
  return {
    id: newId(), createdAt: Date.now(), phase: "intake",
    category: input.category, title: input.title, currency: "USD", vsAi: true,
    claim: { summary: input.summary, amount: input.amount, timeline: input.timeline, desiredOutcome: input.desiredOutcome },
    evidence: [], messages: [], keys: { claimant: newId("ck"), respondent: newId("rk") },
    mandates: {}, offers: [], round: 1, roundSignals: [], mediatorProposals: [],
    activity: [{ at: Date.now(), actor: "system", text: "Demo case opened (practice mode: AI counterpart will respond)." }],
  };
}

function addEvidence(c: DisputeCase, by: "claimant" | "respondent", title: string, description: string, kind: DisputeCase["evidence"][number]["kind"]) {
  c.evidence.push({ id: newId("ev"), by, title, description, kind, addedAt: Date.now() });
  log(c, by, `Evidence added: "${title}" (${kind}).`);
}

export async function POST(req: NextRequest) {
  let preset = "";
  try {
    preset = String((await req.json()).preset ?? "");
  } catch { /* fall through to error below */ }

  let c: DisputeCase;

  if (preset === "invoice") {
    c = baseCase({
      title: "Unpaid logo design invoice — Atlas Web Co.",
      category: "freelance_invoice", amount: 1800,
      summary: "I designed a complete logo package for Atlas Web Co. under a signed contract — delivered all final files on March 10. The $1,800 invoice (net-30) is now 75 days overdue. Three payment reminders have gone unanswered; the client has stopped replying entirely.",
      timeline: "Feb 20: contract signed (net-30) · Mar 10: final files delivered and accepted · Apr 9: invoice due · Apr 23, May 8, May 21: reminders sent, no response",
      desiredOutcome: "Payment of the agreed $1,800, or the closest number that ends this without going to small claims court.",
    });
    addEvidence(c, "claimant", "Signed contract, Feb 20", "Fixed fee of $1,800 for a complete logo package, net-30 payment terms, signed by both parties.", "contract");
    addEvidence(c, "claimant", "Delivery email, Mar 10", "Email delivering all final files; client replied 'these look great, thanks!' the same day.", "message");
    addEvidence(c, "claimant", "Reminder thread", "Three payment reminders (Apr 23, May 8, May 21). The last two show as read, with no reply.", "message");
  } else if (preset === "deposit") {
    c = baseCase({
      title: "Withheld security deposit — 44 Cedar St.",
      category: "security_deposit", amount: 1200,
      summary: "After two years at 44 Cedar St., I moved out on June 30 and left the unit clean. The property manager signed a move-out checklist marking every room OK — then kept my entire $1,200 deposit, claiming 'wall damage' discovered later. State law required an itemized deduction list within 21 days; I never received one.",
      timeline: "Jun 30: move-out, checklist signed clean · Jul 24: deposit deadline passed, nothing returned · Aug 2: told by phone the deposit was kept for 'wall damage'",
      desiredOutcome: "Return of the $1,200 deposit, or a fair number that reflects the signed clean checklist.",
    });
    addEvidence(c, "claimant", "Move-out inspection checklist", "Signed by the property manager on June 30 — every room marked OK, no damage noted anywhere.", "document");
    addEvidence(c, "claimant", "Move-out photos, Jun 30", "Timestamped photos of every room taken the day of move-out, showing clean walls and floors.", "photo");
    // Advance: served, AI counterpart reviews and disputes → sealed rounds open.
    c.phase = "response";
    log(c, "system", "Claim finalized. Practice counterpart is preparing a response.");
    const persona = await opponentPersona(c);
    c.aiPersona = persona;
    c.response = { position: "dispute", story: persona.story };
    c.mandates.respondent = { limit: persona.hiddenCeiling, priorities: persona.style, setAt: Date.now() };
    c.phase = "negotiation";
    log(c, "respondent", "Respondent (practice AI) disputed the claim and entered negotiation.");
  } else if (preset === "resolved") {
    c = baseCase({
      title: "Refund for defective espresso machine",
      category: "purchase_dispute", amount: 740,
      summary: "Bought a $740 espresso machine that leaked from day one. Returned it within the 30-day window with tracking confirmation — the promised refund never arrived.",
    });
    addEvidence(c, "claimant", "Order receipt", "Order #8841, $740, includes the seller's 30-day return policy.", "receipt");
    addEvidence(c, "claimant", "Return tracking confirmation", "Carrier confirmation showing the machine was delivered back to the seller on day 22.", "receipt");
    // Fast-forward an honest, complete history to a signed settlement.
    c.phase = "response";
    c.response = { position: "dispute", story: "The machine came back with visible scale buildup, so we treated it as used beyond normal testing. We offered store credit rather than a refund, which the buyer declined." };
    log(c, "respondent", "Respondent (practice AI) disputed the claim.");
    c.phase = "negotiation";
    c.mandates.claimant = { limit: 440, setAt: Date.now() };
    c.mandates.respondent = { limit: 520, setAt: Date.now() };
    log(c, "system", "Both parties set private negotiation mandates. (Contents sealed.)");
    c.offers.push({ round: 1, by: "claimant", amount: 460, at: Date.now() });
    c.offers.push({ round: 1, by: "respondent", amount: 500, at: Date.now() });
    log(c, "system", "Both sealed offers for round 1 submitted. (Amounts sealed.)");
    resolveRoundIfComplete(c); // overlap → settles at $480, phase → agreement
    const { draft, terms } = await draftAgreement(c, true);
    c.agreement = {
      draft, terms, amount: c.settledAmount ?? 480,
      signatures: {
        claimant: { name: "Maya Alvarez (demo)", signedAt: Date.now() },
        respondent: { name: "Practice Counterpart (AI simulation)", signedAt: Date.now() },
      },
    };
    log(c, "mediator", "Settlement agreement drafted for both parties to review and sign.");
    c.phase = "resolved";
    log(c, "system", `Both signatures recorded. Case resolved at $${c.agreement.amount}.`);
    await recordResolution(c);
  } else {
    return NextResponse.json({ error: "Unknown preset. Use invoice | deposit | resolved." }, { status: 400 });
  }

  await saveCase(c);
  return NextResponse.json({
    caseId: c.id,
    yourKey: c.keys.claimant,
    link: `${req.nextUrl.origin}/case/${c.id}?k=${c.keys.claimant}`,
  });
}
