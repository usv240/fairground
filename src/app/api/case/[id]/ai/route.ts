import { NextRequest, NextResponse } from "next/server";
import { getCase, saveCase, newId, recordResolution } from "@/lib/store";
import { viewFor, roleForKey, log, resolveRoundIfComplete, offersForRound, whatNext } from "@/lib/machine";
import { realityCheck, mediatorProposal, draftAgreement, opponentPersona } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/case/:id/ai?k=KEY  { task }
// AI services: private reality checks, the neutral mediator, agreement
// drafting, and the practice-mode counterpart.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const role = roleForKey(c, req.nextUrl.searchParams.get("k"));
  if (!role) return NextResponse.json({ error: "Invalid or missing access key." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const task = String(body.task ?? "");
  const origin = req.nextUrl.origin;

  if (task === "reality_check") {
    if (!c.response && role === "respondent" && c.phase !== "response") {
      return NextResponse.json({ error: "Reality checks are available once a claim has been served." }, { status: 409 });
    }
    const assessment = await realityCheck(c, role);
    log(c, "system", `${role} requested a private reality check. (Contents private to that side.)`);
    await saveCase(c);
    return NextResponse.json({ ok: true, assessment, whatNext: whatNext(c, role) });
  }

  if (task === "mediator_propose") {
    if (c.phase !== "mediation") {
      return NextResponse.json({ error: `The mediator only acts in the mediation phase (current: ${c.phase}).` }, { status: 409 });
    }
    const last = c.mediatorProposals[c.mediatorProposals.length - 1];
    if (last && !Object.values(last.responses).includes("decline")) {
      return NextResponse.json({ ok: true, proposal: last, note: "A proposal is already on the table.", whatNext: whatNext(c, role) });
    }
    if (c.mediatorProposals.length >= 2) {
      return NextResponse.json({ error: "The mediator has issued the maximum of two proposals." }, { status: 409 });
    }
    const p = await mediatorProposal(c);
    const proposal = {
      id: newId("mp"), amount: p.amount, rationale: p.rationale, terms: p.terms,
      at: Date.now(), responses: {},
    };
    c.mediatorProposals.push(proposal);
    log(c, "mediator", `Mediator issued ${c.mediatorProposals.length === 2 ? "a final revised" : "a"} proposal: $${p.amount}.`);
    await saveCase(c);
    return NextResponse.json({ ok: true, proposal, whatNext: whatNext(c, role) });
  }

  if (task === "draft_agreement") {
    if (c.phase !== "agreement") {
      return NextResponse.json({ error: `Drafting happens in the agreement phase (current: ${c.phase}).` }, { status: 409 });
    }
    if (!c.agreement) {
      const { draft, terms } = await draftAgreement(c);
      c.agreement = { draft, terms, amount: c.settledAmount ?? 0, signatures: {} };
      log(c, "mediator", "Settlement agreement drafted for both parties to review and sign.");
      await saveCase(c);
    }
    return NextResponse.json({
      ok: true, agreement: { draft: c.agreement.draft, terms: c.agreement.terms, amount: c.agreement.amount },
      whatNext: whatNext(c, role),
    });
  }

  if (task === "opponent_step") {
    // Practice mode only: the platform plays a realistic respondent so a
    // single person (or judge) can experience the full two-sided process.
    if (!c.vsAi) return NextResponse.json({ error: "This case has a human respondent." }, { status: 409 });
    if (role !== "claimant") return NextResponse.json({ error: "Only the claimant side triggers the practice counterpart." }, { status: 403 });

    let acted = "";

    if (c.phase === "response" && !c.response) {
      if (!c.aiPersona) c.aiPersona = await opponentPersona(c);
      c.response = { position: "dispute", story: c.aiPersona.story };
      c.mandates.respondent = { limit: c.aiPersona.hiddenCeiling, priorities: c.aiPersona.style, setAt: Date.now() };
      c.phase = "negotiation";
      log(c, "respondent", "Respondent (practice AI) disputed the claim and entered negotiation.");
      acted = "The practice respondent disputed the claim. The case is now in sealed-offer negotiation.";
    } else if (c.phase === "negotiation") {
      const ceiling = c.mandates.respondent?.limit ?? Math.round(c.claim.amount * 0.72);
      const { ask, bid } = offersForRound(c, c.round);
      if (ask && !bid) {
        const fraction = c.round === 1 ? 0.62 : c.round === 2 ? 0.8 : 0.95;
        const amount = Math.round(ceiling * fraction);
        c.offers.push({ round: c.round, by: "respondent", amount, at: Date.now() });
        log(c, "system", `respondent submitted a sealed offer for round ${c.round}. (Amount sealed.)`);
        resolveRoundIfComplete(c);
        acted = "The practice respondent submitted its sealed offer for this round.";
      }
    } else if (c.phase === "mediation") {
      const prop = c.mediatorProposals[c.mediatorProposals.length - 1];
      const ceiling = c.mandates.respondent?.limit ?? Math.round(c.claim.amount * 0.72);
      if (prop && prop.responses.claimant && !prop.responses.respondent) {
        // Slightly settlement-inclined: a practice counterpart stretches past its
        // ceiling for a neutral proposal — and further for the final one, the way
        // real parties stretch at the courthouse steps.
        const stretch = c.mediatorProposals.length >= 2 ? 1.25 : 1.12;
        const decision = prop.amount <= Math.round(ceiling * stretch) ? "accept" : "decline";
        prop.responses.respondent = decision;
        log(c, "respondent", `Respondent (practice AI) ${decision === "accept" ? "accepted" : "declined"} the mediator's proposal of $${prop.amount}.`);
        if (decision === "accept" && prop.responses.claimant === "accept") {
          c.settledAmount = prop.amount;
          c.settledVia = "mediation";
          c.phase = "agreement";
          log(c, "system", `Both parties accepted the mediator's proposal. Settlement fixed at $${prop.amount}.`);
        } else if (decision === "decline" && c.mediatorProposals.length >= 2) {
          c.phase = "closed";
          log(c, "system", "Second mediator proposal declined. Case closed unresolved.");
        }
        acted = `The practice respondent ${decision}ed the mediator's proposal.`;
      }
    } else if (c.phase === "agreement" && c.agreement) {
      if (c.agreement.signatures.claimant && !c.agreement.signatures.respondent) {
        c.agreement.signatures.respondent = { name: "Practice Counterpart (AI simulation)", signedAt: Date.now() };
        c.phase = "resolved";
        log(c, "system", `Both signatures recorded. Case resolved at $${c.agreement.amount}.`);
        acted = "The practice respondent countersigned. Case resolved.";
        await recordResolution(c);
      }
    }

    await saveCase(c);
    return NextResponse.json({
      ok: true, acted: acted || "Nothing for the practice counterpart to do right now.",
      view: viewFor(c, "claimant", origin),
    });
  }

  return NextResponse.json({ error: `Unknown AI task "${task}".` }, { status: 400 });
}
