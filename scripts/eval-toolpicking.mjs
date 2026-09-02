// Tool-picking eval: harvests Fairground's LIVE WebMCP tool surface from the
// running app (per role and phase), hands it to an OpenAI model as function
// definitions, and checks that realistic user asks select the right tool with
// the right arguments. Run: node scripts/eval-toolpicking.mjs (server on :3111,
// OPENAI_API_KEY in env or .env.local).
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const B = process.env.EVAL_BASE ?? "http://localhost:3111";
let KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  try {
    KEY = readFileSync(".env.local", "utf8").match(/^OPENAI_API_KEY\s*=\s*"?([^"\s#]+)/m)?.[1];
  } catch { /* no .env.local */ }
}
if (!KEY) {
  console.error("OPENAI_API_KEY required");
  process.exit(1);
}
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";

const STUB = `
  window.__tools = new Map();
  document.modelContext = {
    registerTool(def, opts) {
      window.__tools.set(def.name, def);
      opts?.signal?.addEventListener("abort", () => window.__tools.delete(def.name));
    },
  };
  window.__defs = () => [...window.__tools.values()].map(d => ({
    name: d.name, description: d.description,
    inputSchema: d.inputSchema ?? { type: "object", properties: {} },
  }));
  window.__exec = async (name, args) => {
    const t = window.__tools.get(name);
    if (!t) return "tool not found";
    try {
      const r = await t.execute(args);
      return typeof r === "string" ? r : JSON.stringify(r);
    } catch (e) { return "ERROR: " + (e?.message ?? String(e)); }
  };
`;

async function harvest(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return page.evaluate("window.__defs()");
}

// Mini agent loop: the model may orient with read tools first (executed live
// in the page); the eval passes if the TARGET tool is called within 3 turns.
async function runScenario(page, tools, userMessage, targetNames) {
  const messages = [
    { role: "system", content: "You are the user's agent on the Fairground dispute-settlement page. Use the page's tools to act. Prefer acting over asking when the user's intent is clear." },
    { role: "user", content: userMessage },
  ];
  const trace = [];
  for (let turn = 0; turn < 3; turn++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, messages,
        tools: tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })),
      }),
    });
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    const call = msg?.tool_calls?.[0];
    if (!call) return { picked: null, trace };
    const picked = { name: call.function.name, args: JSON.parse(call.function.arguments || "{}") };
    trace.push(picked.name);
    if (targetNames.includes(picked.name)) return { picked, trace };
    // Not the target — execute it live on the page and let the agent continue.
    const result = await page.evaluate(
      ([n, a]) => window.__exec(n, a), [picked.name, picked.args],
    );
    messages.push({ role: "assistant", tool_calls: [call] });
    messages.push({ role: "tool", tool_call_id: call.id, content: String(result).slice(0, 2000) });
  }
  return { picked: null, trace };
}

// ── Set up case fixtures via the API ────────────────────────────────────────
const j = (r) => r.json();
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(j);

const practice = await post(`${B}/api/case`, {
  title: "Unpaid logo design invoice",
  summary: "Client owes $1,800 for a delivered logo package, 75 days overdue.",
  amount: 1800, category: "freelance_invoice", vsAi: true,
});
const pc = `${B}/case/${practice.caseId}?k=${practice.yourKey}`;

const negoCase = await post(`${B}/api/case`, {
  title: "Unpaid invoice",
  summary: "Client owes $1,800, delivered and overdue.",
  amount: 1800, category: "freelance_invoice", vsAi: true,
});
await post(`${B}/api/case/${negoCase.caseId}/action?k=${negoCase.yourKey}`, { type: "send_to_respondent" });
await post(`${B}/api/case/${negoCase.caseId}/ai?k=${negoCase.yourKey}`, { task: "opponent_step" });
const nc = `${B}/case/${negoCase.caseId}?k=${negoCase.yourKey}`;

const real = await post(`${B}/api/case`, {
  title: "Withheld deposit",
  summary: "Landlord kept my $1,200 deposit over disputed wall damage.",
  amount: 1200, category: "security_deposit", vsAi: false,
});
await post(`${B}/api/case/${real.caseId}/action?k=${real.yourKey}`, { type: "send_to_respondent" });
const realView = await fetch(`${B}/api/case/${real.caseId}?k=${real.yourKey}`).then(j);
const rc = realView.view.inviteLink.replace(/^https?:\/\/[^/]+/, B);

// ── Scenarios ───────────────────────────────────────────────────────────────
const scenarios = [
  {
    label: "landing → open practice dispute",
    url: `${B}/`,
    ask: "A client owes me $1,800 for a logo I delivered in March — 75 days overdue, three ignored reminders. I want to practice settling this before I confront them for real.",
    expect: { name: "open_dispute", check: a => a.practice_mode === true && Math.round(a.amount) === 1800 },
  },
  {
    label: "intake → file evidence",
    url: pc,
    ask: "I also have the signed contract from February 20th — fixed fee $1,800, net-30 payment terms, both signatures on it. Put it on the record.",
    expect: { name: "add_evidence", check: a => /contract/i.test(a.title ?? "") },
  },
  {
    label: "negotiation → set private mandate",
    url: nc,
    ask: "Between us: I won't accept less than $1,400 — but honestly, getting this done fast matters more to me than the last hundred dollars.",
    expect: { name: "set_negotiation_mandate", check: a => Math.round(a.limit) === 1400 },
  },
  {
    label: "negotiation → check state",
    url: nc,
    ask: "Where do the offers stand right now?",
    expect: { name: ["get_negotiation_state", "get_case_status"], check: () => true },
  },
  {
    label: "respondent → review the claim",
    url: rc,
    ask: "I just got this link saying someone filed a claim against me. What exactly are they accusing me of, and what evidence do they have?",
    expect: { name: ["review_claim", "get_case_status"], check: () => true },
  },
];

// ── Run ─────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext();
await ctx.addInitScript(STUB);
const page = await ctx.newPage();

let pass = 0;
for (const s of scenarios) {
  const tools = await harvest(page, s.url);
  const names = Array.isArray(s.expect.name) ? s.expect.name : [s.expect.name];
  const { picked, trace } = await runScenario(page, tools, s.ask, names);
  const ok = picked && names.includes(picked.name) && s.expect.check(picked.args);
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${s.label}`);
  console.log(`      surface: ${tools.length} tools · chain: ${trace.join(" → ") || "no tool call"}${picked ? ` · args: ${JSON.stringify(picked.args).slice(0, 90)}` : ""}`);
}
console.log(`\n${pass}/${scenarios.length} scenarios passed (model: ${MODEL})`);
await browser.close();
process.exit(pass === scenarios.length ? 0 : 1);
