import {
  DisputeCase, CaseView, Role, Phase, RoundSignal, MAX_ROUNDS,
} from "./types";

export function otherRole(r: Role): Role {
  return r === "claimant" ? "respondent" : "claimant";
}

export function log(c: DisputeCase, actor: DisputeCase["activity"][number]["actor"], text: string) {
  c.activity.push({ at: Date.now(), actor, text });
}

// ─── Sealed-bid resolution ──────────────────────────────────────────────────
// Both parties submit a sealed number each round. The server alone compares
// them. Overlap → settle at the midpoint. No overlap → only a directional
// signal about the gap is published; the numbers themselves stay sealed.

export function offersForRound(c: DisputeCase, round: number) {
  const ask = c.offers.find(o => o.round === round && o.by === "claimant");
  const bid = c.offers.find(o => o.round === round && o.by === "respondent");
  return { ask, bid };
}

export function resolveRoundIfComplete(c: DisputeCase): { settled: boolean; signal?: RoundSignal } {
  const { ask, bid } = offersForRound(c, c.round);
  if (!ask || !bid) return { settled: false };

  if (bid.amount >= ask.amount) {
    // Overlap — settle at the midpoint, rounded to the dollar.
    const amount = Math.round((ask.amount + bid.amount) / 2);
    c.settledAmount = amount;
    c.settledVia = "negotiation";
    c.phase = "agreement";
    log(c, "system", `Round ${c.round}: sealed offers overlapped. Settlement amount fixed at the midpoint: $${amount}.`);
    return { settled: true };
  }

  const gap = ask.amount - bid.amount;
  const prev = c.roundSignals[c.roundSignals.length - 1] as (RoundSignal & { _gap?: number }) | undefined;
  const prevGap = prev?._gap;
  let gapDirection: RoundSignal["gapDirection"] = "first";
  let gapChangePct: number | undefined;
  if (typeof prevGap === "number" && prevGap > 0) {
    gapDirection = gap < prevGap ? "narrowed" : gap > prevGap ? "widened" : "unchanged";
    gapChangePct = Math.round(Math.abs((prevGap - gap) / prevGap) * 100);
  }
  const signal: RoundSignal & { _gap?: number } = {
    round: c.round, overlap: false, gapDirection, gapChangePct, at: Date.now(), _gap: gap,
  };
  c.roundSignals.push(signal);
  log(c, "system", `Round ${c.round}: no overlap. Gap ${gapDirection}${gapChangePct != null ? ` by ${gapChangePct}%` : ""}. Amounts remain sealed.`);

  if (c.round >= MAX_ROUNDS) {
    c.phase = "mediation";
    log(c, "system", `All ${MAX_ROUNDS} sealed rounds used without overlap. Case moves to mediation.`);
  } else {
    c.round += 1;
  }
  return { settled: false, signal };
}

// ─── Per-role, per-phase guidance ───────────────────────────────────────────
// Every tool result and case view carries `whatNext`, so an agent always
// knows the next legitimate procedural step for its side.

export function whatNext(c: DisputeCase, role: Role): string {
  const p = c.phase;
  if (p === "intake") {
    return role === "claimant"
      ? "You are assembling the claim. Add a clear summary, the amount, and evidence (use add_evidence). When complete, call send_to_respondent to generate the invite. The stronger and more specific the record, the better every later phase goes."
      : "The claimant is still assembling the claim. Nothing is required from you yet.";
  }
  if (p === "response") {
    return role === "claimant"
      ? (c.vsAi
        ? "The claim was sent. The practice respondent is reviewing — call get_case_status shortly to see the response."
        : "The claim was sent. Share the invite link with the other party. You will be notified when they respond.")
      : "Review the claim and evidence (review_claim), then submit_response with your position: accept in full, accept partially, or dispute. You may add_evidence of your own. Consider get_reality_check for a neutral read on exposure before responding.";
  }
  if (p === "negotiation") {
    const { ask, bid } = offersForRound(c, c.round);
    const mine = role === "claimant" ? ask : bid;
    const theirs = role === "claimant" ? bid : ask;
    if (!c.mandates[role]) {
      return `Negotiation phase, round ${c.round} of ${MAX_ROUNDS}. FIRST: talk with your human and call set_negotiation_mandate with their private ${role === "claimant" ? "minimum acceptable" : "maximum payable"} amount. The other side can never see it. Then submit_sealed_offer.`;
    }
    if (!mine) {
      return `Round ${c.round} of ${MAX_ROUNDS}: submit your sealed offer (submit_sealed_offer). The other side ${theirs ? "has already submitted" : "has not submitted yet"}. If both offers overlap, the case settles at the midpoint instantly. Offers outside your human's mandate require their explicit confirmation.`;
    }
    return theirs
      ? "Both offers are in — the server is resolving the round."
      : `Your sealed offer for round ${c.round} is in. Waiting for the other side. You can send_message to keep dialogue constructive, or request_mediation to move to a neutral proposal.`;
  }
  if (p === "mediation") {
    const prop = c.mediatorProposals[c.mediatorProposals.length - 1];
    if (!prop) return "Sealed rounds ended without overlap. Call get_mediator_proposal to have the neutral mediator study both sides' full record and propose settlement terms.";
    const my = prop.responses[role];
    if (!my) return `The mediator proposed $${prop.amount}. Discuss it with your human, then respond_to_proposal (accept or decline). If both sides accept, the settlement is drafted.`;
    return `You responded "${my}" to the mediator's proposal ($${prop.amount}). Waiting for the other side's response.`;
  }
  if (p === "agreement") {
    const you = !!c.agreement?.signatures[role];
    const other = !!c.agreement?.signatures[otherRole(role)];
    if (!c.agreement) return "The settlement amount is fixed. Call get_settlement_draft to generate the written agreement for both humans to review.";
    if (!you) return "The settlement agreement is drafted (get_settlement_draft to read it). SIGNING IS HUMAN-ONLY: no tool can sign. Ask your human to read the agreement on the page and sign it themselves with the signature panel.";
    return other ? "Both parties signed. The case is resolving." : "You signed. Waiting for the other party's human signature.";
  }
  if (p === "resolved") {
    return `Case resolved: $${c.settledAmount} settlement, signed by both parties. The agreement PDF is available on the page (get_agreement_summary for the text). Payment is due per its terms.`;
  }
  return "This case is closed.";
}

