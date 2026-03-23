import { NextResponse } from "next/server";
import { getReport } from "../../../../lib/reportStore";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json(
      { error: "Report not found. (MVP store resets when server restarts.)" },
      { status: 404 }
    );
  }

  return NextResponse.json({ report });
}
