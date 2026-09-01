// Verifies Fairground's WebMCP registration behavior by stubbing
// document.modelContext and watching which tools register per phase/role.
import { chromium } from "playwright-core";

const STUB = `
  window.__tools = new Map();
  document.modelContext = {
    registerTool(def, opts) {
      window.__tools.set(def.name, {
        description: def.description, annotations: def.annotations ?? {},
        hasSchema: !!def.inputSchema,
      });
      opts?.signal?.addEventListener("abort", () => window.__tools.delete(def.name));
    },
  };
  window.__toolNames = () => [...window.__tools.keys()].sort();
`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await ctx.addInitScript(STUB);
const page = await ctx.newPage();

const report = [];
async function snap(label) {
  await page.waitForTimeout(600);
  const names = await page.evaluate("window.__toolNames()");
  report.push(`${label}:\n  ${names.join(", ")}`);
}

// Landing
await page.goto("http://localhost:3111/", { waitUntil: "networkidle" });
await snap("LANDING");

// Create practice case via UI
await page.fill('input[placeholder^="Case title"]', "MCP verify case");
await page.fill("textarea", "Verification of per-phase tool registration.");
await page.fill('input[type="number"]', "1000");
await page.click("button:has-text('Open practice case')");
await page.waitForURL("**/case/**", { timeout: 15000 });
await page.waitForSelector("text=Build the record", { timeout: 15000 });
await snap("CASE · claimant · INTAKE");

// Serve; AI opponent disputes -> negotiation
await page.click("button:has-text('Serve claim')");
await page.waitForSelector("text=First: set your private mandate", { timeout: 30000 });
await snap("CASE · claimant · NEGOTIATION (pre-mandate)");

// Assert critical invariants
const names = await page.evaluate("window.__toolNames()");
const mustHave = ["get_case_status", "set_negotiation_mandate", "submit_sealed_offer", "get_negotiation_state"];
const mustNotHave = ["update_claim", "send_claim_to_respondent", "submit_response", "sign_agreement", "get_settlement_draft"];
const missing = mustHave.filter(n => !names.includes(n));
const leaked = mustNotHave.filter(n => names.includes(n));
report.push(`INVARIANTS: missing=${missing.length ? missing.join(",") : "none"} · illegal-present=${leaked.length ? leaked.join(",") : "none"}`);

// Annotation checks
const ann = await page.evaluate(`(() => {
  const t = window.__tools;
  return {
    statusRO: t.get("get_case_status")?.annotations?.readOnlyHint === true,
    stateRO: t.get("get_negotiation_state")?.annotations?.readOnlyHint === true,
    offerNotRO: t.get("submit_sealed_offer")?.annotations?.readOnlyHint !== true,
  };
})()`);
report.push(`ANNOTATIONS: ${JSON.stringify(ann)}`);

console.log(report.join("\n\n"));
await browser.close();
