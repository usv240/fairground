// ─── Fairground domain model ────────────────────────────────────────────────
// A dispute case moves through a strict procedural state machine. Which
// WebMCP tools exist, for whom, is derived from (phase, role) — procedure
// is enforced by tool availability, not by prompts.

export type Phase =
  | "intake"        // claimant assembles the claim
  | "response"      // respondent has been invited, reviews & responds
  | "negotiation"   // sealed-bid rounds (max 3)
  | "mediation"     // neutral AI mediator proposes terms
  | "agreement"     // settlement drafted, awaiting human signatures
  | "resolved"      // both signed
  | "closed";       // unresolved / withdrawn

export type Role = "claimant" | "respondent";

export type Category =
  | "freelance_invoice"
  | "security_deposit"
  | "purchase_dispute"
  | "shared_expenses"
  | "services_quality"
  | "other";

export interface Evidence {
  id: string;
  by: Role;
  title: string;
  description: string;
  kind: "contract" | "invoice" | "message" | "receipt" | "photo" | "document" | "other";
  addedAt: number;
}

export interface SealedOffer {
  round: number;
  by: Role;
  amount: number;   // claimant: minimum they'd accept · respondent: maximum they'd pay
  note?: string;
  at: number;
}

export interface Mandate {
  limit: number;          // claimant: floor · respondent: ceiling — PRIVATE to that side
  priorities?: string;    // e.g. "speed matters more than the last $100"
  setAt: number;
}

export interface PartyMessage {
  id: string;
  from: Role | "mediator";
  text: string;
  at: number;
}

export interface MediatorProposal {
  id: string;
  amount: number;
  rationale: string;
  terms: string[];
  at: number;
  responses: Partial<Record<Role, "accept" | "decline">>;
  declineReasons?: Partial<Record<Role, string>>;
}

export interface Signature {
  name: string;      // typed full legal name — humans only, no tool can reach this
  signedAt: number;
}

export interface ActivityEntry {
  at: number;
  actor: Role | "system" | "mediator";
  text: string;
}

export interface RoundSignal {
  round: number;
  overlap: false;
  gapDirection: "narrowed" | "widened" | "unchanged" | "first";
  gapChangePct?: number;   // how much the gap moved vs previous round — amounts stay sealed
  at: number;
}

export interface DisputeCase {
  id: string;
  createdAt: number;
  phase: Phase;
  category: Category;
  title: string;
  currency: "USD";
  vsAi: boolean;                    // practice mode: AI plays the respondent
  claim: {
    summary: string;
    amount: number;
    timeline?: string;
    desiredOutcome?: string;
  };
  response?: {
    position: "accept_full" | "accept_partial" | "dispute";
    story: string;
    counterAmount?: number;
  };
  evidence: Evidence[];
  messages: PartyMessage[];
  keys: { claimant: string; respondent: string };
  mandates: Partial<Record<Role, Mandate>>;
  offers: SealedOffer[];
  round: number;                    // 1..3
  roundSignals: RoundSignal[];
  settledAmount?: number;
  settledVia?: "negotiation" | "mediation" | "direct_accept";
  mediatorProposals: MediatorProposal[];
  agreement?: {
    draft: string;
    terms: string[];
    amount: number;
    signatures: Partial<Record<Role, Signature>>;
  };
  aiPersona?: {                     // only for vsAi practice cases — hidden from view
    story: string;
    hiddenCeiling: number;
    style: string;
  };
  // Elicitation: an agent proposing to cross its human's mandate parks the
  // proposal here; only the human's click on the page converts or clears it.
  pendingOverrides?: Partial<Record<Role, { amount: number; reason?: string; at: number }>>;
  fairness?: { sum: number; count: number; rated: Role[] };
  activity: ActivityEntry[];
}

// Role-filtered view sent to each party (and their agent). The other side's
// mandate, sealed offers, and keys are structurally absent — not hidden by UI.
export interface CaseView {
  id: string;
  yourRole: Role;
  phase: Phase;
  category: Category;
  title: string;
  currency: "USD";
  createdAt: number;
  vsAi: boolean;
  claim: DisputeCase["claim"];
  response?: DisputeCase["response"];
  evidence: Evidence[];
  messages: PartyMessage[];
  yourMandate?: Mandate;
  yourOffers: SealedOffer[];
  offerStatus: {
    round: number;
    youSubmittedThisRound: boolean;
    otherSubmittedThisRound: boolean;
    roundsRemaining: number;
  };
  roundSignals: RoundSignal[];
  settledAmount?: number;
  settledVia?: DisputeCase["settledVia"];
  mediatorProposals: MediatorProposal[];
  agreement?: {
    draft: string;
    terms: string[];
    amount: number;
    youSigned: boolean;
    otherSigned: boolean;
    signatures: Partial<Record<Role, Signature>>;  // names are mutual once given
    seal?: string;                                  // tamper-evident record hash
  };
  activity: ActivityEntry[];
  inviteLink?: string;             // claimant only, while respondent hasn't joined
  respondentJoined: boolean;
  yourPendingOverride?: { amount: number; reason?: string; at: number };
  youRatedFairness?: boolean;
  whatNext: string;                // per-role, per-phase guidance surfaced to agents
}

export const MAX_ROUNDS = 3;
