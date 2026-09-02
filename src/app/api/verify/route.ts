import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/store";
import { sealFor } from "@/lib/machine";

export const runtime = "nodejs";

// GET /api/verify?case=ID&seal=HASH — public, no access key required.
// Confirms whether a presented seal matches the settled record WITHOUT
// revealing any case content: a third party (or either side's agent, years
// later) can prove the printed agreement was not altered.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("case") ?? "";
  const seal = (req.nextUrl.searchParams.get("seal") ?? "").toLowerCase();
  if (!id || !/^[0-9a-f]{64}$/.test(seal)) {
    return NextResponse.json(
      { valid: false, reason: "Provide ?case=<case id>&seal=<64-hex sha-256 seal>." },
      { status: 400 },
    );
  }
  const c = await getCase(id);
  const expected = c ? sealFor(c) : undefined;
  if (!c || !expected) {
    // Same response for "no such case" and "not settled": reveal nothing.
    return NextResponse.json({ valid: false, reason: "No sealed settlement record matches." });
  }
  const valid = expected === seal;
  return NextResponse.json(
    valid
      ? { valid: true, message: "Seal verified: this settlement record is authentic and unaltered." }
      : { valid: false, reason: "Seal mismatch: this copy does not match the sealed record." },
  );
}
