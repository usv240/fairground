import { NextRequest, NextResponse } from "next/server";
import { getCase, saveCase, newId, recordResolution, recordFairness } from "@/lib/store";
import {
  viewFor, roleForKey, assertAllowed, resolveRoundIfComplete, log, otherRole, whatNext,
} from "@/lib/machine";
import { Evidence, MAX_ROUNDS } from "@/lib/types";

export const runtime = "nodejs";

// POST /api/case/:id/action?k=KEY  { type, ...payload }
// Single dispatcher for every mutating action. assertAllowed() is the
// procedural core: an action outside its phase or role is refused with an
// explanation an agent can act on.
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
  const type = String(body.type ?? "");

  const denial = assertAllowed(c, role, type);
  if (denial) return NextResponse.json({ error: denial }, { status: 409 });

  let message = "";

  switch (type) {
    case "update_claim": {
      if (body.summary) c.claim.summary = String(body.summary).slice(0, 4000);
      if (body.timeline) c.claim.timeline = String(body.timeline).slice(0, 2000);
      if (body.desiredOutcome) c.claim.desiredOutcome = String(body.desiredOutcome).slice(0, 1000);
      if (body.title) c.title = String(body.title).slice(0, 120);
      if (body.amount != null) {
        const a = Number(body.amount);
        if (!Number.isFinite(a) || a <= 0 || a > 250000) {
          return NextResponse.json({ error: "Amount must be a positive number up to 250,000." }, { status: 400 });
        }
        c.claim.amount = Math.round(a);
      }
      log(c, role, "Claim details updated.");
      message = "Claim updated.";
      break;
    }

    case "add_evidence": {
      const title = String(body.title ?? "").slice(0, 200).trim();
      const description = String(body.description ?? "").slice(0, 2000).trim();
      const kinds = ["contract", "invoice", "message", "receipt", "photo", "document", "other"] as const;
      const kind = kinds.includes(body.kind as Evidence["kind"]) ? (body.kind as Evidence["kind"]) : "other";
      if (!title || !description) {
        return NextResponse.json({ error: "Evidence needs a title and a description of what it shows." }, { status: 400 });
      }
      c.evidence.push({ id: newId("ev"), by: role, title, description, kind, addedAt: Date.now() });
      log(c, role, `Evidence added: "${title}" (${kind}).`);
      message = `Evidence "${title}" added to the record. Both parties can see it.`;
      break;
    }

    case "send_to_respondent": {
      if (!c.claim.summary || !c.claim.amount) {
        return NextResponse.json({ error: "Complete the claim summary and amount before sending." }, { status: 400 });
      }
      c.phase = "response";
      log(c, "system", c.vsAi
        ? "Claim finalized. Practice counterpart is preparing a response."
        : "Claim finalized and invite issued to the respondent.");
      message = c.vsAi
        ? "Claim sent. The practice respondent (AI) is reviewing it now — its formal response will appear here in a moment."
        : "Claim sent. Share the invite link (shown on the page and in your case view) with the other party.";
      break;
    }

    case "submit_response": {
      const positions = ["accept_full", "accept_partial", "dispute"] as const;
      const position = positions.includes(body.position as (typeof positions)[number])
        ? (body.position as (typeof positions)[number]) : null;
      const story = String(body.story ?? "").slice(0, 4000).trim();
      if (!position || !story) {
        return NextResponse.json({ error: "A position (accept_full | accept_partial | dispute) and your account of events are required." }, { status: 400 });
      }
      const counterAmount = body.counterAmount != null ? Math.round(Number(body.counterAmount)) : undefined;
      c.response = { position, story, counterAmount };

      if (position === "accept_full") {
        c.settledAmount = c.claim.amount;
        c.settledVia = "direct_accept";
        c.phase = "agreement";
        log(c, role, `Respondent accepted the claim in full ($${c.claim.amount}).`);
        message = `You accepted the full claim of $${c.claim.amount}. The case moves straight to the written agreement.`;
      } else {
        c.phase = "negotiation";
        log(c, role, `Respondent responded: ${position.replace("_", " ")}${counterAmount ? ` (indicative counter: $${counterAmount})` : ""}.`);
        message = "Response recorded. The case enters sealed-offer negotiation: up to 3 rounds, offers never revealed to the other side.";
      }
      break;
    }

    case "set_mandate": {
      const limit = Math.round(Number(body.limit));
      if (!Number.isFinite(limit) || limit < 0 || limit > 250000) {
        return NextResponse.json({ error: "Mandate limit must be a non-negative number up to 250,000." }, { status: 400 });
      }
      c.mandates[role] = {
        limit,
        priorities: body.priorities ? String(body.priorities).slice(0, 1000) : undefined,
        setAt: Date.now(),
      };
      log(c, "system", `${role} set a private negotiation mandate. (Contents sealed.)`);
      message = role === "claimant"
        ? `Private mandate saved: you will not settle below $${limit}. The other side can never see this number.`
        : `Private mandate saved: you will not pay above $${limit}. The other side can never see this number.`;
      break;
    }

    case "submit_offer": {
      const amount = Math.round(Number(body.amount));
      if (!Number.isFinite(amount) || amount < 0 || amount > 250000) {
        return NextResponse.json({ error: "Offer amount must be a non-negative number up to 250,000." }, { status: 400 });
      }
      const mandate = c.mandates[role];
      if (!mandate) {
        return NextResponse.json({ error: "Set your private mandate first (set_negotiation_mandate) — your human's limit protects them during sealed bidding." }, { status: 409 });
      }
      const existing = c.offers.find(o => o.round === c.round && o.by === role);
      if (existing) {
        return NextResponse.json({ error: `You already submitted a sealed offer for round ${c.round}. Wait for the other side.` }, { status: 409 });
      }
      // Mandate guard: an agent trying to concede beyond its human's limit is
      // stopped unless the human explicitly re-approved.
      const violates = role === "claimant" ? amount < mandate.limit : amount > mandate.limit;
      if (violates && body.humanApproved !== true) {
        return NextResponse.json({
          error: role === "claimant"
            ? `Mandate guard: $${amount} is below your human's private floor of $${mandate.limit}. Either confirm with your human in conversation and resubmit with humanApproved: true, or call request_mandate_override to raise an approval card on their screen.`
            : `Mandate guard: $${amount} is above your human's private ceiling of $${mandate.limit}. Either confirm with your human in conversation and resubmit with humanApproved: true, or call request_mandate_override to raise an approval card on their screen.`,
        }, { status: 409 });
      }
      c.offers.push({ round: c.round, by: role, amount, note: body.note ? String(body.note).slice(0, 500) : undefined, at: Date.now() });
      log(c, "system", `${role} submitted a sealed offer for round ${c.round}. (Amount sealed.)`);

      const before = c.round;
      const result = resolveRoundIfComplete(c);
      if (result.settled) {
        message = `Sealed offers overlapped! The case settles at the midpoint: $${c.settledAmount}. Moving to the written agreement.`;
      } else if (c.phase === "mediation") {
        message = `Round ${before} closed without overlap — that was the final round. The case moves to neutral mediation.`;
      } else if (c.round !== before) {
        const sig = c.roundSignals[c.roundSignals.length - 1];
        message = `Round ${before} closed without overlap. Signal: the gap ${sig.gapDirection}${sig.gapChangePct != null ? ` by ${sig.gapChangePct}%` : ""}. Round ${c.round} of ${MAX_ROUNDS} is open.`;
      } else {
        message = `Sealed offer for round ${c.round} recorded ($${amount} — visible only to your side and the server). Waiting for the other party.`;
      }
      break;
    }

    case "send_message": {
      const text = String(body.text ?? "").slice(0, 1500).trim();
      if (!text) return NextResponse.json({ error: "Message text required." }, { status: 400 });
      c.messages.push({ id: newId("m"), from: role, text, at: Date.now() });
      log(c, role, "Message sent to the other party.");
      message = "Message delivered. Note: messages are visible to both parties and to the mediator.";
      break;
    }

    case "request_mediation": {
      c.phase = "mediation";
      log(c, role, `${role} requested neutral mediation.`);
      message = "The case moves to mediation. Call get_mediator_proposal to have the neutral mediator review the full record and propose terms.";
      break;
    }

    case "respond_proposal": {
      const prop = c.mediatorProposals[c.mediatorProposals.length - 1];
      if (!prop) return NextResponse.json({ error: "No mediator proposal exists yet — call get_mediator_proposal first." }, { status: 409 });
      if (prop.responses[role]) return NextResponse.json({ error: "You already responded to this proposal." }, { status: 409 });
      const decision = body.decision === "accept" ? "accept" : body.decision === "decline" ? "decline" : null;
      if (!decision) return NextResponse.json({ error: "Decision must be accept or decline." }, { status: 400 });
      prop.responses[role] = decision;
      if (decision === "decline" && body.reason) {
        prop.declineReasons = { ...prop.declineReasons, [role]: String(body.reason).slice(0, 500) };
      }
      log(c, role, `${role} ${decision === "accept" ? "accepted" : "declined"} the mediator's proposal of $${prop.amount}.`);

      const other = prop.responses[otherRole(role)];
      if (decision === "accept" && other === "accept") {
        c.settledAmount = prop.amount;
        c.settledVia = "mediation";
        c.phase = "agreement";
        log(c, "system", `Both parties accepted the mediator's proposal. Settlement fixed at $${prop.amount}.`);
        message = `Both parties accepted. Settlement fixed at $${prop.amount}. Moving to the written agreement.`;
      } else if (decision === "decline" || other === "decline") {
        if (c.mediatorProposals.length >= 2) {
          c.phase = "closed";
          log(c, "system", "Second mediator proposal declined. Case closed unresolved — parties retain all rights, including small-claims court.");
          message = "Proposal declined. After two failed proposals the case closes unresolved. Your full case record (claim, evidence, offer history) remains exportable — it is exactly what a small-claims filing needs.";
        } else {
          message = "Proposal declined. The mediator may issue one final revised proposal — call get_mediator_proposal to request it.";
        }
      } else {
        message = `Your ${decision} is recorded. Waiting for the other party.`;
      }
      break;
    }

    case "sign": {
      // Deliberately NOT exposed as a WebMCP tool anywhere in the client.
      // The signature panel is plain UI: a human types their legal name.
      if (!c.agreement) return NextResponse.json({ error: "No drafted agreement to sign yet." }, { status: 409 });
      const name = String(body.name ?? "").trim();
      if (name.length < 3) return NextResponse.json({ error: "Type your full legal name to sign." }, { status: 400 });
      if (c.agreement.signatures[role]) return NextResponse.json({ error: "You already signed." }, { status: 409 });
      c.agreement.signatures[role] = { name, signedAt: Date.now() };
      log(c, role, `${role} signed the settlement agreement as "${name}".`);
      if (c.agreement.signatures.claimant && c.agreement.signatures.respondent) {
        c.phase = "resolved";
        log(c, "system", `Both signatures recorded. Case resolved at $${c.agreement.amount}.`);
        message = `Both parties have signed. The case is resolved at $${c.agreement.amount}.`;
        await recordResolution(c);
      } else {
        message = "Signature recorded. Waiting for the other party to sign.";
      }
      break;
    }

    case "request_override": {
      // Elicitation: the agent parks a beyond-mandate proposal; only the
      // human's click on the page can convert it into a real sealed offer.
      const amount = Math.round(Number(body.amount));
      const mandate = c.mandates[role];
      if (!mandate) return NextResponse.json({ error: "No mandate set; nothing to override." }, { status: 409 });
      if (!Number.isFinite(amount) || amount < 0 || amount > 250000) {
        return NextResponse.json({ error: "Amount must be a non-negative number up to 250,000." }, { status: 400 });
      }
      const violates = role === "claimant" ? amount < mandate.limit : amount > mandate.limit;
      if (!violates) {
        return NextResponse.json({ error: `$${amount} is within your mandate; submit it normally with submit_sealed_offer.` }, { status: 409 });
      }
      c.pendingOverrides = { ...c.pendingOverrides, [role]: {
        amount, reason: body.reason ? String(body.reason).slice(0, 300) : undefined, at: Date.now(),
      } };
      log(c, "system", `${role}'s advocate requested approval to go beyond the private mandate. (Details sealed; awaiting the human's decision on their page.)`);
      message = `Approval card raised on your human's screen: offer $${amount}, which crosses their private ${role === "claimant" ? "floor" : "ceiling"} of $${mandate.limit}. Do NOT proceed until they decide on the page; check get_case_status for the outcome.`;
      break;
    }

    case "resolve_override": {
      // Human-only by design: the page's approval card calls this.
      const pending = c.pendingOverrides?.[role];
      if (!pending) return NextResponse.json({ error: "No pending approval." }, { status: 409 });
      delete c.pendingOverrides![role];
      if (body.approve === true) {
        const existing = c.offers.find(o => o.round === c.round && o.by === role);
        if (existing) {
          log(c, role, "Approved a mandate override, but this round's offer was already in; nothing submitted.");
          message = "Approved, but an offer for this round already exists.";
          break;
        }
        c.offers.push({ round: c.round, by: role, amount: pending.amount, note: "human-approved override", at: Date.now() });
        log(c, role, `${role} personally approved going beyond the mandate; sealed offer submitted for round ${c.round}. (Amount sealed.)`);
        const before = c.round;
        const result = resolveRoundIfComplete(c);
        message = result.settled
          ? `You approved it, and the offers overlapped. Settled at $${c.settledAmount}.`
          : `You approved it. The sealed offer is in for round ${before}.`;
      } else {
        log(c, role, `${role} declined the advocate's request to go beyond the mandate.`);
        message = "Declined. Your mandate stands; your advocate has been told to stay within it.";
      }
      break;
    }

    case "rate_fairness": {
      const rating = Math.round(Number(body.rating));
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating must be 1 to 5." }, { status: 400 });
      }
      const f = (c.fairness ??= { sum: 0, count: 0, rated: [] });
      if (f.rated.includes(role)) return NextResponse.json({ error: "You already rated this process." }, { status: 409 });
      f.sum += rating;
      f.count += 1;
      f.rated.push(role);
      await recordFairness(rating);
      log(c, role, `${role} rated the fairness of the process: ${rating}/5.`);
      message = "Thank you. Fairness ratings shape how Fairground's process evolves.";
      break;
    }

    default:
      return NextResponse.json({ error: `Unknown action "${type}".` }, { status: 400 });
  }

  await saveCase(c);
  const view = viewFor(c, role, req.nextUrl.origin);
  return NextResponse.json({ ok: true, message, whatNext: whatNext(c, role), view });
}
