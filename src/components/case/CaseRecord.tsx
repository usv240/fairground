"use client";

import { CaseView } from "@/lib/types";
import { formatMoney, timeAgo } from "@/lib/client";

// Typographic kind tags instead of icons: instantly scannable, no decoration.
function KindTag({ kind }: { kind: string }) {
  return (
    <span className="mt-0.5 inline-block shrink-0 rounded border border-line bg-paper-warm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
      {kind}
    </span>
  );
}

export function CaseRecord({ view }: { view: CaseView }) {
  const yourEvidence = view.evidence.filter(e => e.by === view.yourRole);
  const theirEvidence = view.evidence.filter(e => e.by !== view.yourRole);

  return (
    <div className="space-y-4">
      {/* Claim */}
      <section className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="overline-label">The claim</p>
            <h2 className="font-display text-lg mt-1">{view.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <p className="overline-label">Amount</p>
            <p className="font-display text-2xl text-forest">{formatMoney(view.claim.amount)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft whitespace-pre-wrap">{view.claim.summary}</p>
        {view.claim.timeline && (
          <div className="mt-3 border-t border-line-soft pt-3">
            <p className="overline-label">Timeline</p>
            <p className="mt-1 text-sm text-ink-soft whitespace-pre-wrap">{view.claim.timeline}</p>
          </div>
        )}
      </section>

      {/* Response */}
      {view.response && (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="overline-label">The response</p>
            <span
              className={
                "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                (view.response.position === "accept_full"
                  ? "bg-forest-tint text-forest"
                  : view.response.position === "dispute"
                    ? "bg-clay-tint text-clay"
                    : "bg-brass-tint text-brass")
              }
            >
              {view.response.position.replace(/_/g, " ")}
              {view.response.counterAmount ? ` · indicative ${formatMoney(view.response.counterAmount)}` : ""}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft whitespace-pre-wrap">{view.response.story}</p>
        </section>
      )}

      {/* Evidence */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <p className="overline-label">Evidence record</p>
          <p className="text-xs text-ink-faint">{view.evidence.length} item{view.evidence.length === 1 ? "" : "s"} · visible to both sides</p>
        </div>
        {view.evidence.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint italic">
            Nothing on the record yet. A specific, documented record is what moves the other side.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {[...yourEvidence, ...theirEvidence].map(e => (
              <li key={e.id} className="flex gap-3 rounded-lg border border-line-soft bg-paper px-3.5 py-2.5">
                <KindTag kind={e.kind} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {e.title}
                    <span className={`ml-2 text-xs font-normal ${e.by === view.yourRole ? "text-forest" : "text-brass"}`}>
                      {e.by === view.yourRole ? "your side" : "other side"}
                    </span>
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{e.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Messages */}
      {view.messages.length > 0 && (
        <section className="card p-5">
          <p className="overline-label">Between the parties</p>
          <ul className="mt-3 space-y-2">
            {view.messages.map(m => (
              <li
                key={m.id}
                className={
                  "max-w-[85%] rounded-xl px-3.5 py-2 text-sm leading-relaxed " +
                  (m.from === view.yourRole
                    ? "ml-auto bg-forest-tint text-ink"
                    : m.from === "mediator"
                      ? "mx-auto bg-brass-tint text-ink"
                      : "bg-paper-warm text-ink")
                }
              >
                <span className="block text-[11px] font-semibold text-ink-faint mb-0.5">
                  {m.from === view.yourRole ? "You" : m.from === "mediator" ? "Mediator" : "Other party"} · {timeAgo(m.at)}
                </span>
                {m.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
