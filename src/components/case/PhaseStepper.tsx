"use client";

import { Phase } from "@/lib/types";

const STEPS: { key: Phase; label: string }[] = [
  { key: "intake", label: "Intake" },
  { key: "response", label: "Response" },
  { key: "negotiation", label: "Sealed offers" },
  { key: "mediation", label: "Mediation" },
  { key: "agreement", label: "Agreement" },
  { key: "resolved", label: "Resolved" },
];

export function PhaseStepper({ phase }: { phase: Phase }) {
  if (phase === "closed") {
    return (
      <div className="flex items-center gap-2 text-sm text-clay">
        <span className="step-dot bg-clay" />
        Case closed without settlement — all rights preserved
      </div>
    );
  }
  const idx = STEPS.findIndex(s => s.key === phase);
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.key} className="flex items-center gap-1">
            {i > 0 && <span className={`h-px w-4 sm:w-7 ${i <= idx ? "bg-forest" : "bg-line"}`} />}
            <span
              className={
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
                (state === "current"
                  ? "bg-forest text-white"
                  : state === "done"
                    ? "text-forest"
                    : "text-ink-faint")
              }
            >
              <span
                className={`step-dot ${state === "current" ? "bg-white" : state === "done" ? "bg-forest" : "bg-line"}`}
              />
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
