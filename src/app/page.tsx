"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LandingAgentTools } from "@/components/AgentTools";
import { apiCreateCase, rememberCase, listStoredCases, StoredCaseRef, ApiError } from "@/lib/client";
import { WebMCPBadge } from "@/components/case/Sidebar";

export default function Landing() {
  const router = useRouter();
  const [myCases, setMyCases] = useState<StoredCaseRef[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("freelance_invoice");
  const [practice, setPractice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setMyCases(listStoredCases()), []);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiCreateCase({
        title, summary, amount: Number(amount), category, vsAi: practice,
      });
      rememberCase({ caseId: res.caseId, key: res.yourKey, role: "claimant", title, savedAt: Date.now() });
      router.push(`/case/${res.caseId}?k=${res.yourKey}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not open the case — try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <LandingAgentTools />

      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="font-display text-xl tracking-tight text-forest">⚖️ Fairground</span>
        <div className="flex items-center gap-5 text-sm">
          <a href="#how" className="text-ink-soft hover:text-ink">How it works</a>
          <a href="#agents" className="text-ink-soft hover:text-ink">For agents</a>
          <a href="#start" className="btn btn-primary py-2">Start a case</a>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto w-full max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pt-16">
        <div className="max-w-3xl">
          <p className="overline-label text-brass">A neutral ground for people and their agents</p>
          <h1 className="font-display mt-3 text-4xl leading-[1.1] tracking-tight sm:text-6xl">
            Justice, for disputes too small for lawyers.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            The unpaid invoice. The withheld deposit. The refund that never came. For everyday disputes,
            pursuing what you're owed costs more than the money at stake — so most people give up.
            On Fairground, you and the other party each bring your own AI advocate to a neutral table:
            sealed offers, a neutral mediator, and a settlement only humans can sign.{" "}
            <span className="text-ink font-medium">Minutes, not months.</span>
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#start" className="btn btn-primary text-base px-6 py-3">Start a real case</a>
            <a href="#start" onClick={() => setPractice(true)} className="btn btn-secondary text-base px-6 py-3">
              Rehearse against an AI counterpart
            </a>
          </div>
          <div className="mt-6 max-w-xl"><WebMCPBadge /></div>
        </div>
      </header>

      {/* The problem */}
      <section className="border-y border-line bg-paper-warm">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <Stat big="92%" text="of low-income Americans' civil legal problems get no meaningful legal help — the “justice gap.” (Legal Services Corporation)" />
          <Stat big="71%" text="of freelancers have struggled to collect payment at least once; most simply write it off. (Freelancers Union)" />
          <Stat big="60M+" text="disputes a year are already resolved by software at eBay alone — proof structured resolution works at scale." />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="overline-label">How it works</p>
        <h2 className="font-display mt-2 text-3xl tracking-tight">Five moves to a signed settlement</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <Step n={1} title="State your case" text="Tell your agent what happened. It assembles the claim and the evidence record with you." />
          <Step n={2} title="They join by link" text="The other party opens your invite with their own agent, which reviews the record and gives them a private reality check." />
          <Step n={3} title="Sealed offers" text="Each side privately tells its own agent its true limit. Three rounds of sealed envelopes — overlap settles instantly at the midpoint. Numbers never cross the table." />
          <Step n={4} title="Neutral mediator" text="No overlap? A neutral mediator studies the whole record — including the sealed history — and puts one fair number on the table." />
          <Step n={5} title="Humans sign" text="A plain-language agreement is drafted. No tool can sign it. Two humans read, sign, done." />
        </div>
      </section>

      {/* For agents / WebMCP */}
      <section id="agents" className="border-y border-line bg-forest-deep text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="overline-label !text-brass">Built agent-native on WebMCP</p>
          <h2 className="font-display mt-2 max-w-2xl text-3xl tracking-tight">
            The tool surface <em>is</em> the procedure
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <Principle
              title="Due process, enforced by design"
              text="Each side's agent sees only the tools that are procedurally legal for its role in the current phase. You cannot skip the response. You cannot bid before your human sets a mandate. The tools change as the case advances — that's WebMCP's dynamic tool surface doing the work of a courtroom clerk."
            />
            <Principle
              title="Secrets that stay secret"
              text="Your walk-away number lives between you and your agent. The server structurally filters each side's view: no tool exists that could leak a sealed offer or a private mandate to the other side — or to a prompt-injected agent."
            />
            <Principle
              title="The signature is human"
              text="Fairground deliberately registers no signing tool. Agents argue, assess, and negotiate; the moment of consent belongs to people. That line — drawn in the tool surface itself — is our answer to what the agentic web should feel like."
            />
          </div>
        </div>
      </section>

      {/* Start */}
      <section id="start" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="overline-label">Open a case</p>
            <h2 className="font-display mt-2 text-3xl tracking-tight">Put it on the table</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
              Fill this in yourself — or, if your browser has WebMCP, just tell your agent
              <em> “open a dispute about…”</em> and watch it do this for you. Practice mode lets you
              rehearse the whole process against a realistic AI counterpart before involving the real one.
            </p>
            {myCases.length > 0 && (
              <div className="mt-6">
                <p className="overline-label">Your cases in this browser</p>
                <ul className="mt-2 space-y-1.5">
                  {myCases.map(c => (
                    <li key={c.caseId}>
                      <a className="text-sm text-forest underline-offset-2 hover:underline"
                        href={`/case/${c.caseId}?k=${c.key}`}>
                        [{c.role}] {c.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card p-6">
            {err && <p className="mb-3 rounded-lg bg-clay-tint px-3 py-2 text-sm text-clay">{err}</p>}
            <div className="space-y-3">
              <input className="field" aria-label="Case title" placeholder="Case title — e.g. “Unpaid logo design invoice”"
                value={title} onChange={e => setTitle(e.target.value)} />
              <textarea className="field min-h-28" aria-label="What happened" placeholder="What happened? Plain language is perfect."
                value={summary} onChange={e => setSummary(e.target.value)} />
              <div className="flex gap-3">
                <input className="field" type="number" min={1} aria-label="Amount in US dollars" placeholder="Amount (USD)"
                  value={amount} onChange={e => setAmount(e.target.value)} />
                <select className="field" aria-label="Dispute category" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="freelance_invoice">Unpaid freelance invoice</option>
                  <option value="security_deposit">Security deposit</option>
                  <option value="purchase_dispute">Purchase / refund</option>
                  <option value="shared_expenses">Shared expenses</option>
                  <option value="services_quality">Service quality</option>
                  <option value="other">Something else</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-paper px-3.5 py-3">
                <input type="checkbox" className="mt-0.5" checked={practice} onChange={e => setPractice(e.target.checked)} />
                <span className="text-sm">
                  <span className="font-medium">Practice mode</span>{" "}
                  <span className="text-ink-soft">— an AI plays the other side so you can rehearse (recommended first time; also how judges can try the full flow solo).</span>
                </span>
              </label>
              <button className="btn btn-primary w-full py-3 text-base" disabled={busy || !title.trim() || !summary.trim() || !amount}
                onClick={start}>
                {busy ? "Opening your case…" : practice ? "Open practice case" : "Open case & get invite link"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-paper-warm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>⚖️ Fairground — built on the open <span className="font-medium">WebMCP</span> standard for The WebMCP Challenge.</p>
          <p className="max-w-md leading-relaxed">
            Fairground structures voluntary settlement between parties. It is not a law firm and does not
            provide legal advice; until both humans sign, every right — including going to court — is preserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ big, text }: { big: string; text: string }) {
  return (
    <div>
      <p className="font-display text-4xl text-forest">{big}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl text-brass">{n}</p>
      <p className="mt-1 text-sm font-semibold">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

function Principle({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{text}</p>
    </div>
  );
}