// ─── Role-filtered view ─────────────────────────────────────────────────────
// The other side's mandate and sealed offers are structurally removed here,
// server-side. An agent (or a prompt-injected agent) cannot obtain them.

export function viewFor(c: DisputeCase, role: Role, origin: string): CaseView {
  const { ask, bid } = offersForRound(c, c.round);
  const yourOfferThisRound = role === "claimant" ? ask : bid;
  const otherOfferThisRound = role === "claimant" ? bid : ask;
  return {
    id: c.id,
    yourRole: role,
    phase: c.phase,
    category: c.category,
    title: c.title,
    currency: c.currency,
    createdAt: c.createdAt,
    vsAi: c.vsAi,
    claim: c.claim,
    response: c.response,
    evidence: c.evidence,
    messages: c.messages,
    yourMandate: c.mandates[role],
    yourOffers: c.offers.filter(o => o.by === role),
    offerStatus: {
      round: c.round,
      youSubmittedThisRound: !!yourOfferThisRound,
      otherSubmittedThisRound: !!otherOfferThisRound,
      roundsRemaining: Math.max(0, MAX_ROUNDS - c.round + (yourOfferThisRound ? 0 : 1)),
    },
    roundSignals: c.roundSignals.map(({ round, overlap, gapDirection, gapChangePct, at }) =>
      ({ round, overlap, gapDirection, gapChangePct, at })),
    settledAmount: c.settledAmount,
    settledVia: c.settledVia,
    mediatorProposals: c.mediatorProposals,
    agreement: c.agreement ? {
      draft: c.agreement.draft,
      terms: c.agreement.terms,
      amount: c.agreement.amount,
      youSigned: !!c.agreement.signatures[role],
      otherSigned: !!c.agreement.signatures[otherRole(role)],
    } : undefined,
    activity: c.activity,
    inviteLink: role === "claimant" && !c.vsAi
      ? `${origin}/case/${c.id}?k=${c.keys.respondent}`
      : undefined,
    respondentJoined: c.phase !== "intake",
    whatNext: whatNext(c, role),
  };
}

export function roleForKey(c: DisputeCase, key: string | null): Role | null {
  if (!key) return null;
  if (key === c.keys.claimant) return "claimant";
  if (key === c.keys.respondent) return "respondent";
  return null;
}

// Central guard: which mutating actions are legal in which phase, for whom.
export const ALLOWED: Record<string, { phases: Phase[]; roles: Role[] }> = {
  update_claim:       { phases: ["intake"], roles: ["claimant"] },
  add_evidence:       { phases: ["intake", "response"], roles: ["claimant", "respondent"] },
  send_to_respondent: { phases: ["intake"], roles: ["claimant"] },
  submit_response:    { phases: ["response"], roles: ["respondent"] },
  set_mandate:        { phases: ["negotiation"], roles: ["claimant", "respondent"] },
  submit_offer:       { phases: ["negotiation"], roles: ["claimant", "respondent"] },
  send_message:       { phases: ["response", "negotiation", "mediation", "agreement"], roles: ["claimant", "respondent"] },
  request_mediation:  { phases: ["negotiation"], roles: ["claimant", "respondent"] },
  respond_proposal:   { phases: ["mediation"], roles: ["claimant", "respondent"] },
  sign:               { phases: ["agreement"], roles: ["claimant", "respondent"] },
};

export function assertAllowed(c: DisputeCase, role: Role, action: string): string | null {
  const rule = ALLOWED[action];
  if (!rule) return `Unknown action "${action}".`;
  if (!rule.roles.includes(role)) return `Procedural rule: the ${role} cannot perform "${action}".`;
  if (!rule.phases.includes(c.phase)) {
    return `Procedural rule: "${action}" is not available in the "${c.phase}" phase. ${whatNext(c, role)}`;
  }
  return null;
}
