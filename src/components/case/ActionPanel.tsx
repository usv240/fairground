"use client";

import { useState } from "react";
import { CaseView, MAX_ROUNDS } from "@/lib/types";
import { apiAction, apiAi, formatMoney, ApiError } from "@/lib/client";

type Assessment = {
  strengths: string[]; weaknesses: string[]; likelyOutcome: string; recommendation: string;
};

export function ActionPanel({
  view, caseId, accessKey, refresh,
}: {
  view: CaseView;
  caseId: string;
  accessKey: string;
  refresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setFlash(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setFlash({ kind: "err", text: e instanceof ApiError ? e.message : "Something went wrong — try again." });
    } finally {
      setBusy(false);
    }
  }

  const act = (payload: Record<string, unknown>, okText?: string) =>
    run(async () => {
      const res = await apiAction(caseId, accessKey, payload);
      setFlash({ kind: "ok", text: okText ?? res.message });
    });

  return (
    <div className="space-y-4">
      {flash && (
        <div
          className={
            "rounded-lg border px-4 py-3 text-sm " +
            (flash.kind === "ok"
              ? "border-forest/30 bg-forest-tint text-forest-deep"
              : "border-clay/30 bg-clay-tint text-clay")
          }
        >
          {flash.text}
        </div>
      )}

      {view.phase === "intake" && view.yourRole === "claimant" && (
        <IntakePanel view={view} busy={busy} act={act} />
      )}

      {view.phase === "response" && view.yourRole === "respondent" && (
        <RespondPanel busy={busy} act={act} caseId={caseId} accessKey={accessKey} />
      )}

      {view.phase === "response" && view.yourRole === "claimant" && (
        <WaitingCard
          title={view.vsAi ? "The practice counterpart is reviewing" : "Waiting for the other party"}
          body={view.vsAi
            ? "The AI counterpart is reading your claim and will file a formal response in a moment."
            : "Your claim has been served. Share the invite link (right panel) with the other party — you'll see their response here the moment they file it."}
        />
      )}

      {view.phase === "negotiation" && (
        <NegotiationPanel view={view} busy={busy} act={act} caseId={caseId} accessKey={accessKey} />
      )}

      {view.phase === "mediation" && (
        <MediationPanel view={view} busy={busy} act={act} run={run} caseId={caseId} accessKey={accessKey} />
      )}

      {(view.phase === "agreement" || view.phase === "resolved") && (
        <AgreementPanel view={view} busy={busy} act={act} run={run} caseId={caseId} accessKey={accessKey} />
      )}

      {view.phase === "closed" && (
        <div className="card p-5">
          <p className="overline-label text-clay">Case closed without settlement</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Mediation did not produce agreement. Nothing here waived any rights: the full case record on this
            page — claim, response, evidence, and the fact that settlement was attempted in good faith — is
            exactly the preparation a small-claims filing needs. Print this page for your records.
          </p>
          <button className="btn btn-quiet mt-4" onClick={() => window.print()}>Print case record</button>
        </div>
      )}
    </div>
  );
}

function WaitingCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <p className="overline-label seal-pulse">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

// ─── Intake ─────────────────────────────────────────────────────────────────

function IntakePanel({
  view, busy, act,
}: {
  view: CaseView; busy: boolean; act: (p: Record<string, unknown>, ok?: string) => void;
}) {
  const [evTitle, setEvTitle] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evKind, setEvKind] = useState("document");

  return (
    <div className="card p-5">
      <p className="overline-label">Build the record, then serve the claim</p>
      <p className="mt-2 text-sm text-ink-soft leading-relaxed">
        Add each piece of evidence you have — contracts, invoices, messages, receipts. You can do this by
        hand here, or simply tell your agent what you have and let it file everything for you.
      </p>

      <div className="mt-4 space-y-2.5">
        <input className="field" placeholder="Evidence title — e.g. “Signed contract, March 3”"
          value={evTitle} onChange={e => setEvTitle(e.target.value)} />
        <textarea className="field min-h-20" placeholder="What does it show, and why does it matter?"
          value={evDesc} onChange={e => setEvDesc(e.target.value)} />
        <div className="flex items-center gap-2.5">
          <select className="field w-auto" value={evKind} onChange={e => setEvKind(e.target.value)}>
            {["contract", "invoice", "message", "receipt", "photo", "document", "other"].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            disabled={busy || !evTitle.trim() || !evDesc.trim()}
            onClick={() => {
              act({ type: "add_evidence", title: evTitle, description: evDesc, kind: evKind });
              setEvTitle(""); setEvDesc("");
            }}
          >
            Add to record
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-line-soft pt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-faint">
          {view.evidence.length === 0 ? "Tip: even one documented item changes the negotiation." : `${view.evidence.length} item(s) on the record.`}
        </p>
        <button className="btn btn-primary" disabled={busy}
          onClick={() => act({ type: "send_to_respondent" })}>
          {view.vsAi ? "Serve claim → practice counterpart" : "Serve claim → get invite link"}
        </button>
      </div>
    </div>
  );
}

