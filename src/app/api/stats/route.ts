import { NextResponse } from "next/server";
import { getStats } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/stats — the public Docket: aggregate resolution numbers only.
export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats, {
    headers: { "cache-control": "public, max-age=15, stale-while-revalidate=60" },
  });
}
