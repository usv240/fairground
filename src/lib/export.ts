import { DisputeCase, Role } from "./types";
import { otherRole } from "./machine";

// Court-preparation export. Produced for ONE party, so it carries the shared
// record plus that party's own sealed history, and never the other side's
// numbers. This is the document a small-claims filing actually needs: what was
// claimed, what was answered, what evidence exists, and proof that settlement
// was attempted in good faith before filing.

const dt = (ts: number) =>
  new Date(ts).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function buildCaseRecordExport(c: DisputeCase, role: Role): string {
  const you = role === "claimant" ? "Claimant" : "Respondent";
  const them = role === "claimant" ? "Respondent" : "Claimant";
  const L: string[] = [];

  L.push("FAIRGROUND CASE RECORD");
  L.push("Prepared for the " + you + " · Case reference " + c.id);
  L.push("Generated " + dt(Date.now()));
  L.push("");
  L.push("This document summarises a documented, good-faith attempt to settle a civil dispute");
  L.push("before filing. It is a factual record, not legal advice.");
  L.push("");
  L.push("─".repeat(70));
  L.push("");

  L.push("1. THE DISPUTE");
  L.push("");
  L.push("   Matter:        " + c.title);
  L.push("   Category:      " + c.category.replace(/_/g, " "));
  L.push("   Amount claimed: $" + c.claim.amount.toLocaleString());
  L.push("   Case opened:   " + dt(c.createdAt));
  L.push("   Status:        " + (c.phase === "closed"
    ? "Closed without settlement. All rights preserved."
    : c.phase === "resolved"
      ? "Resolved by signed settlement of $" + (c.settledAmount ?? 0).toLocaleString()
      : "In progress (" + c.phase + ")"));
  L.push("");

  L.push("2. THE CLAIM (as filed by the Claimant)");
  L.push("");
  L.push(wrap(c.claim.summary, 3));
  if (c.claim.timeline) {
    L.push("");
    L.push("   Timeline as stated:");
    L.push(wrap(c.claim.timeline, 3));
  }
  if (c.claim.desiredOutcome) {
    L.push("");
    L.push("   Outcome sought:");
    L.push(wrap(c.claim.desiredOutcome, 3));
  }
  L.push("");

  L.push("3. THE RESPONSE");
  L.push("");
  if (!c.response) {
    L.push("   No response was filed by the Respondent.");
  } else {
    L.push("   Position stated: " + c.response.position.replace(/_/g, " "));
    if (c.response.counterAmount != null) {
      L.push("   Indicative counter-figure: $" + c.response.counterAmount.toLocaleString() + " (non-binding)");
    }
    L.push("");
    L.push(wrap(c.response.story, 3));
  }
  L.push("");

  L.push("4. EVIDENCE ON THE RECORD (" + c.evidence.length + " item" + (c.evidence.length === 1 ? "" : "s") + ")");
  L.push("");
  if (c.evidence.length === 0) {
    L.push("   No evidence was filed by either party.");
  } else {
    c.evidence.forEach((e, i) => {
      const by = e.by === role ? "filed by you" : "filed by the " + them.toLowerCase();
      L.push("   " + (i + 1) + ". " + e.title + "  [" + e.kind + ", " + by + ", " + dt(e.addedAt) + "]");
      L.push(wrap(e.description, 6));
      if (i < c.evidence.length - 1) L.push("");
    });
  }
  L.push("");

  if (c.messages.length > 0) {
    L.push("5. CORRESPONDENCE BETWEEN THE PARTIES");
    L.push("");
    c.messages.forEach(m => {
      L.push("   [" + dt(m.at) + "] " + (m.from === role ? "You" : them) + ":");
      L.push(wrap(m.text, 6));
      L.push("");
    });
  }

  const n = c.messages.length > 0 ? 6 : 5;
  L.push(n + ". SETTLEMENT ATTEMPT");
  L.push("");
  L.push("   The parties used a structured sealed-offer process. Each side privately set a");
  L.push("   limit its representative could not cross, then exchanged offers that were compared");
  L.push("   by the platform without being revealed to the other side.");
  L.push("");
  const yourOffers = c.offers.filter(o => o.by === role);
  L.push("   Sealed rounds used: " + Math.min(c.round, 3) + " of 3");
  if (yourOffers.length > 0) {
    L.push("   Your sealed offers (the other party never saw these):");
    yourOffers.forEach(o => L.push("      Round " + o.round + ": $" + o.amount.toLocaleString() + "  (" + dt(o.at) + ")"));
  }
  if (c.offers.some(o => o.by === otherRole(role))) {
    L.push("   The " + them.toLowerCase() + " also submitted sealed offers. Their amounts remain sealed and");
    L.push("   are not disclosed in this record.");
  }
  for (const s of c.roundSignals) {
    L.push("      Round " + s.round + " outcome: no overlap; gap " + s.gapDirection +
      (s.gapChangePct != null ? " by " + s.gapChangePct + "%" : ""));
  }
  L.push("");
  if (c.mediatorProposals.length > 0) {
    L.push("   Neutral mediation was used. Proposals put to both parties:");
    c.mediatorProposals.forEach((p, i) => {
      L.push("      Proposal " + (i + 1) + ": $" + p.amount.toLocaleString() + " (" + dt(p.at) + ")");
      L.push("         Claimant: " + (p.responses.claimant ?? "no response") +
        " · Respondent: " + (p.responses.respondent ?? "no response"));
    });
    L.push("");
  }

  L.push((n + 1) + ". OUTCOME");
  L.push("");
  if (c.phase === "resolved" && c.agreement) {
    L.push("   The parties reached a signed settlement of $" + c.agreement.amount.toLocaleString() + ".");
    const cs = c.agreement.signatures.claimant, rs = c.agreement.signatures.respondent;
    if (cs) L.push("      Claimant signed as \"" + cs.name + "\" on " + dt(cs.signedAt));
    if (rs) L.push("      Respondent signed as \"" + rs.name + "\" on " + dt(rs.signedAt));
    L.push("");
    L.push("   Agreed terms:");
    c.agreement.terms.forEach((t, i) => L.push("      " + (i + 1) + ". " + t));
  } else if (c.phase === "closed") {
    L.push("   No settlement was reached. The parties attempted resolution in good faith and");
    L.push("   were unable to agree. No admission of liability was made by either party, and");
    L.push("   neither party waived any right, including the right to bring a claim in court.");
    L.push("");
    L.push("   This record may be produced to show that pre-filing settlement was attempted.");
  } else {
    L.push("   This case is still in progress; the record above reflects its state at generation.");
  }
  L.push("");
  L.push("─".repeat(70));
  L.push("");
  L.push("Fairground structures voluntary settlement between parties. It is not a law firm and");
  L.push("does not provide legal advice. Nothing in this record is binding on either party unless");
  L.push("it appears in a settlement agreement signed by both of them.");
  L.push("");
  L.push("Case reference " + c.id + " · fairground-umber.vercel.app");

  return L.join("\n");
}

// Simple indent-and-wrap so the export reads well as a printed document.
function wrap(text: string, indent: number, width = 66): string {
  const pad = " ".repeat(indent);
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = pad;
    for (const word of para.trim().split(/\s+/)) {
      if (line.length + word.length + 1 > width + indent) {
        out.push(line);
        line = pad + word;
      } else {
        line = line === pad ? pad + word : line + " " + word;
      }
    }
    if (line.trim()) out.push(line);
  }
  return out.join("\n");
}