// ─── Response ───────────────────────────────────────────────────────────────

function RespondPanel({
  busy, act, caseId, accessKey,
}: {
  busy: boolean; act: (p: Record<string, unknown>, ok?: string) => void;
  caseId: string; accessKey: string;
}) {
  const [position, setPosition] = useState<"accept_full" | "accept_partial" | "dispute">("dispute");
  const [story, setStory] = useState("");
  const [counter, setCounter] = useState("");
  const [check, setCheck] = useState<Assessment | null>(null);
  const [checking, setChecking] = useState(false);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="overline-label">Your formal response</p>
        <p className="mt-2 text-sm text-ink-soft leading-relaxed">
          A claim has been made against you. Respond formally — or ask your agent for a private
          reality check first, so you know where you actually stand.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ["dispute", "Dispute it"],
            ["accept_partial", "Partly accept"],
            ["accept_full", "Accept in full"],
          ] as const).map(([val, label]) => (
            <button key={val}
              className={`btn ${position === val ? "btn-primary" : "btn-quiet"}`}
              onClick={() => setPosition(val)}>
              {label}
            </button>
          ))}
        </div>

        <textarea className="field min-h-24 mt-3"
          placeholder="Your account of what happened, in plain language…"
          value={story} onChange={e => setStory(e.target.value)} />

        {position !== "accept_full" && (
          <input className="field mt-2.5" type="number" min={0}
            placeholder="Optional: indicative counter-amount in USD (non-binding)"
            value={counter} onChange={e => setCounter(e.target.value)} />
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button className="btn btn-quiet" disabled={checking}
            onClick={async () => {
              setChecking(true);
              try {
                const res = await apiAi(caseId, accessKey, "reality_check");
                setCheck(res.assessment);
              } finally {
                setChecking(false);
              }
            }}>
            {checking ? "Assessing…" : "Private reality check"}
          </button>
          <button className="btn btn-primary" disabled={busy || !story.trim()}
            onClick={() => act({
              type: "submit_response", position, story,
              counterAmount: counter ? Number(counter) : undefined,
            })}>
            File response
          </button>
        </div>
      </div>

      {check && <RealityCheckCard a={check} />}
    </div>
  );
}

