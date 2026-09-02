"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCase, rememberCase, storedKeyFor } from "@/lib/client";
import { CaseAgentTools, AgentActivity } from "@/components/AgentTools";
import { PhaseStepper } from "@/components/case/PhaseStepper";
import { CaseRecord } from "@/components/case/CaseRecord";
import { ActionPanel } from "@/components/case/ActionPanel";
import { WebMCPBadge, InvitePanel, AgentFeed, CaseLog } from "@/components/case/Sidebar";

export default function CasePage() {
  return (
    <Suspense fallback={<CenteredNote text="Opening the case room…" />}>
      <CaseRoom />
    </Suspense>
  );
}

function CaseRoom() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const urlKey = search.get("k");

  const accessKey = useMemo(
    () => urlKey ?? storedKeyFor(id)?.key ?? null,
    [urlKey, id],
  );

  const { view, error, isLoading, refresh } = useCase(id, accessKey);
  const [agentLog, setAgentLog] = useState<AgentActivity[]>([]);

  // One-time orientation for first-time visitors, per browser.
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("fairground.intro.dismissed")) setShowIntro(true);
    } catch { /* private mode */ }
  }, []);
  const dismissIntro = () => {
    setShowIntro(false);
    try { localStorage.setItem("fairground.intro.dismissed", "1"); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (view && accessKey) {
      rememberCase({
        caseId: view.id, key: accessKey, role: view.yourRole,
        title: view.title, savedAt: Date.now(),
      });
    }
  }, [view, accessKey]);

  if (!accessKey) {
    return <CenteredNote text="This case needs an access link. Ask the person who opened it to send you your invite link." />;
  }
  if (error) {
    return <CenteredNote text={error.status === 403
      ? "This access link isn't valid for this case. Check you used your own invite link."
      : "Case not found — it may have expired."} />;
  }
  if (isLoading || !view) {
    return <CenteredNote text="Opening the case room…" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <CaseAgentTools
        view={view} caseId={id} accessKey={accessKey}
        onAct={a => setAgentLog(l => [...l, a])}
        refresh={() => void refresh()}
      />

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg tracking-tight text-forest">⚖️ Fairground</Link>
          <span className={
            "rounded-full px-3 py-1 text-xs font-semibold " +
            (view.yourRole === "claimant" ? "bg-forest-tint text-forest" : "bg-brass-tint text-brass")
          }>
            You are the {view.yourRole}{view.vsAi ? " · practice case" : ""}
          </span>
        </div>
        <h1 className="font-display text-2xl mt-3 tracking-tight">{view.title}</h1>
        <div className="mt-3">
          <PhaseStepper phase={view.phase} />
        </div>
      </header>

      {showIntro && (
        <div className="mb-5 rounded-xl border border-forest/25 bg-forest-tint px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm leading-relaxed text-forest-deep">
              <p className="font-semibold">New here? Three things to know.</p>
              <ul className="mt-1.5 space-y-1">
                <li>
                  <span className="font-semibold">1.</span> You are the {view.yourRole} in this case.{" "}
                  {view.vsAi
                    ? "The other side is played by an AI, so you can rehearse safely."
                    : "The other party sees this same case from their own side."}
                </li>
                <li>
                  <span className="font-semibold">2.</span> The top panel always shows your one next step.
                  Everything below it is the shared case record.
                </li>
                <li>
                  <span className="font-semibold">3.</span> Nothing becomes binding until both humans sign
                  at the end, and your private numbers are never shown to the other side.
                </li>
              </ul>
            </div>
            <button className="btn btn-quiet shrink-0 text-xs" onClick={dismissIntro}>Got it</button>
          </div>
        </div>
      )}

      {/* Body */}
      <main className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* When a case closes unresolved, the whole record becomes the printable
            court-prep document (the agreement sheet plays that role otherwise). */}
        <div className={`space-y-5 min-w-0 ${view.phase === "closed" ? "print-sheet" : ""}`}>
          <ActionPanel view={view} caseId={id} accessKey={accessKey} refresh={() => void refresh()} />
          <CaseRecord view={view} />
        </div>
        <aside className="space-y-4">
          <WebMCPBadge />
          <InvitePanel view={view} />
          <AgentFeed activities={agentLog} />
          <CaseLog view={view} />
          <p className="px-1 text-[11px] leading-relaxed text-ink-faint">
            Fairground structures settlement between parties; it does not give legal advice, and nothing here
            waives any right before you sign. Signing is always a human act.
          </p>
        </aside>
      </main>
    </div>
  );
}

function CenteredNote({ text }: { text: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <p className="text-sm text-ink-soft">{text}</p>
    </div>
  );
}
