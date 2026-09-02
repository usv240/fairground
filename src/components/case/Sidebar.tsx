"use client";

import { useEffect, useState } from "react";
import { CaseView } from "@/lib/types";
import { timeAgo } from "@/lib/client";
import { AgentActivity } from "@/components/AgentTools";

declare global {
  interface Document {
    modelContext?: unknown;
  }
}

export function WebMCPBadge() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    setSupported(typeof document !== "undefined" && "modelContext" in document && !!document.modelContext);
  }, []);
  if (supported === null) return null;
  return supported ? (
    <div className="rounded-lg border border-forest/30 bg-forest-tint px-3.5 py-2.5 text-xs text-forest-deep">
      <span className="font-semibold">● WebMCP active.</span> This page is exposing live tools to your
      agent. Open your browser&apos;s AI side panel and just talk to it about the case.
    </div>
  ) : (
    <div className="rounded-lg border border-line bg-paper-warm px-3.5 py-2.5 text-xs text-ink-soft">
      <span className="font-semibold">○ Agent tools dormant.</span> Everything works by hand, but
      Fairground shines with an agent. Open this page in ChatGPT&apos;s browser, or Chrome 149+ with{" "}
      <code className="text-[11px]">chrome://flags/#enable-webmcp-testing</code>.
    </div>
  );
}

export function InvitePanel({ view }: { view: CaseView }) {
  const [copied, setCopied] = useState(false);
  if (!view.inviteLink || view.phase === "intake") return null;
  if (view.respondentJoined && view.response) return null;
  return (
    <div className="card p-4">
      <p className="overline-label">Invite the other party</p>
      <p className="mt-1.5 text-xs text-ink-soft leading-relaxed">
        Send them this link any way you like. They open it with <em>their own</em> agent, and Fairground
        shows each side only its own private information.
      </p>
      <div className="mt-2.5 flex gap-2">
        <input readOnly className="field text-xs" aria-label="Invite link for the other party" value={view.inviteLink} onFocus={e => e.target.select()} />
        <button
          className="btn btn-secondary shrink-0 text-xs px-3"
          onClick={async () => {
            await navigator.clipboard.writeText(view.inviteLink!);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function AgentFeed({ activities }: { activities: AgentActivity[] }) {
  return (
    <div className="card p-4">
      <p className="overline-label">Your agent on this page</p>
      {activities.length === 0 ? (
        <p className="mt-2 text-xs text-ink-faint leading-relaxed">
          When your agent uses the case tools, every move it makes appears here, so you always see what
          is done in your name.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
          {[...activities].reverse().map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span aria-hidden className="mt-1.5 step-dot shrink-0 bg-forest" />
              <div>
                <p className="text-ink">{a.summary}</p>
                <p className="text-[10px] text-ink-faint">{a.tool} · {timeAgo(a.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CaseLog({ view }: { view: CaseView }) {
  return (
    <div className="card p-4">
      <p className="overline-label">Case log</p>
      <ul className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
        {[...view.activity].reverse().map((e, i) => (
          <li key={i} className="text-xs leading-relaxed">
            <span
              className={
                "font-semibold " +
                (e.actor === "system" ? "text-ink-faint"
                  : e.actor === "mediator" ? "text-brass"
                    : e.actor === view.yourRole ? "text-forest" : "text-clay")
              }
            >
              {e.actor === view.yourRole ? "you" : e.actor}
            </span>{" "}
            <span className="text-ink-soft">{e.text}</span>
            <span className="text-ink-faint"> · {timeAgo(e.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
