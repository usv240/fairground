import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/store";
import { roleForKey } from "@/lib/machine";
import { buildCaseRecordExport } from "@/lib/export";

export const runtime = "nodejs";

// GET /api/case/:id/export?k=KEY — the court-preparation record for ONE party.
// Role-filtered like every other view: the requesting party's own sealed
// offers are included, the other side's never are.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const role = roleForKey(c, req.nextUrl.searchParams.get("k"));
  if (!role) return NextResponse.json({ error: "Invalid or missing access key." }, { status: 403 });

  const text = buildCaseRecordExport(c, role);
  const filename = `fairground-case-${c.id}.txt`;

  return new NextResponse(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
