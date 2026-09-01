import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/store";
import { viewFor, roleForKey, offersForRound } from "@/lib/machine";

export const runtime = "nodejs";

// GET /api/case/:id?k=KEY — the role-filtered case view.
// The key in the URL is the capability: it determines which side you are,
// and therefore which slice of the case state can ever reach your agent.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const role = roleForKey(c, req.nextUrl.searchParams.get("k"));
  if (!role) return NextResponse.json({ error: "Invalid or missing access key." }, { status: 403 });

  const view = viewFor(c, role, req.nextUrl.origin);

  // Practice mode: tell the claimant's client when the AI counterpart owes a move.
  let aiTurn = false;
  if (c.vsAi && role === "claimant") {
    if (c.phase === "response" && !c.response) aiTurn = true;
    if (c.phase === "negotiation") {
      const { ask, bid } = offersForRound(c, c.round);
      if (!c.mandates.respondent || (!bid && ask)) aiTurn = true;
    }
    if (c.phase === "mediation") {
      const prop = c.mediatorProposals[c.mediatorProposals.length - 1];
      if (prop && !prop.responses.respondent && prop.responses.claimant) aiTurn = true;
    }
    if (c.phase === "agreement" && c.agreement) {
      if (c.agreement.signatures.claimant && !c.agreement.signatures.respondent) aiTurn = true;
    }
  }

  return NextResponse.json({ view, aiTurn });
}