function RealityCheckCard({ a }: { a: Assessment }) {
  return (
    <div className="card p-5 border-brass/40">
      <p className="overline-label text-brass">Private reality check — your side only</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <p className="font-semibold text-forest">Strengths</p>
          <ul className="mt-1 space-y-1 text-ink-soft">{a.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
        </div>
        <div>
          <p className="font-semibold text-clay">Weaknesses</p>
          <ul className="mt-1 space-y-1 text-ink-soft">{a.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}</ul>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-soft"><span className="font-semibold text-ink">If this went to court: </span>{a.likelyOutcome}</p>
      <p className="mt-2 text-sm text-ink-soft"><span className="font-semibold text-ink">Recommendation: </span>{a.recommendation}</p>
    </div>
  );
}

// ─── Negotiation ────────────────────────────────────────────────────────────

function NegotiationPanel({
  view, busy, act, caseId, accessKey,
}: {
  view: CaseView; busy: boolean; act: (p: Record<string, unknown>, ok?: string) => void;
  caseId: string; accessKey: string;
}) {
  const [limit, setLimit] = useState("");
  const [priorities, setPriorities] = useState("");
  const [offer, setOffer] = useState("");
  const [check, setCheck] = useState<Assessment | null>(null);
  const [checking, setChecking] = useState(false);
  const o = view.offerStatus;
  const isClaimant = view.yourRole === "claimant";

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="overline-label">Sealed offers — round {o.round} of {MAX_ROUNDS}</p>
          <span className="text-xs text-ink-faint">numbers never cross the table</span>
        </div>

        {/* Round status */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SealedSlot label="Your envelope" submitted={o.youSubmittedThisRound} yours />
          <SealedSlot label="Their envelope" submitted={o.otherSubmittedThisRound} />
        </div>

        {view.roundSignals.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {view.roundSignals.map(s => (
              <p key={s.round} className="text-xs rounded-md bg-paper-warm px-3 py-1.5 text-ink-soft">
                Round {s.round}: no overlap — the gap {s.gapDirection === "first" ? "was measured" : `${s.gapDirection}${s.gapChangePct != null ? ` by ${s.gapChangePct}%` : ""}`}. Amounts stay sealed.
              </p>
            ))}
          </div>
        )}

        {!view.yourMandate ? (
          <div className="mt-4 border-t border-line-soft pt-4">
            <p className="text-sm font-semibold">First: set your private mandate</p>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              {isClaimant
                ? "The lowest amount you would truly accept. Your agent cannot bid below it without coming back to you — and the other side can never see it."
                : "The highest amount you would truly pay. Your agent cannot bid above it without coming back to you — and the other side can never see it."}
            </p>
            <div className="mt-2.5 flex gap-2.5">
              <input className="field" type="number" min={0} placeholder={isClaimant ? "Your floor (USD)" : "Your ceiling (USD)"}
                value={limit} onChange={e => setLimit(e.target.value)} />
              <button className="btn btn-primary shrink-0" disabled={busy || !limit}
                onClick={() => act({ type: "set_mandate", limit: Number(limit), priorities })}>
                Seal it
              </button>
            </div>
            <input className="field mt-2" placeholder="Optional: what matters besides money (speed, relationship…)"
              value={priorities} onChange={e => setPriorities(e.target.value)} />
          </div>
        ) : !o.youSubmittedThisRound ? (
          <div className="mt-4 border-t border-line-soft pt-4">
            <p className="text-sm font-semibold">Your sealed offer for round {o.round}</p>
            <p className="mt-1 text-xs text-ink-soft">
              Private mandate on file: {isClaimant ? "floor" : "ceiling"} {formatMoney(view.yourMandate.limit)}.
              If the two envelopes overlap, the case settles at the midpoint instantly.
            </p>
            <div className="mt-2.5 flex gap-2.5">
              <input className="field" type="number" min={0}
                placeholder={isClaimant ? "Lowest you'd accept this round (USD)" : "Highest you'd pay this round (USD)"}
                value={offer} onChange={e => setOffer(e.target.value)} />
              <button className="btn btn-primary shrink-0" disabled={busy || !offer}
                onClick={() => { act({ type: "submit_offer", amount: Number(offer) }); setOffer(""); }}>
                Seal &amp; submit
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 border-t border-line-soft pt-4 text-sm text-ink-soft seal-pulse">
            Your envelope for round {o.round} is sealed and in. Waiting for the other side…
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button className="btn btn-quiet" disabled={checking}
          onClick={async () => {
            setChecking(true);
            try {
              const res = await apiAi(caseId, accessKey, "reality_check");
              setCheck(res.assessment);
            } finally {
              setChecking(false);
            }
          }}>
          {checking ? "Assessing…" : "Private reality check"}
        </button>
        <button className="btn btn-quiet" disabled={busy}
          onClick={() => act({ type: "request_mediation" })}>
          Skip to neutral mediation
        </button>
      </div>

      {check && <RealityCheckCard a={check} />}
    </div>
  );
}

function SealedSlot({ label, submitted, yours }: { label: string; submitted: boolean; yours?: boolean }) {
  return (
    <div className={`rounded-lg border px-3.5 py-3 text-center ${submitted ? "border-forest/40 bg-forest-tint" : "border-dashed border-line bg-paper"}`}>
      <p className="text-lg" aria-hidden>{submitted ? "✉️" : "▢"}</p>
      <p className="mt-0.5 text-xs font-medium">{label}</p>
      <p className={`text-[11px] ${submitted ? "text-forest font-semibold" : "text-ink-faint"}`}>
        {submitted ? "sealed & submitted" : yours ? "not yet submitted" : "pending"}
      </p>
    </div>
  );
}

// ─── Mediation ──────────────────────────────────────────────────────────────

function MediationPanel({
  view, busy, act, run, caseId, accessKey,
}: {
  view: CaseView; busy: boolean;
  act: (p: Record<string, unknown>, ok?: string) => void;
  run: (fn: () => Promise<unknown>) => void;
  caseId: string; accessKey: string;
}) {
  const prop = view.mediatorProposals[view.mediatorProposals.length - 1];
  const yourResponse = prop?.responses[view.yourRole];
  const declined = prop && Object.values(prop.responses).includes("decline");

  return (
    <div className="card p-5">
      <p className="overline-label text-brass">Neutral mediation</p>

      {!prop || (declined && view.mediatorProposals.length < 2) ? (
        <>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            {declined
              ? "The first proposal was declined. The mediator can issue one final revised proposal."
              : "Sealed rounds ended without overlap. The mediator will study the whole record — including, like a real mediator in caucus, the sealed offer history — and put one number on the table."}
          </p>
          <button className="btn btn-primary mt-4" disabled={busy}
            onClick={() => run(() => apiAi(caseId, accessKey, "mediator_propose"))}>
            {busy ? "The mediator is reviewing the full record…" : declined ? "Request final proposal" : "Bring in the mediator"}
          </button>
          {busy && <p className="mt-2 text-xs text-ink-faint seal-pulse">Weighing evidence, sealed history, and both accounts — usually 10–20 seconds.</p>}
        </>
      ) : (
        <>
          <div className="mt-3 rounded-lg bg-brass-tint px-4 py-3">
            <p className="text-xs font-semibold text-brass">Proposal {view.mediatorProposals.length} of 2</p>
            <p className="font-display text-3xl mt-1">{formatMoney(prop.amount)}</p>
          </div>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">{prop.rationale}</p>
          <ol className="mt-3 space-y-1 text-sm text-ink-soft list-decimal list-inside">
            {prop.terms.map((t, i) => <li key={i}>{t}</li>)}
          </ol>

          {!yourResponse ? (
            <div className="mt-4 flex gap-2.5">
              <button className="btn btn-primary" disabled={busy}
                onClick={() => act({ type: "respond_proposal", decision: "accept" })}>
                Accept proposal
              </button>
              <button className="btn btn-quiet" disabled={busy}
                onClick={() => act({ type: "respond_proposal", decision: "decline" })}>
                Decline
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">
              You <span className="font-semibold">{yourResponse}ed</span>. Waiting for the other side…
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Agreement & signature ──────────────────────────────────────────────────

function AgreementPanel({
  view, busy, act, run, caseId, accessKey,
}: {
  view: CaseView; busy: boolean;
  act: (p: Record<string, unknown>, ok?: string) => void;
  run: (fn: () => Promise<unknown>) => void;
  caseId: string; accessKey: string;
}) {
  const [name, setName] = useState("");
  const a = view.agreement;
  const resolved = view.phase === "resolved";

  if (!a) {
    return (
      <div className="card p-5">
        <p className="overline-label">Settlement reached — {formatMoney(view.settledAmount)}</p>
        <p className="mt-2 text-sm text-ink-soft leading-relaxed">
          The number is fixed. Now it becomes a written agreement in plain language, for both of you to read
          and sign.
        </p>
        <button className="btn btn-primary mt-4" disabled={busy}
          onClick={() => run(() => apiAi(caseId, accessKey, "draft_agreement"))}>
          {busy ? "Drafting in plain language…" : "Draft the agreement"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-6 print-sheet">
        <p className="overline-label">Settlement agreement{resolved ? " — fully signed" : ""}</p>
        <div className="mt-3 whitespace-pre-wrap font-display text-[15px] leading-relaxed">{a.draft}</div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
          <SignatureBlock label="Claimant" signed={view.yourRole === "claimant" ? a.youSigned : a.otherSigned} />
          <SignatureBlock label="Respondent" signed={view.yourRole === "respondent" ? a.youSigned : a.otherSigned} />
        </div>
      </div>

      {!resolved && !a.youSigned && (
        <div className="card p-5 border-forest/40">
          <p className="overline-label text-forest">Signature — humans only</p>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            This is the one step no agent can take. Fairground exposes no signing tool: read the agreement
            above yourself, then sign with your own hands.
          </p>
          <div className="mt-3 flex gap-2.5">
            <input className="field font-display italic" placeholder="Type your full legal name"
              value={name} onChange={e => setName(e.target.value)} />
            <button className="btn btn-primary shrink-0" disabled={busy || name.trim().length < 3}
              onClick={() => act({ type: "sign", name: name.trim() })}>
              Sign agreement
            </button>
          </div>
        </div>
      )}

      {!resolved && a.youSigned && (
        <p className="text-sm text-ink-soft seal-pulse">Signed. Waiting for the other party's signature…</p>
      )}

      {resolved && (
        <div className="flex items-center gap-2.5">
          <button className="btn btn-primary" onClick={() => window.print()}>Print / save PDF</button>
          <p className="text-xs text-ink-faint">Keep a copy. Payment is due per the terms above.</p>
        </div>
      )}
    </div>
  );
}

function SignatureBlock({ label, signed }: { label: string; signed: boolean }) {
  return (
    <div>
      <p className="overline-label">{label}</p>
      {signed
        ? <p className="mt-1 font-display italic text-forest">✓ Signed</p>
        : <p className="mt-1 text-ink-faint">Awaiting signature</p>}
    </div>
  );
}
