# Devpost submission — copy-paste kit

## Project name

**Fairground**

## Tagline (one-liner)

A neutral ground where two people — and their AI agents — settle real disputes in minutes: sealed offers, a neutral mediator, and an agreement only humans can sign.

## Text description

### The problem

For everyday disputes — an unpaid $1,800 invoice, a withheld deposit, a refund that never came — pursuing what you're owed costs more than the money at stake. The Legal Services Corporation's Justice Gap research finds 92% of low-income Americans' civil legal problems get no meaningful legal help; 71% of freelancers have struggled to collect payment and most simply write it off. Justice below ~$10,000 is economically irrational, so bad actors win by default. Meanwhile eBay resolves ~60 million disputes a year with software and Canada runs an online tribunal — structured resolution works, but only inside closed platforms, and always with one shared form or one shared bot. Nobody could give *each side its own advocate* on *neutral ground*. That's what agents + WebMCP finally make possible.

### What Fairground does

The claimant tells their agent what happened; the agent assembles the claim and evidence on Fairground. The other party joins by link **with their own agent**, which reviews the record and gives them a private reality check. Each human privately tells their own agent their true limit — then the agents exchange up to three rounds of **sealed offers**: overlap settles instantly at the midpoint; otherwise only a "gap narrowed/widened" signal is published and the numbers never cross the table. If sealed rounds fail, a neutral AI mediator — which, like a real mediator in caucus, can see the sealed history — puts one clamped, fair number on the table. A plain-language agreement is drafted, and **both humans sign it themselves: no signing tool exists**. A practice mode lets one person (or one judge) run the whole two-sided flow against a realistic AI counterpart.

### Why this is a strong fit for WebMCP

Fairground's core design idea: **the tool surface is the procedure.** All 16+ case tools are registered per role and per phase via `document.modelContext` (using Chrome's official `use-webmcp-tool` hook, with `toolchange` firing as the case advances). The respondent's agent has no offer tool until it files a response; no agent can bid before its human sets a private mandate; and there is deliberately **no signing tool at all** — due process is enforced by tool availability, not by prompts. It's also a *multiplayer* WebMCP app: two adversarial agents on one neutral page, where the server structurally filters each side's view so a private mandate or sealed offer can never reach the other side — even via a prompt-injected agent. Tools reading opponent-authored content carry `untrustedContentHint` with fenced content; read-only tools carry `readOnlyHint`; a mandate guard refuses agent offers beyond the human's stated limit without explicit human re-approval.

### What people and agents can do together that was impossible before

A person alone can't afford to pursue $1,800. An agent alone can't be trusted to concede money or consent for someone. Together — human judgment on limits and consent, agent stamina on procedure, evidence, and negotiation, and a neutral tool surface enforcing fairness *between two opposing agents* — a dispute that was economically irrational to pursue settles before lunch. Two humans, two adversarial agents, one neutral page: an interaction pattern the web has never had.

### How we implemented WebMCP

React components register tools with Chrome's `use-webmcp-tool` hook; the `enabled` flag (role × phase) drives lifecycle registration, so the browser's tool list always equals the set of legitimate procedural moves. Every tool result ends with per-role "NEXT:" guidance so agents flow through the procedure without guessing. A Next.js backend holds the case state machine (Upstash Redis), enforces the action×phase×role guard on every mutation, resolves sealed rounds server-side, and role-filters every view. The AI layer (Vercel AI SDK + OpenAI) powers the neutral mediator (numerically hard-clamped between the parties' last sealed positions), private reality checks, agreement drafting, and the practice counterpart — all with deterministic fallbacks. The repo includes two automated checks: a full-lifecycle API smoke test (including mandate-guard and role-privacy assertions) and a headless-Chrome test that stubs `document.modelContext` and asserts per-phase registration/unregistration and annotations.

## Testing instructions (for judges)

**Fastest path — zero typing:** the landing page has three **one-click staged demos** ("Step into a case"): a claim ready to serve, a live sealed-offer negotiation against the AI counterpart (set your private floor, then hit **⚡ Autopilot** and watch the two advocates run the entire procedure — it stops only at the human signature), and a finished settlement complete with signatures and its verifiable record seal. Each click creates a fresh case.

**Full agent experience:**
1. Open the live URL in ChatGPT's in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.
2. Tell your agent: *"I designed a logo for a client — they owe me $1,800, it's 75 days overdue and they've stopped replying. Open a practice case on this site and help me settle it."* (Or click a demo preset and hand the case to your agent mid-flight.)
3. Follow its lead: it files the claim and evidence, the AI counterpart disputes, your agent asks YOU for your private floor, then bids sealed rounds. Watch every agent move appear in the "Your agent on this page" feed.
4. When a settlement is reached, note your agent can draft — but not sign. Sign the agreement yourself.
5. Two-party mode: create a case *without* practice mode, open the invite link in a second browser/profile, and run both chairs with two agents.
6. Everything also works fully by hand without an agent.

## Built with

next.js · react · typescript · webmcp · use-webmcp-tool · vercel-ai-sdk · openai · upstash-redis · tailwind · vercel
