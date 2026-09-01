import { NextRequest, NextResponse } from "next/server";
import { DisputeCase, Category } from "@/lib/types";
import { saveCase, newId } from "@/lib/store";
import { viewFor } from "@/lib/machine";

export const runtime = "nodejs";

const CATEGORIES: Category[] = [
  "freelance_invoice", "security_deposit", "purchase_dispute",
  "shared_expenses", "services_quality", "other",
];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = String(body.title ?? "").slice(0, 120).trim();
  const summary = String(body.summary ?? "").slice(0, 4000).trim();
  const amount = Number(body.amount);
  const category = CATEGORIES.includes(body.category as Category)
    ? (body.category as Category) : "other";
  const vsAi = body.vsAi === true;

  if (!title) return NextResponse.json({ error: "A short case title is required." }, { status: 400 });
  if (!summary) return NextResponse.json({ error: "A claim summary is required." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 250000) {
    return NextResponse.json({ error: "Claim amount must be a positive number (max 250,000)." }, { status: 400 });
  }

  const c: DisputeCase = {
    id: newId(),
    createdAt: Date.now(),
    phase: "intake",
    category,
    title,
    currency: "USD",
    vsAi,
    claim: {
      summary,
      amount: Math.round(amount),
      timeline: body.timeline ? String(body.timeline).slice(0, 2000) : undefined,
      desiredOutcome: body.desiredOutcome ? String(body.desiredOutcome).slice(0, 1000) : undefined,
    },
    evidence: [],
    messages: [],
    keys: { claimant: newId("ck"), respondent: newId("rk") },
    mandates: {},
    offers: [],
    round: 1,
    roundSignals: [],
    mediatorProposals: [],
    activity: [{
      at: Date.now(), actor: "system",
      text: `Case opened by the claimant${vsAi ? " (practice mode: AI counterpart will respond)" : ""}.`,
    }],
  };

  await saveCase(c);

  const origin = req.nextUrl.origin;
  return NextResponse.json({
    caseId: c.id,
    yourKey: c.keys.claimant,
    yourLink: `${origin}/case/${c.id}?k=${c.keys.claimant}`,
    view: viewFor(c, "claimant", origin),
  });
}
